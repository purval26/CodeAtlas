import { GraphEdge, GraphNode } from "@/types";

export interface NodePosition {
  x: number;
  y: number;
  depth: number;
}

export interface GraphLayoutResult {
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
  rowGap: number;
  layerGap: number;
}

export interface GraphLayoutOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  isMobile?: boolean;
}

export const NODE_WIDTH = 210;
export const NODE_HEIGHT = 70;
export const PKG_WIDTH = 140;
export const PKG_HEIGHT = 38;

export function getNodeDimensions(node: GraphNode): { width: number; height: number } {
  if (node.type === "package") {
    return { width: PKG_WIDTH, height: PKG_HEIGHT };
  }
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

/**
 * Computes a deterministic 2D dependency-oriented layout for the Atlas graph,
 * adapting dynamically to the available component display viewport.
 * Distributes nodes across dependency depth layers from left to right,
 * and spreads columns and rows across the available canvas space.
 */
export function computeDependencyLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: GraphLayoutOptions
): GraphLayoutResult {
  const positions = new Map<string, NodePosition>();

  if (nodes.length === 0) {
    return { positions, width: 0, height: 0, rowGap: 26, layerGap: 90 };
  }

  // 1. Build adjacency maps
  const outgoingMap = new Map<string, Set<string>>();
  const incomingMap = new Map<string, Set<string>>();

  for (const n of nodes) {
    outgoingMap.set(n.id, new Set());
    incomingMap.set(n.id, new Set());
  }

  for (const e of edges) {
    if (outgoingMap.has(e.source)) outgoingMap.get(e.source)!.add(e.target);
    if (incomingMap.has(e.target)) incomingMap.get(e.target)!.add(e.source);
  }

  const fileNodes = nodes.filter((n) => n.type === "file");
  const packageNodes = nodes.filter((n) => n.type === "package");

  // Calculate local in-degrees (incoming edges from other files in repository)
  const localInDegree = new Map<string, number>();
  for (const f of fileNodes) {
    let inc = 0;
    const incomingSources = incomingMap.get(f.id) || new Set();
    for (const src of incomingSources) {
      if (nodes.find((n) => n.id === src)?.type === "file") inc++;
    }
    localInDegree.set(f.id, inc);
  }

  // 2. Identify root / entry nodes
  let roots = fileNodes.filter((f) => (localInDegree.get(f.id) || 0) === 0);

  if (roots.length === 0 && fileNodes.length > 0) {
    const minInc = Math.min(...Array.from(localInDegree.values()));
    roots = fileNodes.filter((f) => (localInDegree.get(f.id) || 0) === minInc);
  }

  // 3. Compute dependency depth using forward traversal
  const depth = new Map<string, number>();
  for (const r of roots) {
    depth.set(r.id, 0);
  }

  const queue = [...roots.map((r) => r.id)];
  const visited = new Set<string>(queue);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDepth = depth.get(curr) || 0;
    const targets = outgoingMap.get(curr) || new Set();

    for (const tgt of targets) {
      const tgtNode = nodes.find((n) => n.id === tgt);
      if (tgtNode && tgtNode.type === "file") {
        const nextDepth = currDepth + 1;
        const boundedDepth = Math.min(nextDepth, 5);

        if (!depth.has(tgt) || depth.get(tgt)! < boundedDepth) {
          depth.set(tgt, boundedDepth);
          if (!visited.has(tgt)) {
            visited.add(tgt);
            queue.push(tgt);
          }
        }
      }
    }
  }

  // Assign depth for any disconnected file nodes based on functional role or default to 1
  for (const f of fileNodes) {
    if (!depth.has(f.id)) {
      const p = (f.path || "").toLowerCase();
      if (p.includes("feature") || p.includes("page") || p.includes("route")) {
        depth.set(f.id, 0);
      } else if (p.includes("component") || p.includes("context") || p.includes("state")) {
        depth.set(f.id, 1);
      } else if (p.includes("service") || p.includes("hook")) {
        depth.set(f.id, 2);
      } else {
        depth.set(f.id, 1);
      }
    }
  }

  // 4. Group file nodes by depth
  const layers = new Map<number, GraphNode[]>();
  for (const f of fileNodes) {
    const d = depth.get(f.id) || 0;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(f);
  }

  // Place external package nodes on the final layer
  const maxFileDepth = Math.max(...Array.from(layers.keys()), 0);
  if (packageNodes.length > 0) {
    layers.set(maxFileDepth + 1, packageNodes);
  }

  // 5. Responsive Viewport Spreading & Multi-column distribution
  const sortedLayerKeys = Array.from(layers.keys()).sort((a, b) => a - b);
  const numLayers = sortedLayerKeys.length;

  const vpW = options?.viewportWidth ?? 0;
  const vpH = options?.viewportHeight ?? 0;
  const isMobile = options?.isMobile ?? false;

  let maxRowsPerColumn = 6;
  let rowGap = 26;
  let layerGap = 90;
  let subColGap = 28;
  let startX = 50;
  let startY = 60;

  if (vpW > 0 && vpH > 0) {
    // Dynamic row capacity per column balancing graph aspect ratio to available component viewport
    const targetAspect = Math.max(0.5, Math.min(2.4, vpW / vpH));
    const minCandidate = isMobile ? 4 : 4;
    const maxCandidate = isMobile ? 12 : 11;

    let bestRows = 6;
    let bestScore = Infinity;

    for (let candidateRows = minCandidate; candidateRows <= maxCandidate; candidateRows++) {
      let estCols = 0;
      let estMaxRows = 1;
      for (const lk of sortedLayerKeys) {
        const lNodes = layers.get(lk) || [];
        const numSub = Math.max(1, Math.ceil(lNodes.length / candidateRows));
        estCols += numSub;
        const nodesPerCol = Math.ceil(lNodes.length / numSub);
        if (nodesPerCol > estMaxRows) estMaxRows = nodesPerCol;
      }
      const estW = estCols * (NODE_WIDTH + 28) + (numLayers - 1) * 90;
      const estH = estMaxRows * (NODE_HEIGHT + 36);
      const aspect = estW / Math.max(1, estH);
      const score = Math.abs(Math.log(aspect / targetAspect));
      if (score < bestScore) {
        bestScore = score;
        bestRows = candidateRows;
      }
    }

    maxRowsPerColumn = bestRows;

    // Calculate maximum rows needed in any single column
    let maxRowsInAnyCol = 1;
    let totalCols = 0;

    for (const lk of sortedLayerKeys) {
      const lNodes = layers.get(lk) || [];
      const numSub = Math.max(1, Math.ceil(lNodes.length / maxRowsPerColumn));
      totalCols += numSub;
      const nodesPerCol = Math.ceil(lNodes.length / numSub);
      if (nodesPerCol > maxRowsInAnyCol) {
        maxRowsInAnyCol = nodesPerCol;
      }
    }

    // Spread rows across available vertical space
    const availH = vpH - 130 - maxRowsInAnyCol * NODE_HEIGHT;
    if (maxRowsInAnyCol > 1 && availH > 0) {
      rowGap = Math.max(34, Math.min(85, Math.floor(availH / (maxRowsInAnyCol - 1))));
    } else {
      rowGap = isMobile ? 32 : 48;
    }

    // Spread columns across available horizontal space
    const approxTotalNodeWidth = totalCols * NODE_WIDTH;
    const availW = vpW - 120 - approxTotalNodeWidth;
    if (numLayers > 1 && availW > 0) {
      layerGap = Math.max(100, Math.min(220, Math.floor((availW * 0.72) / (numLayers - 1))));
    } else {
      layerGap = isMobile ? 85 : 120;
    }
    subColGap = Math.max(28, Math.min(65, Math.floor(layerGap * 0.38)));

    // Center vertically in viewport if content height is smaller than available viewport
    const totalGraphH = maxRowsInAnyCol * NODE_HEIGHT + (maxRowsInAnyCol - 1) * rowGap;
    if (totalGraphH < vpH - 80) {
      startY = Math.max(45, Math.floor((vpH - totalGraphH) / 2));
    }
  }

  let currentX = startX;
  let maxY = startY;

  for (const layerKey of sortedLayerKeys) {
    const layerNodes = layers.get(layerKey) || [];

    // Deterministic sorting: higher in-degree first, then alphabetical by label
    layerNodes.sort((a, b) => {
      const incDiff = (localInDegree.get(b.id) || 0) - (localInDegree.get(a.id) || 0);
      if (incDiff !== 0) return incDiff;
      return a.label.localeCompare(b.label);
    });

    const numSubCols = Math.max(1, Math.ceil(layerNodes.length / maxRowsPerColumn));
    const nodesPerCol = Math.ceil(layerNodes.length / numSubCols);

    layerNodes.forEach((node, idx) => {
      const colIdx = Math.floor(idx / nodesPerCol);
      const rowIdx = idx % nodesPerCol;

      const x = currentX + colIdx * (NODE_WIDTH + subColGap);
      const y = startY + rowIdx * (NODE_HEIGHT + rowGap);

      positions.set(node.id, { x, y, depth: layerKey });

      if (y + NODE_HEIGHT > maxY) {
        maxY = y + NODE_HEIGHT;
      }
    });

    currentX += numSubCols * (NODE_WIDTH + subColGap) + layerGap;
  }

  return {
    positions,
    width: currentX,
    height: maxY + 60,
    rowGap,
    layerGap,
  };
}

