import { SearchResult } from "@/types";
import { ParsedFileResult } from "../parser/ast";

export function searchRepository(
  query: string,
  parsedFiles: Map<string, ParsedFileResult>,
  limit: number = 30
): SearchResult[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const results: SearchResult[] = [];

  for (const [filePath, fileResult] of parsedFiles.entries()) {
    const fileId = fileResult.file.id;

    // 1. Symbol search (Rank 1)
    for (const sym of fileResult.symbols) {
      if (sym.name.toLowerCase().includes(clean)) {
        results.push({
          fileId,
          filePath,
          matchType: "symbol",
          symbolName: sym.name,
          symbolKind: sym.kind,
          line: sym.startLine,
          snippet: `${sym.kind} ${sym.name}`,
        });
      }
    }

    // 2. File path search (Rank 2)
    if (filePath.toLowerCase().includes(clean)) {
      results.push({
        fileId,
        filePath,
        matchType: "file",
        line: 1,
        snippet: filePath,
      });
    }

    // 3. File content line search (Rank 3)
    const lines = fileResult.lines || fileResult.file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (lineText.toLowerCase().includes(clean)) {
        results.push({
          fileId,
          filePath,
          matchType: "content",
          line: i + 1,
          snippet: lineText.trim().slice(0, 120),
        });
        if (results.length > limit * 3) break;
      }
    }
  }

  // Rank results: symbol matches first, file matches second, content matches third
  results.sort((a, b) => {
    const rankMap = { symbol: 0, file: 1, content: 2 };
    return rankMap[a.matchType] - rankMap[b.matchType];
  });

  return results.slice(0, limit);
}
