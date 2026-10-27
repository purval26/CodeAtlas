import { GraphEdge, GraphNode, GraphLayoutMode, GraphEdgeStyle, EdgeDensityMode } from "@/types";

export type { GraphLayoutMode, GraphEdgeStyle, EdgeDensityMode };

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

/**
 * Computes a concentric orbital / radial layout.
 * The primary architectural root sits at the center, and dependency layers radiate outward in rings.
 */
export function computeRadialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: GraphLayoutOptions
): GraphLayoutResult {
  const positions = new Map<string, NodePosition>();
  if (nodes.length === 0) {
    return { positions, width: 0, height: 0, rowGap: 26, layerGap: 90 };
  }

  const fileNodes = nodes.filter((n) => n.type === "file");

  // Degree calculation (total connections)
  const degreeMap = new Map<string, number>();
  for (const n of nodes) degreeMap.set(n.id, 0);
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  }

  // Find center hub (prioritizing entry files or highest connected node)
  const sortedFiles = [...fileNodes].sort((a, b) => {
    const pA = (a.path || "").toLowerCase();
    const pB = (b.path || "").toLowerCase();
    const isEntryA = pA.includes("index") || pA.includes("main") || pA.includes("app") || pA.includes("login");
    const isEntryB = pB.includes("index") || pB.includes("main") || pB.includes("app") || pB.includes("login");
    if (isEntryA && !isEntryB) return -1;
    if (!isEntryA && isEntryB) return 1;
    return (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0);
  });

  const centerNode = sortedFiles[0] || nodes[0];

  // Adjacency
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }

  // BFS depth from centerNode
  const depth = new Map<string, number>();
  depth.set(centerNode.id, 0);

  const queue = [centerNode.id];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDepth = depth.get(curr)!;
    for (const neighbor of adj.get(curr) || []) {
      if (!depth.has(neighbor)) {
        depth.set(neighbor, currDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  // Assign outer orbit to disconnected or package nodes
  for (const n of nodes) {
    if (!depth.has(n.id)) {
      depth.set(n.id, n.type === "package" ? 3 : 2);
    }
  }

  // Group nodes by depth ring
  const rings = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) || 0;
    if (!rings.has(d)) rings.set(d, []);
    rings.get(d)!.push(n);
  }

  const vpW = Math.max(options?.viewportWidth || 1200, 1100);
  const vpH = Math.max(options?.viewportHeight || 800, 800);
  const centerX = vpW / 2;
  const centerY = vpH / 2;

  // Center node placement
  positions.set(centerNode.id, {
    x: centerX - NODE_WIDTH / 2,
    y: centerY - NODE_HEIGHT / 2,
    depth: 0,
  });

  const sortedRings = Array.from(rings.keys())
    .filter((d) => d > 0)
    .sort((a, b) => a - b);

  let maxRadius = 260;
  const baseRadius = 260;
  const ringGap = 220;

  for (const ringDepth of sortedRings) {
    const ringNodes = rings.get(ringDepth) || [];
    const count = ringNodes.length;
    if (count === 0) continue;

    const minCircumference = count * (NODE_WIDTH + 40);
    const radiusFromCircumference = minCircumference / (2 * Math.PI);
    const radius = Math.max(baseRadius + (ringDepth - 1) * ringGap, radiusFromCircumference);
    maxRadius = Math.max(maxRadius, radius);

    const angleStep = (2 * Math.PI) / count;
    // Stagger phase offset so rays do not align strictly in line
    const phaseOffset = ringDepth * 0.35;

    ringNodes.forEach((node, i) => {
      const angle = phaseOffset + i * angleStep;
      const dim = getNodeDimensions(node);
      const x = centerX + radius * Math.cos(angle) - dim.width / 2;
      const y = centerY + radius * Math.sin(angle) - dim.height / 2;

      positions.set(node.id, { x, y, depth: ringDepth });
    });
  }

  const totalWidth = centerX + maxRadius + NODE_WIDTH + 100;
  const totalHeight = centerY + maxRadius + NODE_HEIGHT + 100;

  return {
    positions,
    width: totalWidth,
    height: totalHeight,
    rowGap: 32,
    layerGap: 120,
  };
}

/**
 * Computes a folder/module cluster layout.
 * Groups nodes physically into directory-based visual clusters.
 */