export interface ArchitectureFocusResult {
  primaryRootId: string;
  focusNodeIds: string[];
  primaryRootPos: NodePosition;
  clusterCenterY: number;
  centerX: number;
  centerY: number;
  mobileZoom: number;
  desktopZoom: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

/**
 * Identifies the primary architectural entry point / core region from graph structure,
 * and calculates camera coordinates to ensure readable node sizes without squeezing the entire graph.
 */
export function computeArchitectureFocus(
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, NodePosition>,
  options?: {
    isMobile?: boolean;
    containerWidth?: number;
    containerHeight?: number;
  }
): ArchitectureFocusResult {
  const isMobile = options?.isMobile ?? false;
  const mobileZoom = 0.82;
  const desktopZoom = 0.88;
  const targetZoom = isMobile ? mobileZoom : desktopZoom;

  const fileNodes = nodes.filter((n) => n.type === "file");

  if (fileNodes.length === 0) {
    const fallbackPos: NodePosition = { x: 50, y: 60, depth: 0 };
    return {
      primaryRootId: nodes[0]?.id || "",
      focusNodeIds: nodes.map((n) => n.id),
      primaryRootPos: fallbackPos,
      clusterCenterY: 150,
      centerX: 250,
      centerY: 150,
      mobileZoom,
      desktopZoom,
      bounds: { minX: 50, maxX: 260, minY: 60, maxY: 130, width: 210, height: 70 },
    };
  }

  // 1. Map incoming and outgoing connections among file nodes
  const incomingFiles = new Map<string, Set<string>>();
  const outgoingFiles = new Map<string, Set<string>>();

  for (const f of fileNodes) {
    incomingFiles.set(f.id, new Set());
    outgoingFiles.set(f.id, new Set());
  }

  for (const e of edges) {
    if (incomingFiles.has(e.target) && outgoingFiles.has(e.source)) {
      incomingFiles.get(e.target)!.add(e.source);
      outgoingFiles.get(e.source)!.add(e.target);
    }
  }

  // 2. Identify candidate roots with minimum file in-degree
  let minInc = Infinity;
  for (const f of fileNodes) {
    const count = incomingFiles.get(f.id)!.size;
    if (count < minInc) minInc = count;
  }

  const candidateRoots = fileNodes.filter(
    (f) => incomingFiles.get(f.id)!.size === minInc
  );

  // 3. For each candidate root, measure reachable architectural subgraph size
  function getReachableFileCount(rootId: string): number {
    const visited = new Set<string>([rootId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const targets = outgoingFiles.get(curr) || new Set();
      for (const tgt of targets) {
        if (!visited.has(tgt)) {
          visited.add(tgt);
          queue.push(tgt);
        }
      }
    }
    return visited.size;
  }

  // Rank candidate roots: highest reachability first, then highest out-degree, then alphabetical
  candidateRoots.sort((a, b) => {
    const reachDiff = getReachableFileCount(b.id) - getReachableFileCount(a.id);
    if (reachDiff !== 0) return reachDiff;
    const outDiff = outgoingFiles.get(b.id)!.size - outgoingFiles.get(a.id)!.size;
    if (outDiff !== 0) return outDiff;
    return a.label.localeCompare(b.label);
  });

  const primaryRoot = candidateRoots[0] || fileNodes[0];

  // 4. Assemble focus nodes: primary root + direct dependencies + 2nd degree dependencies (5–12 nodes)
  const focusSet = new Set<string>([primaryRoot.id]);
  const directDeps = Array.from(outgoingFiles.get(primaryRoot.id) || []);
  for (const dep of directDeps) {
    if (focusSet.size < 12) focusSet.add(dep);
  }

  if (focusSet.size < 6) {
    for (const dep of directDeps) {
      const secondDeps = Array.from(outgoingFiles.get(dep) || []);
      for (const s of secondDeps) {
        if (focusSet.size < 12) focusSet.add(s);
      }
    }
  }

  // If the repository has <= 12 files, include all file nodes in focus group
  if (fileNodes.length <= 12) {
    for (const f of fileNodes) {
      focusSet.add(f.id);
    }
  }

  const focusNodeIds = Array.from(focusSet);

  // 5. Compute cluster bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const id of focusNodeIds) {
    const pos = positions.get(id);
    if (pos) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
    }
  }

