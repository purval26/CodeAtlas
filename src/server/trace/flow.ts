import { GraphEdge, GraphNode } from "@/types";

export interface TraceFlowResult {
  found: boolean;
  nodePath: string[];
  edgePath: string[];
  readableSteps: string[];
}

export function traceDependencyFlow(
  startNodeId: string,
  endNodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): TraceFlowResult {
  if (startNodeId === endNodeId) {
    const node = nodes.find((n) => n.id === startNodeId);
    return {
      found: true,
      nodePath: [startNodeId],
      edgePath: [],
      readableSteps: [node?.label || startNodeId],
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

  // BFS Queue: [currentNodeId]
  const queue: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);
  const parent = new Map<string, { prevNode: string; edgeId: string }>();

  let found = false;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === endNodeId) {
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
    return {
      found: false,
      nodePath: [],
      edgePath: [],
      readableSteps: [],
    };
  }

  // Reconstruct path
  const nodePath: string[] = [];
  const edgePath: string[] = [];

  let curr = endNodeId;
  nodePath.push(curr);

  while (curr !== startNodeId) {
    const p = parent.get(curr)!;
    edgePath.unshift(p.edgeId);
    curr = p.prevNode;
    nodePath.unshift(curr);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n.label]));
  const readableSteps = nodePath.map((id) => nodeMap.get(id) || id);

  return {
    found: true,
    nodePath,
    edgePath,
    readableSteps,
  };
}
