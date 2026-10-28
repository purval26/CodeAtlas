"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GraphData, TraceFlowResult } from "@/types";
import { fetchTraceFlow } from "@/utils/api";
import {
  X,
  GitFork,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Compass,
  RefreshCw,
} from "lucide-react";

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
  const [traceResult, setTraceResult] = useState<TraceFlowResult | null>(null);

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

  const handleCompute = async (overrideStart?: string, overrideEnd?: string) => {
    const sId = overrideStart || startId;
    const eId = overrideEnd || endId;
    if (!sId || !eId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetchTraceFlow(graphData.repository.id, sId, eId);
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

  const handleSwap = () => {
    const newStart = endId;
    const newEnd = startId;
    setStartId(newStart);
    setEndId(newEnd);
    if (newStart && newEnd) {
      handleCompute(newStart, newEnd);
    }
  };

  const handleSetGoldenDemo = () => {
    const loginNode = graphData.nodes.find((n) => n.path?.includes("Login"));
    const protectedNode = graphData.nodes.find((n) => n.path?.includes("ProtectedRoute"));
    if (loginNode && protectedNode) {
      setStartId(loginNode.id);
      setEndId(protectedNode.id);
      handleCompute(loginNode.id, protectedNode.id);
    }
  };

  const fileNodes = graphData.nodes.filter((n) => n.type === "file");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
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
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 8 }}
        transition={{ type: "spring", damping: 32, stiffness: 420 }}
        style={{
          width: "100%",
          maxWidth: "680px",
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
            style={{ padding: "6px 12px", height: "36px", minHeight: "36px", fontSize: "12px", boxSizing: "border-box" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <div className="touch-pan-y" style={{ padding: "18px", overflowY: "auto", flex: 1 }}>
          {/* Quick preset for golden demo */}
          <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSetGoldenDemo}
              style={{ fontSize: "11px", padding: "6px 12px", height: "36px", minHeight: "36px", boxSizing: "border-box" }}
            >
              <Compass size={13} />
              <span>PRESET: LOGIN → PROTECTED ROUTE</span>
            </button>
            <button
              type="button"
              onClick={handleSwap}
              disabled={!startId || !endId}
              style={{ fontSize: "11px", padding: "6px 12px", height: "36px", minHeight: "36px", boxSizing: "border-box" }}
              title="Swap start and end nodes"
            >
              <RefreshCw size={13} />
              <span>SWAP DIRECTION</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
                style={{ width: "100%", padding: "10px", height: "44px", minHeight: "44px", boxSizing: "border-box" }}
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
                style={{ width: "100%", padding: "10px", height: "44px", minHeight: "44px", boxSizing: "border-box" }}
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
              onClick={() => handleCompute()}
              className="btn-primary"
              disabled={loading || !startId || !endId}
              style={{ width: "100%", height: "44px", minHeight: "44px", boxSizing: "border-box" }}
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
                  {/* Status & Hop Count Badge */}
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle size={15} style={{ color: "#34C759" }} />
                      <span style={{ color: "var(--ink)", fontWeight: 800 }}>
                        FOUND PATH ({traceResult.readableSteps.length} NODES, {traceResult.hops?.length || 0} HOPS)
                      </span>
                    </div>
                  </div>

                  {/* High-level Summary Banner */}
                  {traceResult.summary && (
                    <div
                      style={{
                        background: "var(--paper)",
                        border: "1px solid var(--border)",
                        padding: "10px 12px",
                        fontSize: "12px",
                        lineHeight: "1.45",
                        marginBottom: "16px",
                        color: "var(--ink)",
                      }}
                    >
                      <div
                        className="font-mono"
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          color: "var(--muted)",
                          letterSpacing: "0.05em",
                          marginBottom: "4px",
                        }}
                      >
                        TRACE SUMMARY:
                      </div>
                      <div className="font-mono" style={{ fontSize: "11px", color: "var(--ink)" }}>
                        {traceResult.summary}
                      </div>
                    </div>
                  )}

                  {/* Detailed Hop-by-Hop Breakdown (WHAT & WHERE) */}
                  {traceResult.hops && traceResult.hops.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "var(--muted)",
                          marginBottom: "8px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        STEP-BY-STEP DEPENDENCY CHAIN:
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {traceResult.hops.map((hop, idx) => (
                          <div
                            key={idx}
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--paper)",
                              padding: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            {/* Hop header: number, transition, line badge */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  className="font-mono"
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 800,
                                    background: "var(--accent)",
                                    color: "#111",
                                    padding: "2px 6px",
                                  }}
                                >
                                  HOP #{idx + 1}
                                </span>
                                <span className="font-mono" style={{ fontSize: "12px", fontWeight: 700 }}>
                                  {hop.fromLabel}{" "}
                                  <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle", margin: "0 2px" }} />{" "}
                                  {hop.toLabel}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {hop.line && (
                                  <span
                                    className="font-mono"
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      color: "#0066CC",
                                      background: "rgba(0, 102, 204, 0.1)",
                                      padding: "2px 6px",
                                      border: "1px solid rgba(0, 102, 204, 0.25)",
                                    }}
                                  >
                                    Line {hop.line}
                                  </span>
                                )}
                                {hop.isTypeOnly && (
                                  <span
                                    className="font-mono"
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      color: "var(--muted)",
                                      background: "var(--white)",
                                      padding: "2px 6px",
                                      border: "1px solid var(--border)",
                                    }}
                                  >
                                    type-only
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* WHERE: exact file path */}
                            <div
                              className="font-mono"
                              style={{
                                fontSize: "11px",
                                color: "var(--muted)",
                                wordBreak: "break-all",
                              }}
                            >
                              <div>
                                <span style={{ opacity: 0.7 }}>From: </span>
                                <span style={{ color: "var(--ink)", fontWeight: 600 }}>{hop.fromPath || hop.fromLabel}</span>
                              </div>
                              <div>
                                <span style={{ opacity: 0.7 }}>To: </span>
                                <span style={{ color: "var(--ink)", fontWeight: 600 }}>{hop.toPath || hop.specifier || hop.toLabel}</span>
                              </div>
                            </div>

                            {/* WHAT: imported symbols */}
                            {hop.importedSymbols && hop.importedSymbols.length > 0 && (
                              <div>
                                <div
                                  className="font-mono"
                                  style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}
                                >
                                  IMPORTED SYMBOLS:
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {hop.importedSymbols.map((sym, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="font-mono"
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        background: "var(--white)",
                                        border: "1px solid var(--border)",
                                        padding: "1px 6px",
                                        color: "var(--ink)",
                                      }}
                                    >
                                      {sym}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Code snippet showing the exact statement */}
                            {hop.codeSnippet && (
                              <div>
                                <div
                                  className="font-mono"
                                  style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}
                                >
                                  CODE STATEMENT (WHERE):
                                </div>
                                <pre
                                  className="font-mono"
                                  style={{
                                    margin: 0,
                                    padding: "8px 10px",
                                    background: "#1E1E1E",
                                    color: "#D4D4D4",
                                    fontSize: "11px",
                                    overflowX: "auto",
                                    border: "1px solid #333",
                                    lineHeight: "1.4",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  <code>{hop.codeSnippet}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                    NO FORWARD DEPENDENCY PATH FOUND
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink)", marginTop: "6px" }}>
                    {traceResult.summary || "There is no direct or indirect import chain connecting these two files."}
                  </div>

                  {traceResult.reverseFound && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px",
                        background: "var(--white)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleSwap}
                        className="btn-primary"
                        style={{ width: "100%", minHeight: "38px", fontSize: "11px" }}
                      >
                        <RefreshCw size={13} />
                        <span>SWAP DIRECTION & TRACE REVERSE FLOW</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
