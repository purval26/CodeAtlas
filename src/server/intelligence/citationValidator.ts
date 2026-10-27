import path from "node:path";
import { SourceReference } from "@/types";
import { ParsedFileResult } from "../parser/ast";

function normalizePosix(p: string): string {
  let norm = p.replace(/\\/g, "/").trim();
  if (norm.startsWith("./")) {
    norm = norm.slice(2);
  }
  return path.posix.normalize(norm);
}

function resolveTargetFile(
  normPath: string,
  parsedFiles: Map<string, ParsedFileResult>
): { resolvedPath: string; fileResult: ParsedFileResult } | null {
  // 1. Exact normalized path
  if (parsedFiles.has(normPath)) {
    return { resolvedPath: normPath, fileResult: parsedFiles.get(normPath)! };
  }

  // 2. Safe suffix match with path boundary (e.g., existing path ends with '/' + normPath)
  const matches: { path: string; fileResult: ParsedFileResult }[] = [];

  for (const [existingPath, fileResult] of parsedFiles.entries()) {
    if (
      existingPath.endsWith("/" + normPath) ||
      normPath.endsWith("/" + existingPath)
    ) {
      matches.push({ path: existingPath, fileResult });
    }
  }

  // If exactly one unique match found: safe resolution
  if (matches.length === 1) {
    return { resolvedPath: matches[0].path, fileResult: matches[0].fileResult };
  }

  // If multiple files match: REJECT as ambiguous (do not select arbitrary file)
  return null;
}

export function validateCitations(
  rawCitations: { filePath?: string; startLine?: number; endLine?: number }[],
  parsedFiles: Map<string, ParsedFileResult>
): SourceReference[] {
  const verified: SourceReference[] = [];
  const seen = new Set<string>();

  for (const raw of rawCitations) {
    if (!raw || !raw.filePath) continue;

    // 1. Normalize path
    const normPath = normalizePosix(raw.filePath);

    // 2. Confirm file exists in the analyzed repository deterministically
    const target = resolveTargetFile(normPath, parsedFiles);
    if (!target) {
      continue; // Drop invalid or ambiguous file reference
    }

    const { resolvedPath, fileResult: targetFile } = target;

    // 3. Confirm startLine >= 1
    const startLine = Math.floor(Number(raw.startLine));
    if (isNaN(startLine) || startLine < 1) {
      continue;
    }

    // 4. Confirm endLine >= startLine
    const rawEnd = raw.endLine !== undefined ? Math.floor(Number(raw.endLine)) : startLine;
    const endLine = isNaN(rawEnd) ? startLine : rawEnd;
    if (endLine < startLine) {
      continue;
    }

    // 5. Confirm endLine <= stored lineCount
    const maxLine = targetFile.file.lineCount;
    if (endLine > maxLine) {
      continue; // Line falls outside stored file
    }

    // 6. Deduplicate
    const key = `${resolvedPath}:${startLine}:${endLine}`;
    if (!seen.has(key)) {
      seen.add(key);
      verified.push({
        filePath: resolvedPath,
        startLine,
        endLine,
      });
    }
  }

  // Deterministically sort by file path, then startLine
  verified.sort((a, b) => {
    const fileComp = a.filePath.localeCompare(b.filePath);
    if (fileComp !== 0) return fileComp;
    return a.startLine - b.startLine;
  });

  return verified;
}
