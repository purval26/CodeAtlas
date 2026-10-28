import path from "node:path";
import ts from "typescript";

export interface PathAliasConfig {
  baseUrl: string;
  paths: Record<string, string[]>;
}

export function parseTsConfigAliases(tsconfigContent?: string): PathAliasConfig {
  if (!tsconfigContent) {
    return { baseUrl: ".", paths: {} };
  }

  try {
    // TypeScript's parser safely handles comments and trailing commas without
    // corrupting URL-like strings inside a valid tsconfig.
    const parsedResult = ts.parseConfigFileTextToJson("tsconfig.json", tsconfigContent);
    if (parsedResult.error || !parsedResult.config || typeof parsedResult.config !== "object") {
      return { baseUrl: ".", paths: {} };
    }
    const parsed = parsedResult.config;
    const compilerOptions = parsed.compilerOptions || {};
    const rawBaseUrl = typeof compilerOptions.baseUrl === "string" ? compilerOptions.baseUrl : ".";
    const baseUrl = rawBaseUrl.replace(/^\.\//, "");
    const paths = Object.fromEntries(
      Object.entries(compilerOptions.paths || {}).filter(
        ([pattern, targets]) =>
          typeof pattern === "string" &&
          Array.isArray(targets) &&
          targets.every((target) => typeof target === "string")
      )
    ) as Record<string, string[]>;
    return { baseUrl, paths };
  } catch {
    return { baseUrl: ".", paths: {} };
  }
}

export interface ResolveResult {
  resolved: boolean;
  targetPath?: string;
  isExternal: boolean;
  packageName?: string;
}

const EXTENSIONS_TO_PROBE = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
  "/index.mjs",
  "/index.cjs",
  "/index.json",
];

function normalizePosix(p: string): string {
  let norm = p.replace(/\\/g, "/");
  norm = path.posix.normalize(norm);
  if (norm.startsWith("./")) {
    norm = norm.slice(2);
  }
  return norm;
}

export class DependencyResolver {
  private fileSet: Set<string>;
  private aliasConfig: PathAliasConfig;
  private resolveCache = new Map<string, ResolveResult>();

  constructor(filePaths: string[], tsconfigContent?: string) {
    this.fileSet = new Set(filePaths.map(normalizePosix));
    this.aliasConfig = parseTsConfigAliases(tsconfigContent);
  }

  private matchAlias(specifier: string): string[] | null {
    const { baseUrl, paths } = this.aliasConfig;
    const candidates: string[] = [];

    for (const [aliasPattern, targetPatterns] of Object.entries(paths)) {
      if (aliasPattern.endsWith("/*")) {
        const prefix = aliasPattern.slice(0, -2);
        if (specifier.startsWith(prefix + "/") || specifier === prefix) {
          const suffix = specifier.slice(prefix.length).replace(/^\//, "");
          for (const targetPattern of targetPatterns) {
            const cleanTarget = targetPattern.endsWith("/*")
              ? targetPattern.slice(0, -2)
              : targetPattern;
            const full = baseUrl === "."
              ? `${cleanTarget}/${suffix}`
              : `${baseUrl}/${cleanTarget}/${suffix}`;
            candidates.push(normalizePosix(full));
          }
        }
      } else if (specifier === aliasPattern) {
        for (const targetPattern of targetPatterns) {
          const full = baseUrl === "."
            ? targetPattern
            : `${baseUrl}/${targetPattern}`;
          candidates.push(normalizePosix(full));
        }
      }
    }

    return candidates.length > 0 ? candidates : null;
  }

  private probeFile(baseCandidate: string): string | null {
    for (const ext of EXTENSIONS_TO_PROBE) {
      const candidate = normalizePosix(`${baseCandidate}${ext}`);
      if (this.fileSet.has(candidate)) {
        return candidate;
      }
    }

    // ESM projects often write `import "./module.js"` while authoring the
    // source as TypeScript. Try the emitted extension's source equivalents
    // only after the literal file path above has failed.
    const sourceExtension = path.posix.extname(baseCandidate).toLowerCase();
    if ([".js", ".jsx", ".mjs", ".cjs"].includes(sourceExtension)) {
      const stem = baseCandidate.slice(0, -sourceExtension.length);
      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
        const candidate = normalizePosix(`${stem}${ext}`);
        if (this.fileSet.has(candidate)) return candidate;
      }
    }
    return null;
  }

  private resolveImportUncached(
    sourceFilePath: string,
    specifier: string
  ): ResolveResult {
    const cleanSpecifier = specifier.trim();
    if (!cleanSpecifier) return { resolved: false, isExternal: false };

    // 1. Check relative imports (starts with ./ or ../)
    if (cleanSpecifier.startsWith("./") || cleanSpecifier.startsWith("../")) {
      const sourceDir = path.posix.dirname(normalizePosix(sourceFilePath));
      const targetBase = normalizePosix(path.posix.join(sourceDir, cleanSpecifier));
      const found = this.probeFile(targetBase);
      if (found) {
        return { resolved: true, targetPath: found, isExternal: false };
      }
      return { resolved: false, isExternal: false };
    }

    // 2. Check tsconfig path aliases
    const aliasCandidates = this.matchAlias(cleanSpecifier);
    if (aliasCandidates) {
      for (const candidate of aliasCandidates) {
        const found = this.probeFile(candidate);
        if (found) {
          return { resolved: true, targetPath: found, isExternal: false };
        }
      }
      return { resolved: false, isExternal: false };
    }

    // 3. Check if baseUrl allows root-relative import e.g. import 'src/foo'
    if (this.aliasConfig.baseUrl && this.aliasConfig.baseUrl !== ".") {
      const candidate = normalizePosix(
        path.posix.join(this.aliasConfig.baseUrl, cleanSpecifier)
      );
      const found = this.probeFile(candidate);
      if (found) {
        return { resolved: true, targetPath: found, isExternal: false };
      }
    }

    // 4. Otherwise treat as external package / standard module
    let pkgName = cleanSpecifier;
    if (cleanSpecifier.startsWith("@")) {
      const parts = cleanSpecifier.split("/");
      pkgName = parts.slice(0, 2).join("/");
    } else {
      pkgName = cleanSpecifier.split("/")[0];
    }

    return {
      resolved: true,
      isExternal: true,
      packageName: pkgName,
    };
  }

  public resolveImport(sourceFilePath: string, specifier: string): ResolveResult {
    const cacheKey = `${normalizePosix(sourceFilePath)}\u0000${specifier.trim()}`;
    const cached = this.resolveCache.get(cacheKey);
    if (cached) return cached;

    const result = this.resolveImportUncached(sourceFilePath, specifier);
    this.resolveCache.set(cacheKey, result);
    return result;
  }
}
