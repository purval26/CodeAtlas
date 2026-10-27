export const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "out",
  ".output",
  ".cache",
  "coverage",
  ".turbo",
  ".vercel",
  "vendor",
  "__pycache__",
]);

export const SUPPORTED_CODE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
]);

export const CONFIG_FILES = new Set([
  "tsconfig.json",
  "jsconfig.json",
  "package.json",
]);

export const MAX_FILES_LIMIT = 500;
export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB per code file

export function shouldIgnorePath(path: string): boolean {
  const parts = path.split("/");
  for (const part of parts) {
    if (IGNORED_DIRECTORIES.has(part)) {
      return true;
    }
  }
  return false;
}

export function isCodeFile(path: string): boolean {
  if (shouldIgnorePath(path)) return false;
  const lower = path.toLowerCase();
  for (const ext of SUPPORTED_CODE_EXTENSIONS) {
    if (lower.endsWith(ext) && !lower.endsWith(".d.ts")) {
      return true;
    }
  }
  return false;
}

export function isConfigFile(path: string): boolean {
  if (shouldIgnorePath(path)) return false;
  const basename = path.split("/").pop() || "";
  return CONFIG_FILES.has(basename);
}

export function getLanguageFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".ts")) return "typescript";
  if (lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return "javascript";
  if (lower.endsWith(".json")) return "json";
  return "text";
}
