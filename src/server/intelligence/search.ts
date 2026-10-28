import { SearchResult } from "@/types";
import { ParsedFileResult } from "../parser/ast";

export interface EvidenceLineMatch {
  line: number;
  score: number;
}

export interface RepositoryEvidence {
  filePath: string;
  score: number;
  lineMatches: EvidenceLineMatch[];
}

const MAX_QUERY_TERMS = 16;
const MAX_TERM_LENGTH = 80;
const MAX_LINE_MATCHES_PER_FILE = 8;

/** Normalize user input into bounded, deterministic lexical terms. */
export function tokenizeSearchQuery(query: string): string[] {
  return Array.from(
    new Set(
      query
        .normalize("NFKC")
        .toLowerCase()
        .match(/[a-z0-9_$-]+/g)
        ?.filter((term) => term.length > 1 && term.length <= MAX_TERM_LENGTH)
        .slice(0, MAX_QUERY_TERMS) || []
    )
  );
}

function countMatchedTerms(text: string, terms: string[]): number {
  let count = 0;
  for (const term of terms) {
    if (text.includes(term)) count++;
  }
  return count;
}

function insertBestLineMatch(matches: EvidenceLineMatch[], candidate: EvidenceLineMatch, limit: number): void {
  matches.push(candidate);
  matches.sort((a, b) => b.score - a.score || a.line - b.line);
  if (matches.length > limit) matches.pop();
}

/**
 * Scan each parsed file once. Search and retrieval share this source-backed
 * ranking so the UI and answer context cannot disagree about relevance.
 */
export function collectRepositoryEvidence(
  query: string,
  parsedFiles: Map<string, ParsedFileResult>,
  maxLineMatchesPerFile = MAX_LINE_MATCHES_PER_FILE
): RepositoryEvidence[] {
  const terms = tokenizeSearchQuery(query);
  if (terms.length === 0) return [];

  const normalizedPhrase = query.normalize("NFKC").trim().toLowerCase();
  const usePhrase = normalizedPhrase.length >= 3 && normalizedPhrase.length <= 160;
  const evidence: RepositoryEvidence[] = [];

  for (const [filePath, fileResult] of parsedFiles.entries()) {
    const normalizedPath = filePath.toLowerCase();
    const lineMatches: EvidenceLineMatch[] = [];
    let score = 0;

    const pathTermMatches = countMatchedTerms(normalizedPath, terms);
    if (pathTermMatches > 0) score += pathTermMatches * 32;
    if (usePhrase && normalizedPath.includes(normalizedPhrase)) score += 90;

    for (const symbol of fileResult.symbols) {
      const normalizedSymbol = symbol.name.toLowerCase();
      const symbolTermMatches = countMatchedTerms(normalizedSymbol, terms);
      if (symbolTermMatches === 0) continue;
      const exactTermMatch = terms.some((term) => normalizedSymbol === term);
      const symbolScore = exactTermMatch ? 180 : symbolTermMatches * 64;
      score += symbolScore;
      insertBestLineMatch(lineMatches, { line: symbol.startLine, score: symbolScore }, maxLineMatchesPerFile);
    }

    const lines = fileResult.lines || fileResult.file.content.split("\n");
    let contentContribution = 0;
    for (let index = 0; index < lines.length; index++) {
      const normalizedLine = lines[index].toLowerCase();
      const lineTermMatches = countMatchedTerms(normalizedLine, terms);
      const phraseMatch = usePhrase && normalizedLine.includes(normalizedPhrase);
      if (lineTermMatches === 0 && !phraseMatch) continue;
      const lineScore = lineTermMatches * 8 + (phraseMatch ? 36 : 0);
      // Repeated generated text must not outweigh direct symbol/path evidence.
      contentContribution = Math.min(240, contentContribution + lineScore);
      insertBestLineMatch(lineMatches, { line: index + 1, score: lineScore }, maxLineMatchesPerFile);
    }
    score += contentContribution;

    if (score > 0) evidence.push({ filePath, score, lineMatches });
  }

  return evidence.sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));
}

export function searchRepository(
  query: string,
  parsedFiles: Map<string, ParsedFileResult>,
  limit = 30
): SearchResult[] {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit) || 30, 100));
  const terms = tokenizeSearchQuery(query);
  if (terms.length === 0) return [];

  const results: Array<SearchResult & { score: number }> = [];
  for (const evidence of collectRepositoryEvidence(query, parsedFiles)) {
    const fileResult = parsedFiles.get(evidence.filePath);
    if (!fileResult) continue;
    const normalizedPath = evidence.filePath.toLowerCase();

    for (const symbol of fileResult.symbols) {
      const normalizedSymbol = symbol.name.toLowerCase();
      const matches = countMatchedTerms(normalizedSymbol, terms);
      if (matches === 0) continue;
      const exact = terms.some((term) => term === normalizedSymbol);
      results.push({
        fileId: fileResult.file.id,
        filePath: evidence.filePath,
        matchType: "symbol",
        symbolName: symbol.name,
        symbolKind: symbol.kind,
        line: symbol.startLine,
        snippet: `${symbol.kind} ${symbol.name}`,
        score: (exact ? 1_000 : 700) + matches * 10 + evidence.score,
      });
    }

    if (countMatchedTerms(normalizedPath, terms) > 0) {
      results.push({
        fileId: fileResult.file.id,
        filePath: evidence.filePath,
        matchType: "file",
        line: 1,
        snippet: evidence.filePath,
        score: 400 + evidence.score,
      });
    }

    const lines = fileResult.lines || fileResult.file.content.split("\n");
    for (const match of evidence.lineMatches) {
      const lineText = lines[match.line - 1];
      if (lineText === undefined) continue;
      results.push({
        fileId: fileResult.file.id,
        filePath: evidence.filePath,
        matchType: "content",
        line: match.line,
        snippet: lineText.trim().slice(0, 160),
        score: 100 + match.score + evidence.score,
      });
    }
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.filePath.localeCompare(b.filePath) ||
        (a.line || 0) - (b.line || 0) ||
        a.matchType.localeCompare(b.matchType)
    )
    .slice(0, safeLimit)
    .map(({ score: _score, ...result }) => result);
}