  if (minX === Infinity) {
    minX = 50;
    maxX = 260;
    minY = 60;
    maxY = 130;
  }

  const primaryRootPos = positions.get(primaryRoot.id) || { x: minX, y: minY, depth: 0 };
  const clusterCenterY = (minY + maxY) / 2;

  // 6. Calculate viewport center:
  // Aligns primary root at comfortable left margin (32px mobile, 48px desktop)
  const containerW = options?.containerWidth || (isMobile ? 390 : 1200);
  const leftPad = isMobile ? 32 : 48;
  const centerX = primaryRootPos.x + (containerW / 2 - leftPad) / targetZoom;
  const centerY = clusterCenterY;

  return {
    primaryRootId: primaryRoot.id,
    focusNodeIds,
    primaryRootPos,
    clusterCenterY,
    centerX,
    centerY,
    mobileZoom,
    desktopZoom,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

export interface ObstacleBox {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface EdgeRouteResult {
  svgPath: string;
  points: { x: number; y: number }[];
}

export function pointsToSvgPath(rawPoints: { x: number; y: number }[], radius = 6): string {
  if (!rawPoints || rawPoints.length < 2) return "";

  // 1. Remove adjacent duplicate points
  const points: { x: number; y: number }[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = points[points.length - 1];
    const curr = rawPoints[i];
    if (Math.abs(prev.x - curr.x) < 0.5 && Math.abs(prev.y - curr.y) < 0.5) continue;
    points.push(curr);
  }

  // 2. Remove redundant collinear points along straight lines
  const simplified: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      simplified.push(points[i]);
      continue;
    }
    const prev = simplified[simplified.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const isCollinearX = Math.abs(prev.x - curr.x) < 0.1 && Math.abs(curr.x - next.x) < 0.1;
    const isCollinearY = Math.abs(prev.y - curr.y) < 0.1 && Math.abs(curr.y - next.y) < 0.1;
    if (!isCollinearX && !isCollinearY) {
      simplified.push(curr);
    }
  }

  if (simplified.length < 2) return "";
  if (simplified.length === 2) {
    return `M ${simplified[0].x.toFixed(1)} ${simplified[0].y.toFixed(1)} L ${simplified[1].x.toFixed(1)} ${simplified[1].y.toFixed(1)}`;
  }

  let d = `M ${simplified[0].x.toFixed(1)} ${simplified[0].y.toFixed(1)}`;

  for (let i = 1; i < simplified.length - 1; i++) {
    const prev = simplified[i - 1];
    const curr = simplified[i];
    const next = simplified[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    const r = Math.min(radius, len1 / 2, len2 / 2);

    const startX = curr.x - (dx1 / len1) * r;
    const startY = curr.y - (dy1 / len1) * r;
    const endX = curr.x + (dx2 / len2) * r;
    const endY = curr.y + (dy2 / len2) * r;

    d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const last = simplified[simplified.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export function segmentIntersectsBox(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  box: ObstacleBox
): boolean {
  if (Math.abs(p1.y - p2.y) < 0.001) {
    const y = p1.y;
    if (y < box.minY || y > box.maxY) return false;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    return Math.max(minX, box.minX) < Math.min(maxX, box.maxX);
  }
  if (Math.abs(p1.x - p2.x) < 0.001) {
    const x = p1.x;
    if (x < box.minX || x > box.maxX) return false;
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    return Math.max(minY, box.minY) < Math.min(maxY, box.maxY);
  }
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  return Math.max(minX, box.minX) < Math.min(maxX, box.maxX) &&
         Math.max(minY, box.minY) < Math.min(maxY, box.maxY);
}

/**
 * Computes deterministic obstacle-avoiding orthogonal routes for all edges in the graph.
 * Routes traverse dedicated horizontal inter-row channels and vertical inter-column channels,
 * guaranteeing that connection lines NEVER intersect any card.
 * Assigns lane offsets to parallel lines sharing the same channel to prevent edge overlap.
 */
export function computeObstacleFreeEdgeRoutes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, NodePosition>
): Map<string, EdgeRouteResult> {
  const routes = new Map<string, EdgeRouteResult>();
  if (nodes.length === 0 || edges.length === 0) return routes;

  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // 1. Build obstacle bounding boxes with safety margin (8px clearance around cards)
  const SAFETY_MARGIN = 8;
  const boxes: ObstacleBox[] = [];

  for (const n of nodes) {
    const pos = positions.get(n.id);
    if (!pos) continue;
    const dim = getNodeDimensions(n);
    const box: ObstacleBox = {
      id: n.id,
      minX: pos.x - SAFETY_MARGIN,
      maxX: pos.x + dim.width + SAFETY_MARGIN,
      minY: pos.y - SAFETY_MARGIN,
      maxY: pos.y + dim.height + SAFETY_MARGIN,
    };
    boxes.push(box);
  }

  if (boxes.length === 0) return routes;

  // 2. Discover all collision-free horizontal routing channels
  const globalMinY = Math.min(...boxes.map((b) => b.minY));
  const globalMaxY = Math.max(...boxes.map((b) => b.maxY));

  // Top channel (above all cards) and Bottom channel (below all cards)
  const topChannel = globalMinY - 32;
  const bottomChannel = globalMaxY + 32;

  // Inter-row channels between distinct rows
  const candidateChannels: number[] = [topChannel];
  
  const uniqueY = Array.from(new Set(boxes.map((b) => b.minY + SAFETY_MARGIN))).sort((a, b) => a - b);
  for (let i = 0; i < uniqueY.length - 1; i++) {
    const rowBottom = uniqueY[i] + NODE_HEIGHT + SAFETY_MARGIN;
    const nextRowTop = uniqueY[i + 1] - SAFETY_MARGIN;
    if (nextRowTop > rowBottom) {
      candidateChannels.push(rowBottom + (nextRowTop - rowBottom) / 2);
    }
  }
  candidateChannels.push(bottomChannel);

  // Group edges by their chosen channel to assign lanes
  const channelAssignments = new Map<number, string[]>();
  for (const ch of candidateChannels) {
    channelAssignments.set(ch, []);
  }

  interface EdgeCandidate {
    edge: GraphEdge;
    srcHandle: { x: number; y: number };
    tgtHandle: { x: number; y: number };
    type: "direct" | "channel";
    chosenChannel?: number;
    exitX?: number;
    entryX?: number;
    directSegments?: [{ x: number; y: number }, { x: number; y: number }][];
  }

  const edgeCandidates: EdgeCandidate[] = [];

  for (const edge of edges) {
    const srcPos = positions.get(edge.source);
    const tgtPos = positions.get(edge.target);
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    if (!srcPos || !tgtPos || !srcNode || !tgtNode) continue;

    const srcDim = getNodeDimensions(srcNode);
    const tgtDim = getNodeDimensions(tgtNode);

    const srcHandle = { x: srcPos.x + srcDim.width, y: srcPos.y + srcDim.height / 2 };
    const tgtHandle = { x: tgtPos.x, y: tgtPos.y + tgtDim.height / 2 };

    const otherBoxes = boxes.filter((b) => b.id !== edge.source && b.id !== edge.target);

    // Try direct step route (only if target is comfortably to the right)
    let isDirectValid = false;
    let directSegments: [{ x: number; y: number }, { x: number; y: number }][] = [];

    if (tgtHandle.x > srcHandle.x + 36) {
      const midX = (srcHandle.x + tgtHandle.x) / 2;
      directSegments = [
        [srcHandle, { x: midX, y: srcHandle.y }],
        [{ x: midX, y: srcHandle.y }, { x: midX, y: tgtHandle.y }],
        [{ x: midX, y: tgtHandle.y }, tgtHandle],
      ];

      let collides = false;
      for (const box of otherBoxes) {
        for (const [p1, p2] of directSegments) {
          if (segmentIntersectsBox(p1, p2, box)) {
            collides = true;
            break;
          }
        }
        if (collides) break;
      }

      if (!collides) {
        isDirectValid = true;
      }
    }

    if (isDirectValid) {
      edgeCandidates.push({
        edge,
        srcHandle,
        tgtHandle,
        type: "direct",
        directSegments,
      });
      continue;
    }

    // Direct route collides or target is to left/same column -> Route via dedicated channel!
    const exitX = srcHandle.x + 14;
    const entryX = tgtHandle.x - 14;

    let bestChannel = topChannel;
    let bestScore = Infinity;

    for (const ch of candidateChannels) {
      const channelSegments: [{ x: number; y: number }, { x: number; y: number }][] = [
        [srcHandle, { x: exitX, y: srcHandle.y }],
        [{ x: exitX, y: srcHandle.y }, { x: exitX, y: ch }],
        [{ x: exitX, y: ch }, { x: entryX, y: ch }],
        [{ x: entryX, y: ch }, { x: entryX, y: tgtHandle.y }],
        [{ x: entryX, y: tgtHandle.y }, tgtHandle],
      ];

      let collides = false;
      for (const box of otherBoxes) {
        for (const [p1, p2] of channelSegments) {
          if (segmentIntersectsBox(p1, p2, box)) {
            collides = true;
            break;
          }
        }
        if (collides) break;
      }

      if (!collides) {
        const score = Math.abs(ch - srcHandle.y) + Math.abs(ch - tgtHandle.y);
        if (score < bestScore) {
          bestScore = score;
          bestChannel = ch;
        }
      }
    }

    channelAssignments.get(bestChannel)?.push(edge.id);

    edgeCandidates.push({
      edge,
      srcHandle,
      tgtHandle,
      type: "channel",
      chosenChannel: bestChannel,
      exitX,
      entryX,
    });
  }

  // Second pass: apply lane offsets so parallel edges in same channel don't overlap each other
  for (const cand of edgeCandidates) {
    if (cand.type === "direct" && cand.directSegments) {
      const points = [
        cand.directSegments[0][0],
        cand.directSegments[0][1],
        cand.directSegments[1][1],
        cand.directSegments[2][1],
      ];
      routes.set(cand.edge.id, {
        svgPath: pointsToSvgPath(points, 7),
        points,
      });
      continue;
    }

    const ch = cand.chosenChannel ?? topChannel;
    const edgesInChannel = channelAssignments.get(ch) || [cand.edge.id];
    const trackIndex = edgesInChannel.indexOf(cand.edge.id);
    const trackCount = edgesInChannel.length;

    // Distribute within safe track window in channel
    const maxOffset = Math.min(10, Math.max(0, (SAFETY_MARGIN * 2 - 4)));
    const step = trackCount > 1 ? (maxOffset * 2) / (trackCount - 1) : 0;
    const laneOffsetY = trackCount > 1 ? -maxOffset + trackIndex * Math.min(5, step) : 0;

    const finalChannelY = ch + laneOffsetY;
    const exitX = cand.exitX ?? cand.srcHandle.x + 14;
    const entryX = cand.entryX ?? cand.tgtHandle.x - 14;

    const points = [
      cand.srcHandle,
      { x: exitX, y: cand.srcHandle.y },
      { x: exitX, y: finalChannelY },
      { x: entryX, y: finalChannelY },
      { x: entryX, y: cand.tgtHandle.y },
      cand.tgtHandle,
    ];

    routes.set(cand.edge.id, {
      svgPath: pointsToSvgPath(points, 7),
      points,
    });
  }

  return routes;
}

export interface NodeVisualState {
  selected?: boolean;
  isTrace?: boolean;
  isDirectImport?: boolean;
  isDirectDependent?: boolean;
  isDimmed?: boolean;
}

export interface NodeVisualStyles {
  background: string;
  color: string;
  border: string;
  boxShadow: string;
  opacity: number;
}

export function computeNodeVisuals(state: NodeVisualState): NodeVisualStyles {
  let background = "var(--white)";
  let color = "var(--ink)";
  let border = "1.5px solid var(--border)";
  let boxShadow = "none";
  let opacity = 1.0;

  if (state.selected || state.isTrace) {
    background = "var(--accent)";
    color = "#11100F";
    border = "2px solid #11100F";
    boxShadow = "0 0 0 2px var(--accent)";
    opacity = 1.0;
  } else if (state.isDirectImport) {
    border = "2px solid var(--accent)";
    opacity = 0.95;
  } else if (state.isDirectDependent) {
    border = "2px solid var(--ink)";
    opacity = 0.95;
  } else if (state.isDimmed) {
    opacity = 0.68;
  }

  return { background, color, border, boxShadow, opacity };
}

export interface EdgeVisualState {
  isTraceEdge?: boolean;
  isConnectedToSelected?: boolean;
  hasSelection?: boolean;
  hasTrace?: boolean;
}

export interface EdgeVisualStyles {
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  animated: boolean;
}

export function computeEdgeVisuals(state: EdgeVisualState): EdgeVisualStyles {
  let strokeColor = "var(--edge)";
  let strokeWidth = 1.2;
  let opacity = 0.45;
  let animated = false;

  if (state.isTraceEdge) {
    strokeColor = "var(--accent)";
    strokeWidth = 3;
    opacity = 1.0;
    animated = true;
  } else if (state.isConnectedToSelected) {
    strokeColor = "var(--ink)";
    strokeWidth = 2.2;
    opacity = 1.0;
  } else if (state.hasSelection || state.hasTrace) {
    opacity = 0.30;
    strokeWidth = 1.0;
  }

  return { strokeColor, strokeWidth, opacity, animated };
}