export function computeClusterLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: GraphLayoutOptions
): GraphLayoutResult {
  const positions = new Map<string, NodePosition>();
  if (nodes.length === 0) {
    return { positions, width: 0, height: 0, rowGap: 26, layerGap: 90 };
  }

  function getClusterKey(node: GraphNode): string {
    if (node.type === "package") return "External Packages";
    const p = (node.path || "").replace(/\\/g, "/");
    const parts = p.split("/").filter(Boolean);
    if (parts.length <= 1) return "Root";
    if (parts[0] === "src" && parts.length > 2) {
      return parts.slice(1, -1).join("/");
    }
    return parts.slice(0, -1).join("/") || "Root";
  }

  const clusters = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const key = getClusterKey(n);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(n);
  }

  const clusterNames = Array.from(clusters.keys()).sort((a, b) => {
    if (a === "External Packages") return 1;
    if (b === "External Packages") return -1;
    const priority = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes("page") || lower.includes("feature") || lower.includes("auth")) return 1;
      if (lower.includes("context") || lower.includes("state") || lower.includes("store")) return 2;
      if (lower.includes("component") || lower.includes("ui")) return 3;
      if (lower.includes("hook") || lower.includes("service") || lower.includes("api")) return 4;
      if (lower.includes("util") || lower.includes("helper") || lower.includes("type")) return 5;
      return 6;
    };
    return priority(a) - priority(b);
  });

  const clusterGapX = 110;
  let cursorX = 60;
  let maxGraphY = 60;
  let totalMaxX = 60;

  clusterNames.forEach((clusterName, cIdx) => {
    const cNodes = clusters.get(clusterName) || [];
    cNodes.sort((a, b) => a.label.localeCompare(b.label));

    // Internal grid inside cluster
    const internalCols = Math.min(2, Math.max(1, Math.ceil(cNodes.length / 4)));
    const internalRows = Math.ceil(cNodes.length / internalCols);

    const clusterX = cursorX;
    const clusterY = 70;

    cNodes.forEach((node, nIdx) => {
      const col = Math.floor(nIdx / internalRows);
      const row = nIdx % internalRows;
      const dim = getNodeDimensions(node);

      const x = clusterX + col * (NODE_WIDTH + 26);
      const y = clusterY + row * (dim.height + 28);

      positions.set(node.id, { x, y, depth: cIdx });
      maxGraphY = Math.max(maxGraphY, y + dim.height + 40);
      totalMaxX = Math.max(totalMaxX, x + dim.width + 40);
    });

    cursorX += internalCols * (NODE_WIDTH + 26) + clusterGapX;
  });

  return {
    positions,
    width: totalMaxX + 80,
    height: maxGraphY + 80,
    rowGap: 28,
    layerGap: clusterGapX,
  };
}

/**
 * Universal layout dispatcher supporting layered, cluster, and radial modes.
 */
export function computeGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  mode: GraphLayoutMode = "layered",
  options?: GraphLayoutOptions
): GraphLayoutResult {
  if (mode === "radial") {
    return computeRadialLayout(nodes, edges, options);
  }
  if (mode === "cluster") {
    return computeClusterLayout(nodes, edges, options);
  }
  return computeDependencyLayout(nodes, edges, options);
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
  isConnectedToHovered?: boolean;
  hasSelection?: boolean;
  hasTrace?: boolean;
  hasHover?: boolean;
  densityMode?: EdgeDensityMode;
}

export interface EdgeVisualStyles {
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  animated: boolean;
  showMarker: boolean;
}

export function computeEdgeVisuals(state: EdgeVisualState): EdgeVisualStyles {
  const density = state.densityMode || "subtle";
  const isHighlighted = Boolean(
    state.isTraceEdge || state.isConnectedToSelected || state.isConnectedToHovered
  );

  // In "focus" mode: hide non-highlighted edges completely to eradicate clutter
  if (density === "focus" && !isHighlighted) {
    return {
      strokeColor: "transparent",
      strokeWidth: 0,
      opacity: 0,
      animated: false,
      showMarker: false,
    };
  }

  let strokeColor = "var(--edge)";
  let strokeWidth = 1.0;
  // In "subtle" mode: background edges are whisper-thin (0.10) to keep graph breathable
  let opacity = density === "subtle" ? 0.10 : 0.35;
  let animated = false;
  let showMarker: boolean = density === "all" || isHighlighted;

  if (state.isTraceEdge) {
    strokeColor = "var(--accent)";
    strokeWidth = 3;
    opacity = 1.0;
    animated = true;
    showMarker = true;
  } else if (state.isConnectedToSelected) {
    strokeColor = "var(--ink)";
    strokeWidth = 2.2;
    opacity = 1.0;
    showMarker = true;
  } else if (state.isConnectedToHovered) {
    strokeColor = "var(--accent)";
    strokeWidth = 2.0;
    opacity = 0.95;
    animated = true;
    showMarker = true;
  } else if (state.hasSelection || state.hasTrace || state.hasHover) {
    // Dim background lines even further down when inspecting a node
    opacity = density === "subtle" ? 0.04 : 0.15;
    strokeWidth = 0.8;
    showMarker = false;
  }

  return { strokeColor, strokeWidth, opacity, animated, showMarker };
}


