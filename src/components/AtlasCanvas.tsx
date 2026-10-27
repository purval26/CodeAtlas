"use client";
import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  ReactFlowInstance,
  Node,
  Edge,
  Position,
  Handle,
  NodeProps,
  EdgeProps,
  BaseEdge,
  MarkerType,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from "reactflow";
import { GraphData, GraphLayoutMode, GraphEdgeStyle, EdgeDensityMode } from "@/types";
import {
  computeGraphLayout,
  computeDependencyLayout,
  computeArchitectureFocus,
  computeObstacleFreeEdgeRoutes,
  computeNodeVisuals,
  computeEdgeVisuals,
  getNodeDimensions,
  NODE_WIDTH,
  NODE_HEIGHT,
  PKG_WIDTH,
  PKG_HEIGHT,
} from "@/utils/layout";
import { FileCode, Package, Focus, Maximize2 } from "lucide-react";
import { useSettings } from "@/utils/settings";
import { CustomSelect, CustomSelectOption } from "./CustomSelect";

const EDGE_DENSITY_OPTIONS: CustomSelectOption<EdgeDensityMode>[] = [
  { value: "subtle", label: "Subtle (Clean)", description: "Subtle background, bright active paths" },
  { value: "focus", label: "Focus Only", description: "Zero noise: only active file connections" },
  { value: "all", label: "All Edges", description: "Standard visibility for all connections" },
];

const LAYOUT_MODE_OPTIONS: CustomSelectOption<GraphLayoutMode>[] = [
  { value: "layered", label: "Pipeline", description: "Hierarchical left-to-right architecture" },
  { value: "cluster", label: "Folders", description: "Directory-grouped visual module blocks" },
  { value: "radial", label: "Radial", description: "Concentric rings around core entrypoint" },
];

const EDGE_STYLE_OPTIONS: CustomSelectOption<GraphEdgeStyle>[] = [
  { value: "bezier", label: "Curves", description: "Fluid cubic Bezier S-curves" },
  { value: "smoothstep", label: "Subway", description: "Orthogonal bus with rounded corners" },
  { value: "obstacleFree", label: "Channel", description: "Obstacle-avoiding collision lanes" },
  { value: "straight", label: "Direct", description: "Clean point-to-point vectors" },
];

interface AtlasCanvasProps {
  graphData: GraphData;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  tracePathNodeIds?: string[];
  tracePathEdgeIds?: string[];
  isMobile?: boolean;
  isTablet?: boolean;
}

