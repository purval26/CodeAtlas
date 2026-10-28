import {
  GraphData,
  GraphEdge,
  GraphNode,
  Repository,
} from "@/types";
import { ParsedFileResult } from "./ast";
import { DependencyResolver } from "./resolver";

export function buildDependencyGraph(
  repository: Repository,
  parsedFiles: Map<string, ParsedFileResult>,
  resolver: DependencyResolver
): GraphData {
  const nodesMap = new Map<string, GraphNode>();
  const edgesMap = new Map<string, GraphEdge>();
  const unresolvedImports: { sourceFile: string; specifier: string; line: number }[] = [];
  const unresolvedImportKeys = new Set<string>();

  let totalLines = 0;

  // 1. Create nodes for all parsed files
  for (const [filePath, fileResult] of parsedFiles.entries()) {
    const fileId = fileResult.file.id;
    const basename = filePath.split("/").pop() || filePath;
    totalLines += fileResult.file.lineCount;

    nodesMap.set(fileId, {
      id: fileId,
      type: "file",
      label: basename,
      path: filePath,
      symbols: fileResult.symbols,
      exports: fileResult.exports,
      lineCount: fileResult.file.lineCount,
      size: fileResult.file.size,
    });
  }

  // 2. Resolve imports and build edges
  const addUnresolvedImport = (sourceFile: string, specifier: string, line: number) => {
    const key = `${sourceFile}\u0000${specifier}\u0000${line}`;
    if (unresolvedImportKeys.has(key)) return;
    unresolvedImportKeys.add(key);
    unresolvedImports.push({ sourceFile, specifier, line });
  };

  for (const [sourcePath, fileResult] of parsedFiles.entries()) {
    const sourceNodeId = fileResult.file.id;

    for (const imp of fileResult.imports) {
      const res = resolver.resolveImport(sourcePath, imp.specifier);

      if (res.resolved && !res.isExternal && res.targetPath) {
        const targetNodeId = `${repository.id}:${res.targetPath}`;
        if (nodesMap.has(targetNodeId)) {
          if (targetNodeId !== sourceNodeId) {
            const edgeId = `edge:${sourceNodeId}->${targetNodeId}`;
            const existingEdge = edgesMap.get(edgeId);
            if (existingEdge) {
              if (imp.names.length > 0) {
                const combined = new Set([...(existingEdge.importedSymbols || []), ...imp.names]);
                existingEdge.importedSymbols = Array.from(combined);
              }
              if (!existingEdge.line || (imp.line && imp.line < existingEdge.line)) {
                existingEdge.line = imp.line;
                existingEdge.specifier = imp.specifier;
              }
              if (!imp.isTypeOnly) {
                existingEdge.isTypeOnly = false;
              }
            } else {
              edgesMap.set(edgeId, {
                id: edgeId,
                source: sourceNodeId,
                target: targetNodeId,
                type: "imports",
                specifier: imp.specifier,
                importedSymbols: imp.names.length > 0 ? [...imp.names] : undefined,
                line: imp.line,
                isTypeOnly: imp.isTypeOnly,
              });
            }
          }
        } else {
          addUnresolvedImport(sourcePath, imp.specifier, imp.line);
        }
      } else if (res.resolved && res.isExternal && res.packageName) {
        // External package node
        const pkgId = `pkg:${res.packageName}`;
        if (!nodesMap.has(pkgId)) {
          nodesMap.set(pkgId, {
            id: pkgId,
            type: "package",
            label: res.packageName,
          });
        }
        const edgeId = `edge:${sourceNodeId}->${pkgId}`;
        const existingEdge = edgesMap.get(edgeId);
        if (existingEdge) {
          if (imp.names.length > 0) {
            const combined = new Set([...(existingEdge.importedSymbols || []), ...imp.names]);
            existingEdge.importedSymbols = Array.from(combined);
          }
          if (!existingEdge.line || (imp.line && imp.line < existingEdge.line)) {
            existingEdge.line = imp.line;
            existingEdge.specifier = imp.specifier;
          }
          if (!imp.isTypeOnly) {
            existingEdge.isTypeOnly = false;
          }
        } else {
          edgesMap.set(edgeId, {
            id: edgeId,
            source: sourceNodeId,
            target: pkgId,
            type: "imports",
            specifier: imp.specifier,
            importedSymbols: imp.names.length > 0 ? [...imp.names] : undefined,
            line: imp.line,
            isTypeOnly: imp.isTypeOnly,
          });
        }
      } else {
        addUnresolvedImport(sourcePath, imp.specifier, imp.line);
      }
    }
  }

  // 3. Deterministically sort nodes and edges
  const sortedNodes = Array.from(nodesMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  const sortedEdges = Array.from(edgesMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  unresolvedImports.sort(
    (a, b) =>
      a.sourceFile.localeCompare(b.sourceFile) ||
      a.line - b.line ||
      a.specifier.localeCompare(b.specifier)
  );

  const totalFiles = sortedNodes.filter((n) => n.type === "file").length;
  const totalPackages = sortedNodes.filter((n) => n.type === "package").length;

  return {
    repository,
    nodes: sortedNodes,
    edges: sortedEdges,
    unresolvedImports,
    stats: {
      totalFiles,
      totalPackages,
      totalImports: sortedEdges.length,
      totalLines,
    },
  };
}
