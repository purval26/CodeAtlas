import { GraphEdge, GraphNode, TraceFlowResult, TraceHop } from "@/types";
import { ParsedFileResult } from "../parser/ast";

export { type TraceFlowResult, type TraceHop } from "@/types";

interface PathResult {
  found: boolean;
  nodePath: string[];
  edgePath: string[];
}

function findBfsPath(
  startId: string,
  endId: string,
  adj: Map<string, { target: string; edgeId: string }[]>
): PathResult {
  const queue: string[] = [startId];
  let queueIndex = 0;
  const visited = new Set<string>([startId]);
  const parent = new Map<string, { prevNode: string; edgeId: string }>();

  let found = false;

  while (queueIndex < queue.length) {
    const curr = queue[queueIndex++];
    if (curr === endId) {
      found = true;
      break;
    }

    const neighbors = adj.get(curr) || [];
    for (const { target, edgeId } of neighbors) {
      if (!visited.has(target)) {
        visited.add(target);
        parent.set(target, { prevNode: curr, edgeId });
        queue.push(target);
      }
    }
  }

  if (!found) {
    return { found: false, nodePath: [], edgePath: [] };
  }

  const nodePath: string[] = [];
  const edgePath: string[] = [];
  let curr = endId;
  nodePath.push(curr);

  while (curr !== startId) {
    const p = parent.get(curr)!;
    edgePath.unshift(p.edgeId);
    curr = p.prevNode;
    nodePath.unshift(curr);
  }

  return { found: true, nodePath, edgePath };
}

export function traceDependencyFlow(
  startNodeId: string,
  endNodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  parsedFiles?: Map<string, ParsedFileResult>
): TraceFlowResult {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const startNode = nodeMap.get(startNodeId);
  const endNode = nodeMap.get(endNodeId);

  const startLabel = startNode?.label || startNodeId;
  const endLabel = endNode?.label || endNodeId;

  if (!nodeMap.has(startNodeId) || !nodeMap.has(endNodeId)) {
    return {
      found: false,
      nodePath: [],
      edgePath: [],
      readableSteps: [],
      hops: [],
      summary: `Cannot calculate trace: one or both components could not be found.`,
    };
  }

  if (startNodeId === endNodeId) {
    return {
      found: true,
      nodePath: [startNodeId],
      edgePath: [],
      readableSteps: [startLabel],
      hops: [],
      summary: `Self-reference: "${startLabel}" is the start and end node.`,
    };
  }

  // Build adjacency list: source -> [{ target, edgeId }]
  const adj = new Map<string, { target: string; edgeId: string }[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) {
      adj.set(edge.source, []);
    }
    adj.get(edge.source)!.push({ target: edge.target, edgeId: edge.id });
  }

  const forwardResult = findBfsPath(startNodeId, endNodeId, adj);

  if (!forwardResult.found) {
    // Check if a reverse path exists (endNodeId -> startNodeId)
    const reverseResult = findBfsPath(endNodeId, startNodeId, adj);
    const reverseFound = reverseResult.found;

    return {
      found: false,
      reverseFound,
      nodePath: [],
      edgePath: [],
      readableSteps: [],
      hops: [],
      summary: reverseFound
        ? `No forward path from "${startLabel}" to "${endLabel}", but reverse flow exists: "${endLabel}" imports "${startLabel}" across ${reverseResult.nodePath.length - 1} hop(s).`
        : `No dependency path exists connecting "${startLabel}" to "${endLabel}".`,
    };
  }

  const { nodePath, edgePath } = forwardResult;
  const edgeMap = new Map(edges.map((edge) => [edge.id, edge]));
  const readableSteps = nodePath.map((id) => nodeMap.get(id)?.label || id);
  const hops: TraceHop[] = [];

  for (let i = 0; i < edgePath.length; i++) {
    const fromId = nodePath[i];
    const toId = nodePath[i + 1];
    const edgeId = edgePath[i];
    const edge = edgeMap.get(edgeId);

    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);

    const fromLabel = fromNode?.label || fromId;
    const toLabel = toNode?.label || toId;
    const fromPath = fromNode?.path;
    const toPath = toNode?.path;

    const importedSymbols = edge?.importedSymbols || [];
    const line = edge?.line;
    const isTypeOnly = edge?.isTypeOnly ?? false;
    const specifier = edge?.specifier;

    let codeSnippet: string | undefined;

    // 1. Try to read exact code snippet from parsedFiles
    if (parsedFiles && fromPath) {
      const parsedFile = parsedFiles.get(fromPath);
      if (parsedFile?.file?.content && line && line > 0) {
        const fileLines = parsedFile.file.content.split("\n");
        if (line <= fileLines.length) {
          codeSnippet = fileLines[line - 1].trim();
        }
      }
    }

    // 2. Synthesize clean snippet if not found in parsedFiles
    if (!codeSnippet) {
      const targetSpec = specifier || toPath || toLabel;
      if (importedSymbols.length > 0) {
        codeSnippet = `import ${isTypeOnly ? "type " : ""}{ ${importedSymbols.join(", ")} } from "${targetSpec}";`;
      } else {
        codeSnippet = `import "${targetSpec}";`;
      }
    }

    // Step description
    let stepDescription = "";
    if (importedSymbols.length > 0) {
      const symNames = importedSymbols.map((s) => `'${s}'`).join(", ");
      stepDescription = `${fromLabel} imports ${symNames} from ${toLabel}${line ? ` (line ${line})` : ""}`;
    } else {
      stepDescription = `${fromLabel} imports ${toLabel}${line ? ` (line ${line})` : ""}`;
    }

    hops.push({
      fromId,
      fromLabel,
      fromPath,
      toId,
      toLabel,
      toPath,
      edgeId,
      specifier,
      importedSymbols,
      line,
      codeSnippet,
      isTypeOnly,
      stepDescription,
    });
  }

  // Construct readable overall summary
  const hopCount = hops.length;
  const fileCount = nodePath.length;
  let summary = "";
  if (hopCount === 1) {
    summary = `Direct dependency: ${hops[0].stepDescription}.`;
  } else {
    const chainDetails = hops
      .map((h, idx) => {
        const symbolsStr = h.importedSymbols.length > 0 ? `{ ${h.importedSymbols.join(", ")} }` : "module";
        const lineStr = h.line ? ` @ L${h.line}` : "";
        return `${idx + 1}. ${h.fromLabel} → ${h.toLabel} [${symbolsStr}${lineStr}]`;
      })
      .join("  |  ");
    summary = `Traced ${hopCount} hop(s) across ${fileCount} files: ${chainDetails}`;
  }

  return {
    found: true,
    nodePath,
    edgePath,
    readableSteps,
    hops,
    summary,
  };
}