// Custom Node for Code Files with strict dimensions and centered handles
const FileNodeComponent = ({ data, selected }: NodeProps) => {
  const isTrace = data.isTrace;
  const traceStep = data.traceStep;
  const isDimmed = data.isDimmed;
  const isDirectImport = data.isDirectImport;
  const isDirectDependent = data.isDirectDependent;

  // Derive directory prefix (e.g. "auth/" from "src/features/auth/Login.tsx")
  const pathParts = (data.path || "").split("/");
  const dirName = pathParts.length > 1 ? pathParts[pathParts.length - 2] + "/" : "";

  const { background, color, border, boxShadow, opacity } = computeNodeVisuals({
    selected,
    isTrace,
    isDirectImport,
    isDirectDependent,
    isDimmed,
  });

  return (
    <div
      style={{
        padding: "8px 12px",
        width: `${NODE_WIDTH}px`,
        minWidth: `${NODE_WIDTH}px`,
        maxWidth: `${NODE_WIDTH}px`,
        height: `${NODE_HEIGHT}px`,
        boxSizing: "border-box",
        background,
        color,
        border,
        boxShadow,
        fontFamily: "'Space Grotesk', sans-serif",
        transition: "all 0.18s ease",
        opacity,
        cursor: "pointer",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "var(--ink)",
          width: 6,
          height: 6,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "var(--ink)",
          width: 6,
          height: 6,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />

      {/* Trace step badge */}
      {isTrace && (
        <div
          className="font-mono"
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            background: "#11100F",
            color: "var(--accent)",
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 6px",
            border: "1px solid var(--accent)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          STEP #{traceStep}
        </div>
      )}

      {/* Direct relationship tags */}
      {!isTrace && !selected && isDirectImport && (
        <div
          className="font-mono"
          style={{
            position: "absolute",
            top: "-9px",
            right: "-6px",
            background: "var(--accent)",
            color: "#11100F",
            fontSize: "9px",
            fontWeight: 700,
            padding: "1px 5px",
            border: "1px solid var(--ink)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          IMPORTS →
        </div>
      )}

      {!isTrace && !selected && isDirectDependent && (
        <div
          className="font-mono"
          style={{
            position: "absolute",
            top: "-9px",
            right: "-6px",
            background: "var(--paper)",
            color: "var(--ink)",
            fontSize: "9px",
            fontWeight: 700,
            padding: "1px 5px",
            border: "1px solid var(--border)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          ← DEPENDS
        </div>
      )}

      {/* Directory context tag */}
      {dirName && (
        <div
          className="font-mono"
          style={{
            fontSize: "9px",
            color: selected || isTrace ? "#333" : "var(--muted)",
            marginBottom: "1px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {dirName}
        </div>
      )}

      {/* File label */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", pointerEvents: "none" }}>
        <FileCode size={13} style={{ flexShrink: 0, pointerEvents: "none" }} />
        <div
          style={{
            fontWeight: 700,
            fontSize: "12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
          title={data.label}
        >
          {data.label}
        </div>
      </div>

      {/* Technical metrics */}
      <div
        className="font-mono"
        style={{
          fontSize: "9px",
          color: selected || isTrace ? "#333" : "var(--muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <span>{data.lineCount !== undefined ? `${data.lineCount} L` : ""}</span>
        <span>
          {data.incomingCount !== undefined && data.outgoingCount !== undefined
            ? `↓${data.incomingCount} ↑${data.outgoingCount}`
            : data.exportsCount
            ? `${data.exportsCount} EXP`
            : ""}
        </span>
      </div>
    </div>
  );
};

// Custom Node for External Packages with strict dimensions
const PackageNodeComponent = ({ data, selected }: NodeProps) => {
  const isDimmed = data.isDimmed;
  const isDirectImport = data.isDirectImport;
  const isHovered = data.isHovered;

  const { opacity } = computeNodeVisuals({
    selected: selected || isHovered,
    isDirectImport,
    isDimmed,
  });

  return (
    <div
      style={{
        padding: "6px 10px",
        width: `${PKG_WIDTH}px`,
        minWidth: `${PKG_WIDTH}px`,
        maxWidth: `${PKG_WIDTH}px`,
        height: `${PKG_HEIGHT}px`,
        boxSizing: "border-box",
        background: selected || isHovered ? "var(--accent)" : isDirectImport ? "var(--hover-bg)" : "var(--paper)",
        color: selected || isHovered ? "#11100F" : "var(--ink)",
        border: selected || isHovered ? "1.5px solid var(--ink)" : isDirectImport ? "1.5px solid var(--accent)" : "1.5px dashed var(--border)",
        fontFamily: "'DM Mono', monospace",
        cursor: "pointer",
        opacity,
        transition: "opacity 0.18s ease, background 0.15s ease",
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "var(--muted)",
          width: 6,
          height: 6,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "var(--muted)",
          width: 6,
          height: 6,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", width: "100%", overflow: "hidden", pointerEvents: "none" }}>
        <Package size={12} style={{ color: "var(--muted)", flexShrink: 0, pointerEvents: "none" }} />
        <span
          style={{
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
          title={data.label}
        >
          {data.label}
        </span>
      </div>
    </div>
  );
};

// Custom Edge component for obstacle-free collision-free routing
const ObstacleFreeEdgeComponent = ({ id, style, markerEnd, data }: EdgeProps) => {
  return (
    <BaseEdge
      id={id}
      path={data?.svgPath || ""}
      style={{ ...style, pointerEvents: "none" }}
      markerEnd={markerEnd}
    />
  );
};

// Smooth Bezier S-Curve Edge with handle slot staggering & distance-adaptive curvature
const BezierCurveEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) => {
  // Apply staggered port offsets so parallel edges don't clamp into a single pixel
  const srcY = sourceY + (data?.sourceOffsetY || 0);
  const tgtY = targetY + (data?.targetOffsetY || 0);

  // Distance-adaptive curvature: shorter jumps have flatter curve; long jumps bow out gently
  const dx = Math.abs(targetX - sourceX);
  const adaptiveCurvature =
    data?.curvature ?? (dx < 320 ? 0.22 : dx < 600 ? 0.32 : 0.42);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY: srcY,
    sourcePosition,
    targetX,
    targetY: tgtY,
    targetPosition,
    curvature: adaptiveCurvature,
  });

  return <BaseEdge id={id} path={edgePath} style={{ ...style, pointerEvents: "none" }} markerEnd={markerEnd} />;
};

// Curved Subway (Rounded Orthogonal) Edge with staggered slots
const CurvedSubwayEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) => {
  const srcY = sourceY + (data?.sourceOffsetY || 0);
  const tgtY = targetY + (data?.targetOffsetY || 0);

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY: srcY,
    sourcePosition,
    targetX,
    targetY: tgtY,
    targetPosition,
    borderRadius: 20,
    offset: 16,
  });

  return <BaseEdge id={id} path={edgePath} style={{ ...style, pointerEvents: "none" }} markerEnd={markerEnd} />;
};

// Direct Straight Edge
const DirectEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return <BaseEdge id={id} path={edgePath} style={{ ...style, pointerEvents: "none" }} markerEnd={markerEnd} />;
};

const nodeTypes = {
  file: FileNodeComponent,
  package: PackageNodeComponent,
};

const edgeTypes = {
  default: BezierCurveEdgeComponent,
  bezier: BezierCurveEdgeComponent,
  smoothstep: CurvedSubwayEdgeComponent,
  obstacleFree: ObstacleFreeEdgeComponent,
  straight: DirectEdgeComponent,
};

export const AtlasCanvasInner: React.FC<AtlasCanvasProps> = ({
  graphData,
  selectedNodeId,
  onSelectNode,
  tracePathNodeIds = [],
  tracePathEdgeIds = [],
  isMobile = false,
  isTablet = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRepoRef = useRef<string | null>(null);
  const { setCenter, fitView, zoomIn, zoomOut } = useReactFlow();

  // Measure actual available viewport dimensions of the component container
  const [componentSize, setComponentSize] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const updateSize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      if (w > 0 && h > 0) {
        setComponentSize((prev) => {
          if (Math.abs(prev.width - w) > 8 || Math.abs(prev.height - h) > 8) {
            return { width: w, height: h };
          }
          return prev;
        });
      }
    };
    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  // User selected graph layout, edge curves, and density synchronized with unified Settings
  const [settings, updateSettings] = useSettings();
  const layoutMode = settings.graphLayout;
  const edgeStyle = settings.edgeStyle;
  const edgeDensity = settings.edgeDensity;

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNodeMouseEnter = useCallback((_: any, node: Node) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredNodeId((curr) => (curr === node.id ? curr : node.id));
  }, []);

  const handleNodeMouseLeave = useCallback((_: any, node: Node) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNodeId((curr) => (curr === node.id ? null : curr));
    }, 60);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectLayout = (mode: GraphLayoutMode) => {
    updateSettings({ graphLayout: mode });
    setTimeout(() => {
      fitView({ padding: isMobile ? 0.04 : 0.06, duration: 350 });
    }, 40);
  };

  const handleSelectEdgeStyle = (style: GraphEdgeStyle) => {
    updateSettings({ edgeStyle: style });
  };

  const handleSelectDensity = (density: EdgeDensityMode) => {
    updateSettings({ edgeDensity: density });
  };

  const isDevEnv =
    process.env.NODE_ENV !== "production" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.search.includes("dev=true")));

  // 1. Compute deterministic 2D layout adapted to available component viewport space
  const layoutResult = useMemo(() => {
    return computeGraphLayout(graphData.nodes, graphData.edges, layoutMode, {
      viewportWidth: componentSize.width,
      viewportHeight: componentSize.height,
      isMobile,
    });
  }, [graphData.repository.id, graphData.nodes, graphData.edges, layoutMode, componentSize.width, componentSize.height, isMobile]);

  // 2. Compute obstacle-free edge routes (preventing any overlap between cards and connection / trace lines)
  const edgeRoutes = useMemo(() => {
    return computeObstacleFreeEdgeRoutes(
      graphData.nodes,
      graphData.edges,
      layoutResult.positions
    );
  }, [graphData.nodes, graphData.edges, layoutResult.positions]);

  // 3. Compute dynamic architecture focus (identifies entry point & core region without hardcoding)
  const focusResult = useMemo(() => {
    return computeArchitectureFocus(
      graphData.nodes,
      graphData.edges,
      layoutResult.positions,
      { isMobile, containerWidth: componentSize.width, containerHeight: componentSize.height }
    );
  }, [graphData.repository.id, graphData.nodes, graphData.edges, layoutResult.positions, isMobile, componentSize.width, componentSize.height]);

  // Function to smoothly center on the architectural entrypoint at comfortable readable zoom
  const applyArchitectureFocus = useCallback(
    (animate = false) => {
      const containerW = containerRef.current?.clientWidth || componentSize.width || (isMobile ? 390 : 1200);
      const targetZoom = isMobile ? focusResult.mobileZoom : focusResult.desktopZoom;
      const leftPad = isMobile ? 32 : 48;
      const centerX = focusResult.primaryRootPos.x + (containerW / 2 - leftPad) / targetZoom;

      setCenter(centerX, focusResult.centerY, {
        zoom: targetZoom,
        duration: animate ? 400 : 0,
      });
    },
    [setCenter, focusResult, isMobile, componentSize.width]
  );

  // Compute snug fit defaultViewport for immediate initial paint without blank space
  const defaultViewport = useMemo(() => {
    const approxW = componentSize.width || (isMobile ? 390 : 1200);
    const approxH = componentSize.height || (isMobile ? 650 : 800);
    const graphW = Math.max(layoutResult.width, 100);
    const graphH = Math.max(layoutResult.height, 100);

    const fitZoom = Math.min(approxW / (graphW + 20), approxH / (graphH + 20), 1.2) * 0.98;
    const x = Math.max(0, (approxW - graphW * fitZoom) / 2);
    const y = Math.max(0, (approxH - graphH * fitZoom) / 2);

    return {
      x,
      y,
      zoom: fitZoom,
    };
  }, [layoutResult.width, layoutResult.height, isMobile, componentSize.width, componentSize.height]);

  // Initial camera alignment on mount: default view is fit graph snug without blank space
  const handleInit = useCallback(
    (_instance: ReactFlowInstance) => {
      fitView({
        padding: isMobile ? 0.02 : 0.03,
        duration: 0,
      });
      requestAnimationFrame(() => {
        fitView({
          padding: isMobile ? 0.02 : 0.03,
          duration: 0,
        });
      });
      initializedRepoRef.current = graphData.repository.id;
    },
    [fitView, isMobile, graphData.repository.id]
  );

  // Re-fit graph when analyzing a different repository
  useEffect(() => {
    if (initializedRepoRef.current && initializedRepoRef.current !== graphData.repository.id) {
      initializedRepoRef.current = graphData.repository.id;
      fitView({
        padding: isMobile ? 0.02 : 0.03,
        duration: 350,
      });
    }
  }, [graphData.repository.id, fitView, isMobile]);

  const prevSelectedIdRef = useRef<string | null>(selectedNodeId);

  // Auto-center / focus camera whenever a node is selected on small screens (mobile or tablet)
  useEffect(() => {
    if ((isMobile || isTablet) && selectedNodeId && layoutResult.positions.has(selectedNodeId)) {
      if (prevSelectedIdRef.current !== selectedNodeId) {
        prevSelectedIdRef.current = selectedNodeId;
        const pos = layoutResult.positions.get(selectedNodeId)!;
        const node = graphData.nodes.find((n) => n.id === selectedNodeId);
        const dims = node ? getNodeDimensions(node) : { width: NODE_WIDTH, height: NODE_HEIGHT };
        const centerX = pos.x + dims.width / 2;
        const centerY = pos.y + dims.height / 2;
        const targetZoom = isMobile ? 1.05 : 1.15;
        setCenter(centerX, centerY, { zoom: targetZoom, duration: 300 });
      }
    } else if (!selectedNodeId) {
      prevSelectedIdRef.current = null;
    }
  }, [selectedNodeId, isMobile, isTablet, layoutResult.positions, graphData.nodes, setCenter]);

  // Explicit user action: Focus Selected Node (or architecture entry point if none selected)
  const handleFocus = useCallback(() => {
    if (selectedNodeId && layoutResult.positions.has(selectedNodeId)) {
      const pos = layoutResult.positions.get(selectedNodeId)!;
      const node = graphData.nodes.find((n) => n.id === selectedNodeId);
      const dims = node ? getNodeDimensions(node) : { width: NODE_WIDTH, height: NODE_HEIGHT };
      const centerX = pos.x + dims.width / 2;
      const centerY = pos.y + dims.height / 2;
      const targetZoom = isMobile ? 1.05 : 1.15;

      setCenter(centerX, centerY, {
        zoom: targetZoom,
        duration: 350,
      });
    } else {
      applyArchitectureFocus(true);
    }
  }, [
    selectedNodeId,
    layoutResult.positions,
    graphData.nodes,
    isMobile,
    setCenter,
    applyArchitectureFocus,
  ]);

  // Explicit user action: Fit entire graph snug without blank space
  const handleFitGraph = useCallback(() => {
    fitView({
      padding: isMobile ? 0.02 : 0.03,
      duration: 350,
    });
  }, [fitView, isMobile]);

  // 4. Compute direct relationships for selected node or hovered node
  const { directImports, directDependents } = useMemo(() => {
    const directImports = new Set<string>();
    const directDependents = new Set<string>();
    const targetNode = hoveredNodeId || selectedNodeId;

    if (!targetNode) {
      return { directImports, directDependents };
    }

    for (const edge of graphData.edges) {
      if (edge.source === targetNode) {
        directImports.add(edge.target);
      }
      if (edge.target === targetNode) {
        directDependents.add(edge.source);
      }
    }

    return { directImports, directDependents };
  }, [graphData.edges, selectedNodeId, hoveredNodeId]);

  // 5. Prepare nodes and edges with interactive selection, trace highlighting, and obstacle-free routing
  const { initialNodes, initialEdges } = useMemo(() => {
    const traceNodeSet = new Set(tracePathNodeIds);
    const traceEdgeSet = new Set(tracePathEdgeIds);
    const hasSelection = selectedNodeId !== null;
    const hasTrace = traceNodeSet.size > 0;
    const hasHover = hoveredNodeId !== null;

    // Group incoming and outgoing edges per node to calculate port slot staggering
    const incomingPerNode = new Map<string, string[]>();
    const outgoingPerNode = new Map<string, string[]>();

    for (const e of graphData.edges) {
      if (!incomingPerNode.has(e.target)) incomingPerNode.set(e.target, []);
      incomingPerNode.get(e.target)!.push(e.id);

      if (!outgoingPerNode.has(e.source)) outgoingPerNode.set(e.source, []);
      outgoingPerNode.get(e.source)!.push(e.id);
    }

    // Sort edges in each slot deterministically by Y-position to prevent lines crossing as they land
    for (const [, edgeIds] of incomingPerNode.entries()) {
      edgeIds.sort((ea, eb) => {
        const edgeA = graphData.edges.find((e) => e.id === ea);
        const edgeB = graphData.edges.find((e) => e.id === eb);
        const yA = edgeA ? layoutResult.positions.get(edgeA.source)?.y || 0 : 0;
        const yB = edgeB ? layoutResult.positions.get(edgeB.source)?.y || 0 : 0;
        return yA - yB;
      });
    }

    for (const [, edgeIds] of outgoingPerNode.entries()) {
      edgeIds.sort((ea, eb) => {
        const edgeA = graphData.edges.find((e) => e.id === ea);
        const edgeB = graphData.edges.find((e) => e.id === eb);
        const yA = edgeA ? layoutResult.positions.get(edgeA.target)?.y || 0 : 0;
        const yB = edgeB ? layoutResult.positions.get(edgeB.target)?.y || 0 : 0;
        return yA - yB;
      });
    }

    const flowNodes: Node[] = graphData.nodes.map((node) => {
      const pos = layoutResult.positions.get(node.id) || { x: 50, y: 60, depth: 0 };
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const isTrace = traceNodeSet.has(node.id);
      const traceStep = isTrace ? tracePathNodeIds.indexOf(node.id) + 1 : undefined;

      const isDirectImport = directImports.has(node.id);
      const isDirectDependent = directDependents.has(node.id);

      // Node is dimmed if another node is selected or trace is active and this node is unrelated
      const isDimmed =
        (hasSelection || hasTrace || hasHover) &&
        !isSelected &&
        !isHovered &&
        !isTrace &&
        !isDirectImport &&
        !isDirectDependent;

      return {
        id: node.id,
        type: node.type,
        position: { x: pos.x, y: pos.y },
        data: {
          label: node.label,
          path: node.path,
          lineCount: node.lineCount,
          exportsCount: node.exports?.length,
          incomingCount: (incomingPerNode.get(node.id) || []).length,
          outgoingCount: (outgoingPerNode.get(node.id) || []).length,
          isTrace,
          traceStep,
          isDimmed,
          isDirectImport,
          isDirectDependent,
          isHovered,
        },
        selected: isSelected,
      };
    });

    const flowEdges: Edge[] = [];

    for (const edge of graphData.edges) {
      const isTraceEdge = traceEdgeSet.has(edge.id);
      const isConnectedToSelected =
        hasSelection && (edge.source === selectedNodeId || edge.target === selectedNodeId);
      const isConnectedToHovered =
        hasHover && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);

      const { strokeColor, strokeWidth, opacity, animated, showMarker } = computeEdgeVisuals({
        isTraceEdge,
        isConnectedToSelected,
        isConnectedToHovered,
        hasSelection,
        hasTrace,
        hasHover,
        densityMode: edgeDensity,
      });

      // Filter out hidden edges in focus mode
      if (opacity <= 0) {
        continue;
      }

      const route = edgeRoutes.get(edge.id);

      // Calculate staggered port offsets
      const inList = incomingPerNode.get(edge.target) || [];
      const inIdx = inList.indexOf(edge.id);
      const inCount = inList.length;
      let targetOffsetY = 0;
      const isTargetPkg = edge.target.startsWith("pkg:") || edge.target.includes(":pkg:");
      const maxInSpread = isTargetPkg ? Math.min(8, inCount * 1.5) : Math.min(22, inCount * 3.5);
      if (inCount > 1) {
        targetOffsetY = -maxInSpread + (inIdx / (inCount - 1)) * (maxInSpread * 2);
      }

      const outList = outgoingPerNode.get(edge.source) || [];
      const outIdx = outList.indexOf(edge.id);
      const outCount = outList.length;
      let sourceOffsetY = 0;
      if (outCount > 1) {
        const maxSpread = Math.min(22, outCount * 3.5);
        sourceOffsetY = -maxSpread + (outIdx / (outCount - 1)) * (maxSpread * 2);
      }

      flowEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeStyle === "bezier" ? "default" : edgeStyle,
        data: {
          svgPath: route?.svgPath || "",
          sourceOffsetY,
          targetOffsetY,
        },
        animated,
        className: isTraceEdge ? "highlighted" : "",
        zIndex: isTraceEdge ? 10 : isConnectedToSelected || isConnectedToHovered ? 5 : 1,
        markerEnd: showMarker
          ? {
              type: MarkerType.ArrowClosed,
              color: strokeColor,
              width: isTraceEdge ? 16 : isConnectedToSelected || isConnectedToHovered ? 12 : 9,
              height: isTraceEdge ? 16 : isConnectedToSelected || isConnectedToHovered ? 12 : 9,
            }
          : undefined,
        style: {
          stroke: strokeColor,
          strokeWidth,
          opacity,
          pointerEvents: "none",
          transition: "opacity 0.2s ease, stroke 0.2s ease",
        },
      });
    }

    return { initialNodes: flowNodes, initialEdges: flowEdges };
  }, [
    graphData.nodes,
    graphData.edges,
    layoutResult,
    edgeRoutes,
    edgeStyle,
    edgeDensity,
    selectedNodeId,
    hoveredNodeId,
    tracePathNodeIds,
    tracePathEdgeIds,
    directImports,
    directDependents,
  ]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
      if ((isMobile || isTablet) && layoutResult.positions.has(node.id)) {
        const pos = layoutResult.positions.get(node.id)!;
        const fullNode = graphData.nodes.find((n) => n.id === node.id);
        const dims = fullNode ? getNodeDimensions(fullNode) : { width: NODE_WIDTH, height: NODE_HEIGHT };
        const centerX = pos.x + dims.width / 2;
        const centerY = pos.y + dims.height / 2;
        const targetZoom = isMobile ? 1.05 : 1.15;
        setCenter(centerX, centerY, { zoom: targetZoom, duration: 300 });
      }
    },
    [onSelectNode, isMobile, isTablet, layoutResult.positions, graphData.nodes, setCenter]
  );

  const handleFlowError = useCallback((id: string, message: string) => {
    // Suppress harmless edge fallback warning #011 and HMR type-identity warning #002
    if (id === "011" || id === "002") return;
    console.warn(`[React Flow]: ${message}`);
  }, []);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const memoizedEdgeTypes = useMemo(() => edgeTypes, []);

  const FlowComponent: React.ComponentType<any> = ReactFlow as any;

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, height: "100%", width: "100%", position: "relative", minHeight: 0 }}
    >
      <FlowComponent
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
        onError={handleFlowError}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onInit={handleInit}
        defaultViewport={defaultViewport}
        fitView={false}
        minZoom={0.08}
        maxZoom={2.5}
        zoomOnPinch={true}
        zoomOnScroll={true}
        panOnDrag={true}
        style={{ width: "100%", height: "100%" }}
      >
        <Background gap={18} size={1} color="var(--border)" />

        {/* Dedicated Atlas Camera Controls (Focus Architecture / Fit Graph / Zoom) */}
        <Panel
          position={isMobile || isTablet ? "bottom-right" : "bottom-left"}
          style={
            isMobile || isTablet
              ? { marginBottom: isMobile ? "12px" : "16px", marginRight: isMobile ? "12px" : "16px" }
              : { marginBottom: "16px", marginLeft: "16px" }
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "4px",
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              padding: "4px",
              boxShadow: "2px 2px 0px rgba(0,0,0,0.15)",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={handleFocus}
              title={selectedNodeId ? "Focus Selected Node" : "Focus Architecture"}
              aria-label={selectedNodeId ? "Focus Selected Node" : "Focus Architecture"}
              style={{
                background: selectedNodeId ? "var(--accent)" : "var(--white)",
                color: selectedNodeId ? "#11100F" : "var(--ink)",
                border: "1px solid var(--border)",
                padding: "0 10px",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                height: "34px",
                minHeight: "34px",
                boxSizing: "border-box",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <Focus size={13} />
              <span>FOCUS</span>
            </button>
            <button
              type="button"
              onClick={handleFitGraph}
              title="Fit Entire Graph"
              aria-label="Fit Graph"
              style={{
                background: "var(--white)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                padding: "0 10px",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                height: "34px",
                minHeight: "34px",
                boxSizing: "border-box",
              }}
            >
              <Maximize2 size={13} />
              <span>FIT GRAPH</span>
            </button>
            <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => zoomIn({ duration: 200 })}
                title="Zoom In"
                aria-label="Zoom In"
                style={{
                  background: "var(--white)",
                  color: "var(--ink)",
                  border: "1px solid var(--border)",
                  padding: "0 8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  height: "34px",
                  minHeight: "34px",
                  minWidth: "32px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => zoomOut({ duration: 200 })}
                title="Zoom Out"
                aria-label="Zoom Out"
                style={{
                  background: "var(--white)",
                  color: "var(--ink)",
                  border: "1px solid var(--border)",
                  padding: "0 8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  height: "34px",
                  minHeight: "34px",
                  minWidth: "32px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                −
              </button>
            </div>
          </div>
        </Panel>
      </FlowComponent>

      {/* Atlas header indicator */}
      <div
        className="font-mono"
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          background: "var(--paper)",
          border: "1px solid var(--border)",
          padding: "4px 8px",
          fontSize: isMobile ? "10px" : "11px",
          display: "flex",
          gap: isMobile ? "6px" : "12px",
          flexWrap: "wrap",
          pointerEvents: "none",
          zIndex: 10,
          maxWidth: "calc(100% - 24px)",
        }}
      >
        <span>
          MAP: <strong>{graphData.stats.totalFiles} FILES</strong>
        </span>
        <span>
          <strong>{graphData.stats.totalPackages} PKGS</strong>
        </span>
        <span>
          <strong>{graphData.stats.totalImports} EDGES</strong>
        </span>
        {tracePathNodeIds.length > 0 && (
          <span style={{ color: "var(--ink)", background: "var(--accent)", padding: "0 4px" }}>
            TRACE: {tracePathNodeIds.length} STEPS
          </span>
        )}
      </div>

      {/* Unified Non-Overlapping Graph Controls Cluster (Custom Select Modules) */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          maxWidth: isMobile ? "calc(100% - 24px)" : "calc(100% - 280px)",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {/* Anti-Clutter Edge Visibility Quick Select */}
        <CustomSelect<EdgeDensityMode>
          labelPrefix="EDGES:"
          value={edgeDensity}
          options={EDGE_DENSITY_OPTIONS}
          onChange={handleSelectDensity}
          ariaLabel="Edge Visibility Mode"
          compact={isMobile}
        />
      </div>
    </div>
  );
};

export const AtlasCanvas: React.FC<AtlasCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <AtlasCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
