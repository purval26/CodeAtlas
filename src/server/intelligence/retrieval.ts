import { GraphData } from "@/types";
import { ParsedFileResult } from "../parser/ast";
import { collectRepositoryEvidence } from "./search";

export const MAX_FILES = 8;
export const MAX_LINES_PER_FILE = 120;
export const MAX_TOTAL_LINES = 600;

export interface RetrievedSnippet {
  filePath: string;
  startLine: number;
  endLine: number;
  lines: string[];
  relevanceScore: number;
}

export interface RetrievalResult {
  contextText: string;
  snippets: RetrievedSnippet[];
  insufficientEvidence: boolean;
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "he", "in", "is", "it", "its", "of", "on", "that", "the",
  "to", "was", "were", "will", "with", "what", "when", "where",
  "how", "who", "which", "does", "do", "did", "can", "could",
  "happens", "explain", "show", "tell", "me", "about",
  "this", "these", "those", "there", "their", "app", "application",
  "codebase", "repo", "repository", "something", "anything",
  "exist", "exists", "handle", "handling",
]);

export function extractKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

export function buildBoundedContext(
  query: string,
  parsedFiles: Map<string, ParsedFileResult>,
  graphData?: GraphData
): RetrievalResult {
  const keywords = extractKeywords(query);

  if (keywords.length === 0) {
    return {
      contextText: "",
      snippets: [],
      insufficientEvidence: true,
    };
  }

  // 1. Score all files in one source-backed pass. The old implementation ran a
  // full repository search for every term; this keeps the same lexical
  // grounding while avoiding repeated scans of large repositories.
  const fileScores = new Map<string, number>();
  const fileMatches = new Map<string, { line: number; weight: number }[]>();

  for (const evidence of collectRepositoryEvidence(keywords.join(" "), parsedFiles)) {
    fileScores.set(evidence.filePath, evidence.score);
    fileMatches.set(
      evidence.filePath,
      evidence.lineMatches.map((match) => ({ line: match.line, weight: match.score }))
    );
  }

  // 2. Build a file-only adjacency index once, then expand the top evidence
  // files. This keeps architecture questions useful without allowing graph
  // proximity to outweigh direct source evidence.
  if (graphData) {
    const adjacentFiles = new Map<string, Set<string>>();
    const addNeighbor = (from: string, to: string) => {
      if (!parsedFiles.has(from) || !parsedFiles.has(to)) return;
      const neighbors = adjacentFiles.get(from) || new Set<string>();
      neighbors.add(to);
      adjacentFiles.set(from, neighbors);
    };

    for (const edge of graphData.edges) {
      const prefix = `${graphData.repository.id}:`;
      if (!edge.source.startsWith(prefix) || !edge.target.startsWith(prefix)) continue;
      addNeighbor(edge.source.slice(prefix.length), edge.target.slice(prefix.length));
      addNeighbor(edge.target.slice(prefix.length), edge.source.slice(prefix.length));
    }

    const topFiles = Array.from(fileScores.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([fp]) => fp);

    for (const topFile of topFiles) {
      for (const neighbor of adjacentFiles.get(topFile) || []) {
        const current = fileScores.get(neighbor) || 0;
        fileScores.set(neighbor, current + 3);
      }
    }
  }

  // Sort files by relevance score descending
  const rankedFilePaths = Array.from(fileScores.entries())
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([fp]) => fp);

  // No direct source evidence means no answer. Never seed context with arbitrary
  // files simply to make a model produce a plausible-looking response.
  if (rankedFilePaths.length === 0) {
    return {
      contextText: "",
      snippets: [],
      insufficientEvidence: true,
    };
  }

  // Enforce MAX_FILES
  const selectedFiles = rankedFilePaths.slice(0, MAX_FILES);

  const snippets: RetrievedSnippet[] = [];
  let remainingLineBudget = MAX_TOTAL_LINES;

  for (const filePath of selectedFiles) {
    if (remainingLineBudget <= 0) break;

    const fileResult = parsedFiles.get(filePath);
    if (!fileResult) continue;

    const allLines = fileResult.lines || fileResult.file.content.split("\n");
    const totalLines = allLines.length;
    const allowedLines = Math.min(
      totalLines,
      MAX_LINES_PER_FILE,
      remainingLineBudget
    );

    const matches = fileMatches.get(filePath);
    let targetCenterLine = 1;

    if (matches && matches.length > 0) {
      // Find highest weighted match; if tied, lowest line number
      const sortedMatches = [...matches].sort((a, b) => b.weight - a.weight || a.line - b.line);
      targetCenterLine = sortedMatches[0].line;
    }

    let startLine = 1;
    let endLine = allowedLines;

    if (targetCenterLine > 1 && totalLines > allowedLines) {
      // Center context window around matched line
      const halfWindow = Math.floor(allowedLines / 2);
      startLine = Math.max(1, targetCenterLine - halfWindow);
      endLine = startLine + allowedLines - 1;

      if (endLine > totalLines) {
        endLine = totalLines;
        startLine = Math.max(1, endLine - allowedLines + 1);
      }
    }

    const slice = allLines.slice(startLine - 1, endLine);
    remainingLineBudget -= slice.length;

    snippets.push({
      filePath,
      startLine,
      endLine,
      lines: slice,
      relevanceScore: fileScores.get(filePath) || 1,
    });
  }

  // Format context text with line numbers and structured symbol/import metadata
  const contextParts: string[] = [];
  for (const snip of snippets) {
    const fileRes = parsedFiles.get(snip.filePath);
    const syms = fileRes?.symbols
      .filter((symbol) => symbol.startLine >= snip.startLine && symbol.startLine <= snip.endLine)
      .slice(0, 5)
      .map((symbol) => `${symbol.name} (${symbol.kind})`)
      .join(", ");
    const imps = fileRes?.imports.map((i) => i.specifier).filter(Boolean).slice(0, 3).join(", ");
    contextParts.push(
      `--- FILE: ${snip.filePath} [${fileRes?.file.language || "typescript"}] (Lines ${snip.startLine} to ${snip.endLine})${syms ? ` | Symbols: ${syms}` : ""}${imps ? ` | Imports: ${imps}` : ""} ---`
    );
    snip.lines.forEach((line, idx) => {
      const lineNum = snip.startLine + idx;
      contextParts.push(`${lineNum}: ${line}`);
    });
    contextParts.push("");
  }

  return {
    contextText: contextParts.join("\n"),
    snippets,
    insufficientEvidence: false,
  };
}
