"use client";
import React from "react";
import { GraphData, GraphNode } from "@/types";
import { FileText, ArrowRight, ArrowLeft, Code2, Package, X } from "lucide-react";

interface FileInspectorProps {
  selectedNode: GraphNode | null;
  graphData: GraphData;
  onSelectNode: (nodeId: string) => void;
  onOpenSource: (filePath: string) => void;
  onStartTrace?: (nodeId: string) => void;
  onEndTrace?: (nodeId: string) => void;
  onClose?: () => void;
  isMobileSheet?: boolean;
}

export const FileInspector: React.FC<FileInspectorProps> = ({
  selectedNode,
  graphData,
  onSelectNode,
  onOpenSource,
  onClose,
  isMobileSheet = false,
}) => {
  const containerStyle: React.CSSProperties = {
    width: "100%",
    minWidth: isMobileSheet ? "100%" : "280px",
    maxWidth: isMobileSheet ? "100%" : "340px",
    borderLeft: isMobileSheet ? "none" : "1.5px solid var(--border)",
    background: "var(--white)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
  };

  if (!selectedNode) {
    return (
      <div
        style={{
          ...containerStyle,
          padding: "24px",
          justifyContent: "center",
          alignItems: "center",
          color: "var(--muted)",
          textAlign: "center",
        }}
      >
        <div style={{ position: "absolute", top: "12px", right: "12px" }}>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Inspector"
              style={{ padding: "4px 8px", minHeight: "32px", fontSize: "11px" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Code2 size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
        <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
          NO NODE SELECTED
        </div>
        <div style={{ fontSize: "12px" }}>
          Click any file or package node on the Atlas or explorer to inspect relationships.
        </div>
      </div>
    );
  }

  // Calculate dependencies (edges where this node is source)
  const outgoingEdges = graphData.edges.filter((e) => e.source === selectedNode.id);
  const dependencies = outgoingEdges
    .map((e) => graphData.nodes.find((n) => n.id === e.target))
    .filter(Boolean) as GraphNode[];

  // Calculate dependents (edges where this node is target)
  const incomingEdges = graphData.edges.filter((e) => e.target === selectedNode.id);
  const dependents = incomingEdges
    .map((e) => graphData.nodes.find((n) => n.id === e.source))
    .filter(Boolean) as GraphNode[];

  return (
    <div style={containerStyle} className="touch-pan-y">
      {/* Header */}
      <div
        style={{
          padding: isMobileSheet ? "16px 20px" : "16px",
          borderBottom: "1.5px solid var(--border)",
          background: "var(--paper)",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--muted)",
              letterSpacing: "0.08em",
            }}
          >
            {selectedNode.type.toUpperCase()} INSPECTOR
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Inspector"
              style={{
                padding: "0 10px",
                height: "32px",
                minHeight: "32px",
                fontSize: "11px",
                border: "1px solid var(--border)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <h3
          style={{
            fontSize: "18px",
            fontWeight: 800,
            wordBreak: "break-all",
            marginBottom: "4px",
          }}
        >
          {selectedNode.label.toUpperCase()}
        </h3>
        {selectedNode.path && (
          <div
            className="font-mono"
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              wordBreak: "break-all",
            }}
          >
            {selectedNode.path}
          </div>
        )}

        {/* Action buttons */}
        {selectedNode.path && (
          <div style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
            <button
              onClick={() => onOpenSource(selectedNode.path!)}
              className="btn-primary"
              style={{ fontSize: "11px", padding: "6px 14px", height: "36px", minHeight: "36px", width: "100%", boxSizing: "border-box" }}
            >
              <FileText size={13} />
              <span>VIEW SOURCE</span>
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          padding: isMobileSheet ? "16px 20px" : "16px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        {/* Technical Metadata */}
        {selectedNode.lineCount !== undefined && (
          <div
            className="font-mono"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "12px",
              background: "var(--paper)",
              padding: "10px 12px",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <span style={{ color: "var(--muted)" }}>LINES: </span>
              <strong>{selectedNode.lineCount}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>SIZE: </span>
              <strong>{selectedNode.size || 0} B</strong>
            </div>
          </div>
        )}

        {/* Exports */}
        {selectedNode.exports && selectedNode.exports.length > 0 && (
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                marginBottom: "8px",
                letterSpacing: "0.06em",
              }}
            >
              EXPORTS ({selectedNode.exports.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {selectedNode.exports.map((exp, i) => (
                <span
                  key={i}
                  className="font-mono"
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--border)",
                    padding: "2px 6px",
                    fontSize: "11px",
                  }}
                >
                  {exp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dependencies */}
        <div>
          <div
            className="font-mono"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              marginBottom: "8px",
              letterSpacing: "0.06em",
            }}
          >
            DEPENDENCIES ({dependencies.length})
          </div>
          {dependencies.length === 0 ? (
            <div className="font-mono" style={{ fontSize: "11px", color: "var(--muted)" }}>
              No outgoing dependencies.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {dependencies.map((dep) => (
                <div
                  key={dep.id}
                  onClick={() => onSelectNode(dep.id)}
                  className="font-mono"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    fontSize: "11px",
                    minHeight: "32px",
                    cursor: "pointer",
                    border: "1px solid var(--border)",
                    background: "var(--paper)",
                  }}
                >
                  {dep.type === "package" ? <Package size={12} /> : <FileText size={12} />}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {dep.label}
                  </span>
                  <ArrowRight size={11} style={{ opacity: 0.5 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dependents */}
        <div>
          <div
            className="font-mono"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              marginBottom: "8px",
              letterSpacing: "0.06em",
            }}
          >
            DEPENDENTS ({dependents.length})
          </div>
          {dependents.length === 0 ? (
            <div className="font-mono" style={{ fontSize: "11px", color: "var(--muted)" }}>
              No files import this directly.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {dependents.map((dep) => (
                <div
                  key={dep.id}
                  onClick={() => onSelectNode(dep.id)}
                  className="font-mono"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    fontSize: "11px",
                    minHeight: "32px",
                    cursor: "pointer",
                    border: "1px solid var(--border)",
                    background: "var(--paper)",
                  }}
                >
                  <ArrowLeft size={11} style={{ opacity: 0.5 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {dep.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Symbols */}
        {selectedNode.symbols && selectedNode.symbols.length > 0 && (
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                marginBottom: "8px",
                letterSpacing: "0.06em",
              }}
            >
              SYMBOLS ({selectedNode.symbols.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {selectedNode.symbols.map((sym) => (
                <div
                  key={sym.id}
                  className="font-mono"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    fontSize: "11px",
                    minHeight: "28px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    background: "var(--paper)",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong style={{ color: "var(--muted)" }}>{sym.kind.slice(0, 3)} </strong>
                    {sym.name}
                  </span>
                  <span style={{ color: "var(--muted)", flexShrink: 0, marginLeft: "8px" }}>
                    L{sym.startLine}–L{sym.endLine}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
