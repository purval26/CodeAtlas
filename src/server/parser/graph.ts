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
  for (const [sourcePath, fileResult] of parsedFiles.entries()) {
    const sourceNodeId = fileResult.file.id;

    for (const imp of fileResult.imports) {
      const res = resolver.resolveImport(sourcePath, imp.specifier);

      if (res.resolved && !res.isExternal && res.targetPath) {
        const targetNodeId = `${repository.id}:${res.targetPath}`;
        if (nodesMap.has(targetNodeId)) {
          const edgeId = `edge:${sourceNodeId}->${targetNodeId}`;
          edgesMap.set(edgeId, {
            id: edgeId,
            source: sourceNodeId,
            target: targetNodeId,
            type: "imports",
          });
        } else {
          unresolvedImports.push({
            sourceFile: sourcePath,
            specifier: imp.specifier,
            line: imp.line,
          });
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
        edgesMap.set(edgeId, {
          id: edgeId,
          source: sourceNodeId,
          target: pkgId,
          type: "imports",
        });
      } else {
        unresolvedImports.push({
          sourceFile: sourcePath,
          specifier: imp.specifier,
          line: imp.line,
        });
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
