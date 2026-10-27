import { GraphData } from "@/types";
import { ParsedFileResult } from "../parser/ast";
import { searchRepository } from "./search";

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

  // 1. Score all files based on keyword search and track match locations
  const fileScores = new Map<string, number>();
  const fileMatches = new Map<string, { line: number; weight: number }[]>();

  for (const kw of keywords) {
    const searchResults = searchRepository(kw, parsedFiles, 20);
    for (const res of searchResults) {
      const weight = res.matchType === "symbol" ? 10 : res.matchType === "file" ? 5 : 2;
      const current = fileScores.get(res.filePath) || 0;
      fileScores.set(res.filePath, current + weight);

      if (res.line && res.line > 0) {
        const matches = fileMatches.get(res.filePath) || [];
        matches.push({ line: res.line, weight });
        fileMatches.set(res.filePath, matches);
      }
    }
  }

  // Graph expansion: If top file connects to another file, boost connected file
  if (graphData) {
    const topFiles = Array.from(fileScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([fp]) => fp);

    for (const topFile of topFiles) {
      const topNodeId = `${graphData.repository.id}:${topFile}`;
      for (const edge of graphData.edges) {
        // Outgoing dependency: topFile -> targetPath (dependencies)
        if (edge.source === topNodeId && edge.target.startsWith(graphData.repository.id)) {
          const targetPath = edge.target.slice(graphData.repository.id.length + 1);
          if (parsedFiles.has(targetPath)) {
            const current = fileScores.get(targetPath) || 0;
            fileScores.set(targetPath, current + 3);
          }
        }
        // Incoming dependency: sourcePath -> topFile (dependents / "what depends on topFile")
        if (edge.target === topNodeId && edge.source.startsWith(graphData.repository.id)) {
          const sourcePath = edge.source.slice(graphData.repository.id.length + 1);
          if (parsedFiles.has(sourcePath)) {
            const current = fileScores.get(sourcePath) || 0;
            fileScores.set(sourcePath, current + 3);
          }
        }
      }
    }
  }

  // Sort files by relevance score descending
  const rankedFilePaths = Array.from(fileScores.entries())
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([fp]) => fp);

  // If no files matched keywords, but repo has files, take first few files if query is generic
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
    const syms = fileRes?.symbols.slice(0, 5).map((s) => `${s.name} (${s.kind})`).join(", ");
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
