"use client";
import React, { useState, useEffect } from "react";
import { GraphData } from "@/types";
import { fetchTraceFlow } from "@/utils/api";
import { X, GitFork, ArrowRight, CheckCircle, AlertCircle, Compass } from "lucide-react";

interface TraceFlowModalProps {
  graphData: GraphData;
  initialStartNodeId?: string | null;
  initialEndNodeId?: string | null;
  onApplyTrace: (nodeIds: string[], edgeIds: string[]) => void;
  onClose: () => void;
}

export const TraceFlowModal: React.FC<TraceFlowModalProps> = ({
  graphData,
  initialStartNodeId,
  initialEndNodeId,
  onApplyTrace,
  onClose,
}) => {
  const [startId, setStartId] = useState<string>(initialStartNodeId || "");
  const [endId, setEndId] = useState<string>(initialEndNodeId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceResult, setTraceResult] = useState<{
    found: boolean;
    nodePath: string[];
    edgePath: string[];
    readableSteps: string[];
  } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Synchronize when initial props change
  useEffect(() => {
    if (initialStartNodeId) {
      setStartId(initialStartNodeId);
    }
  }, [initialStartNodeId]);

  useEffect(() => {
    if (initialEndNodeId) {
      setEndId(initialEndNodeId);
    }
  }, [initialEndNodeId]);

  // Auto-fill defaults if empty
  useEffect(() => {
    if (!startId && !endId) {
      const loginNode = graphData.nodes.find((n) => n.path?.includes("Login"));
      const protectedNode = graphData.nodes.find((n) => n.path?.includes("ProtectedRoute"));
      if (loginNode && protectedNode) {
        setStartId(loginNode.id);
        setEndId(protectedNode.id);
      } else if (graphData.nodes.length >= 2) {
        setStartId(graphData.nodes[0].id);
        setEndId(graphData.nodes[1].id);
      }
    }
  }, [graphData.nodes]);

  const handleCompute = async () => {
    if (!startId || !endId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTraceFlow(graphData.repository.id, startId, endId);
      setTraceResult(res);
      if (res.found) {
        onApplyTrace(res.nodePath, res.edgePath);
      }
    } catch (err: any) {
      setError(err.message || "Failed to calculate trace");
    } finally {
      setLoading(false);
    }
  };

  const handleSetGoldenDemo = () => {
    const loginNode = graphData.nodes.find((n) => n.path?.includes("Login"));
    const protectedNode = graphData.nodes.find((n) => n.path?.includes("ProtectedRoute"));
    if (loginNode && protectedNode) {
      setStartId(loginNode.id);
      setEndId(protectedNode.id);
    }
  };

  const fileNodes = graphData.nodes.filter((n) => n.type === "file");

  return (
    <div
      role="dialog"
      aria-label="Trace Dependency Flow"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(2px)",
        zIndex: 140,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        paddingTop: "var(--sat)",
        paddingBottom: "var(--sab)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "90dvh",
          background: "var(--paper)",
          border: "2px solid var(--border)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--white)",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <GitFork size={18} style={{ flexShrink: 0 }} />
            <div>
              <div
                className="font-mono"
                style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em" }}
              >
                SHORTEST PATH DEPENDENCY ENGINE
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800 }}>TRACE FLOW</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Trace Flow"
            style={{ padding: "6px 12px", minHeight: "36px", fontSize: "12px" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <div className="touch-pan-y" style={{ padding: "18px", overflowY: "auto", flex: 1 }}>
          {/* Quick preset for golden demo */}
          <div style={{ marginBottom: "16px" }}>
            <button
              type="button"
              onClick={handleSetGoldenDemo}
              style={{ fontSize: "11px", padding: "6px 12px", minHeight: "32px" }}
            >
              <Compass size={13} />
              <span>PRESET: LOGIN → PROTECTED ROUTE</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <div>
              <label
                className="font-mono"
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                START COMPONENT:
              </label>
              <select
                value={startId}
                onChange={(e) => setStartId(e.target.value)}
                aria-label="Start component"
                style={{ width: "100%", padding: "10px", minHeight: "44px" }}
              >
                {fileNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.path})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="font-mono"
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                END COMPONENT:
              </label>
              <select
                value={endId}
                onChange={(e) => setEndId(e.target.value)}
                aria-label="End component"
                style={{ width: "100%", padding: "10px", minHeight: "44px" }}
              >
                {fileNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.path})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <button
              onClick={handleCompute}
              className="btn-primary"
              disabled={loading || !startId || !endId}
              style={{ width: "100%", minHeight: "44px" }}
            >
              <GitFork size={14} />
              <span>{loading ? "CALCULATING..." : "TRACE FLOW"}</span>
            </button>
          </div>

          {/* Results display */}
          {error && (
            <div
              className="font-mono"
              style={{
                border: "1.5px solid #FF3B30",
                background: "rgba(255, 59, 48, 0.08)",
                padding: "12px",
                fontSize: "12px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          {traceResult && (
            <div>
              {traceResult.found ? (
                <div
                  style={{
                    border: "1.5px solid var(--border)",
                    background: "var(--white)",
                    padding: "16px",
                  }}
                >
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <CheckCircle size={14} style={{ color: "#34C759" }} />
                    <span>FOUND PATH ({traceResult.readableSteps.length} NODES)</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    {traceResult.readableSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="font-mono"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "12px",
                          padding: "8px 10px",
                          background:
                            idx === 0 || idx === traceResult.readableSteps.length - 1
                              ? "var(--accent)"
                              : "var(--paper)",
                          color:
                            idx === 0 || idx === traceResult.readableSteps.length - 1
                              ? "#11100F"
                              : "var(--ink)",
                          fontWeight: 700,
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>#{idx + 1}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {step}
                        </span>
                        {idx < traceResult.readableSteps.length - 1 && (
                          <ArrowRight size={13} style={{ marginLeft: "auto", opacity: 0.5, flexShrink: 0 }} />
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      onApplyTrace(traceResult.nodePath, traceResult.edgePath);
                      onClose();
                    }}
                    className="btn-primary"
                    style={{ width: "100%", minHeight: "44px" }}
                  >
                    <span>APPLY PATH TO ATLAS CANVAS</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    border: "1.5px solid #FF9500",
                    background: "rgba(255, 149, 0, 0.08)",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <AlertCircle size={20} style={{ color: "#FF9500", margin: "0 auto 8px" }} />
                  <div
                    className="font-mono"
                    style={{ fontSize: "12px", fontWeight: 700, color: "#FF9500" }}
                  >
                    NO DEPENDENCY PATH FOUND
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                    There is no direct import chain connecting these two files.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
