"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { LandingHero, GOLDEN_DEMO_REPO_URL } from "@/components/LandingHero";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { FileExplorer } from "@/components/FileExplorer";
import { AtlasCanvas } from "@/components/AtlasCanvas";
import { FileInspector } from "@/components/FileInspector";
import { CodeViewer } from "@/components/CodeViewer";
import { AskCodeAtlas } from "@/components/AskCodeAtlas";
import { TraceFlowModal } from "@/components/TraceFlowModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useBreakpoint } from "@/utils/useBreakpoint";
import {
  AnalysisJob,
  GraphData,
  CodeFile,
  CodeSymbol,
  AuthUser,
  AskedQuestionSessionItem,
} from "@/types";
import { Folder, Info, GitFork, MessageSquare, FileText } from "lucide-react";

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [activeJob, setActiveJob] = useState<AnalysisJob | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Responsive breakpoints
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Mobile Drawers & Sheets
  const [isMobileExplorerOpen, setIsMobileExplorerOpen] = useState(false);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);

  // Tablet Toggles
  const [isTabletExplorerOpen, setIsTabletExplorerOpen] = useState(false);
  const [isTabletInspectorOpen, setIsTabletInspectorOpen] = useState(false);

  // Modals & Panels
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  // Session persistence for asked questions
  const [sessionAskedQuestions, setSessionAskedQuestions] = useState<AskedQuestionSessionItem[]>([]);
  const [activeSessionQuestionId, setActiveSessionQuestionId] = useState<string | null>(null);
  const [traceStartId, setTraceStartId] = useState<string | null>(null);
  const [traceEndId, setTraceEndId] = useState<string | null>(null);

  const [activeFile, setActiveFile] = useState<{
    file: CodeFile;
    symbols: CodeSymbol[];
    targetLineRange?: { startLine: number; endLine: number } | null;
  } | null>(null);

  // Active Trace Flow highlighting
  const [tracePathNodeIds, setTracePathNodeIds] = useState<string[]>([]);
  const [tracePathEdgeIds, setTracePathEdgeIds] = useState<string[]>([]);

  const [landingError, setLandingError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Authentication state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [oauthConfigured, setOauthConfigured] = useState(false);

  // Sync theme
  useEffect(() => {
    const saved = localStorage.getItem("codeatlas_theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("codeatlas_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("codeatlas_theme", "light");
      }
      return next;
    });
  };

  // Load auth status
  useEffect(() => {
    fetch("/api/auth/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAuthUser(data.user);
          setOauthConfigured(data.oauthConfigured);
        }
      })
      .catch((err) => {
        console.error("Failed to load auth status:", err);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleReset = () => {
    setActiveJob(null);
    setGraphData(null);
    setSelectedNodeId(null);
    setTracePathNodeIds([]);
    setTracePathEdgeIds([]);
    setActiveFile(null);
    setIsAskOpen(false);
    setIsTraceOpen(false);
    setIsMobileExplorerOpen(false);
    setIsMobileInspectorOpen(false);
    setIsAnalyzing(false);
    setLandingError(null);
  };

  const handleAnalyze = async (url: string) => {
    setLandingError(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to start repository analysis.");
      }

      const initialJob: AnalysisJob = {
        id: data.jobId,
        status: data.status || "queued",
        progress: data.progress || 5,
        stage: data.stage || "01 FETCH REPOSITORY: Initializing...",
        url,
        createdAt: new Date().toISOString(),
      };
      setActiveJob(initialJob);
    } catch (err: unknown) {
      setIsAnalyzing(false);
      const msg = err instanceof Error ? err.message : "Error analyzing repository.";
      setLandingError(msg);
      setActiveJob(null);
    }
  };

  // Live polling for actual analysis job progress
  useEffect(() => {
    if (!activeJob || activeJob.status === "completed" || activeJob.status === "failed") {
      setIsAnalyzing(false);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const jobId = activeJob.id;
        const res = await fetch(`/api/analyze/${jobId}`);
        if (!res.ok) return;

        const updatedJob: AnalysisJob = await res.json();
        setActiveJob(updatedJob);

        if (updatedJob.status === "completed" && updatedJob.repositoryId) {
          clearInterval(interval);
          setIsAnalyzing(false);

          // Fetch deterministic graph data
          const graphRes = await fetch(`/api/graph/${updatedJob.repositoryId}`);
          if (graphRes.ok) {
            const graph: GraphData = await graphRes.json();
            if (!graph.nodes || graph.nodes.length === 0) {
              setLandingError("No supported code files were detected in this repository.");
              setActiveJob(null);
            } else {
              setGraphData(graph);

              // Select first file node by default
              const firstFile = graph.nodes.find((n) => n.type === "file");
              if (firstFile) {
                setSelectedNodeId(firstFile.id);
                setTraceStartId(firstFile.id);
              }
            }
          } else {
            const errData = await graphRes.json().catch(() => ({}));
            setLandingError(errData.message || "Failed to load repository graph data.");
            setActiveJob(null);
          }
        } else if (updatedJob.status === "failed") {
          clearInterval(interval);
          setIsAnalyzing(false);
          setLandingError(updatedJob.error || "Analysis failed.");
          setActiveJob(null);
        }
      } catch (pollErr) {
        console.error("Job poll error:", pollErr);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  // Open file source in viewer
  const handleOpenSource = useCallback(
    async (filePath: string, targetLineRange?: { startLine: number; endLine: number } | null) => {
      if (!graphData) return;
      try {
        const res = await fetch(`/api/repository/${graphData.repository.id}/file?path=${encodeURIComponent(filePath)}`);
        if (!res.ok) return;
        const data = await res.json();
        setActiveFile({
          file: data.file,
          symbols: data.symbols,
          targetLineRange: targetLineRange || null,
        });
      } catch (err) {
        console.error("Failed to load file source:", err);
      }
    },
    [graphData]
  );

  // Jump from AI citation to exact lines in CodeViewer
  const handleOpenCitation = useCallback(
    (filePath: string, startLine: number, endLine: number) => {
      handleOpenSource(filePath, { startLine, endLine });
    },
    [handleOpenSource]
  );

  const selectedNode =
    graphData?.nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <ErrorBoundary>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          width: "100vw",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Header
          repository={graphData?.repository || null}
          onReset={handleReset}
          onLoadDemo={() => handleAnalyze(GOLDEN_DEMO_REPO_URL)}
          onOpenAsk={() => setIsAskOpen(true)}
          onOpenTrace={() => {
            setTraceStartId(selectedNodeId);
            setIsTraceOpen(true);
          }}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          isMobile={isMobile}
          authUser={authUser}
          oauthConfigured={oauthConfigured}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            minHeight: 0,
            width: "100%",
          }}
        >
          {!activeJob && !graphData && (
            <LandingHero
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
              error={landingError}
              authUser={authUser}
              oauthConfigured={oauthConfigured}
            />
          )}

          {activeJob && activeJob.status !== "completed" && (
            <AnalysisProgress
              job={activeJob}
              onRetry={() => {
                if (activeJob.url) {
                  handleAnalyze(activeJob.url);
                }
              }}
            />
          )}

          {graphData && (
            <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", minHeight: 0 }}>
              {/* DESKTOP LAYOUT (>= 1100px): Explorer + Atlas + Inspector */}
              {isDesktop && (
                <>
                  <FileExplorer
                    nodes={graphData.nodes}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={(id) => setSelectedNodeId(id)}
                  />

                  <AtlasCanvas
                    graphData={graphData}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={(id) => setSelectedNodeId(id)}
                    tracePathNodeIds={tracePathNodeIds}
                    tracePathEdgeIds={tracePathEdgeIds}
                  />

                  <FileInspector
                    selectedNode={selectedNode}
                    graphData={graphData}
                    onSelectNode={(id) => setSelectedNodeId(id)}
                    onOpenSource={(path) => handleOpenSource(path)}
                    onStartTrace={(id) => {
                      setTraceStartId(id);
                      setIsTraceOpen(true);
                    }}
                    onEndTrace={(id) => {
                      setTraceEndId(id);
                      setIsTraceOpen(true);
                    }}
                  />
                </>
              )}

              {/* TABLET LAYOUT (768px - 1099px): Atlas primary + Collapsible Explorer + Drawer Inspector */}
              {isTablet && (
                <>
                  {isTabletExplorerOpen && (
                    <div style={{ width: "260px", height: "100%", zIndex: 20 }}>
                      <FileExplorer
                        nodes={graphData.nodes}
                        selectedNodeId={selectedNodeId}
                        onSelectNode={(id) => setSelectedNodeId(id)}
                        onClose={() => setIsTabletExplorerOpen(false)}
                        isMobileDrawer={false}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, height: "100%", width: "100%", position: "relative", minHeight: 0 }}>
                    <AtlasCanvas
                      graphData={graphData}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={(id) => setSelectedNodeId(id)}
                      tracePathNodeIds={tracePathNodeIds}
                      tracePathEdgeIds={tracePathEdgeIds}
                    />

                    {/* Tablet Quick Toggle Pills */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "16px",
                        left: "16px",
                        display: "flex",
                        gap: "8px",
                        zIndex: 30,
                      }}
                    >
                      <button
                        onClick={() => setIsTabletExplorerOpen((v) => !v)}
                        style={{
                          background: isTabletExplorerOpen ? "var(--accent)" : "var(--paper)",
                          color: isTabletExplorerOpen ? "#11100F" : "var(--ink)",
                          minHeight: "36px",
                          padding: "6px 12px",
                          fontSize: "11px",
                        }}
                      >
                        <Folder size={13} />
                        <span>{isTabletExplorerOpen ? "HIDE FILES" : "FILES"}</span>
                      </button>
                      <button
                        onClick={() => setIsTabletInspectorOpen((v) => !v)}
                        style={{
                          background: isTabletInspectorOpen ? "var(--accent)" : "var(--paper)",
                          color: isTabletInspectorOpen ? "#11100F" : "var(--ink)",
                          minHeight: "36px",
                          padding: "6px 12px",
                          fontSize: "11px",
                        }}
                      >
                        <Info size={13} />
                        <span>{isTabletInspectorOpen ? "HIDE DETAILS" : "INSPECT"}</span>
                      </button>
                    </div>
                  </div>

                  {isTabletInspectorOpen && (
                    <div style={{ width: "300px", height: "100%", zIndex: 20 }}>
                      <FileInspector
                        selectedNode={selectedNode}
                        graphData={graphData}
                        onSelectNode={(id) => setSelectedNodeId(id)}
                        onOpenSource={(path) => handleOpenSource(path)}
                        onStartTrace={(id) => {
                          setTraceStartId(id);
                          setIsTraceOpen(true);
                        }}
                        onEndTrace={(id) => {
                          setTraceEndId(id);
                          setIsTraceOpen(true);
                        }}
                        onClose={() => setIsTabletInspectorOpen(false)}
                        isMobileSheet={false}
                      />
                    </div>
                  )}
                </>
              )}

              {/* MOBILE LAYOUT (< 768px): Atlas primary + context bar + dock + drawers */}
              {isMobile && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    minHeight: 0,
                  }}
                >
                  <div style={{ flex: 1, position: "relative", minHeight: 0, width: "100%", height: "100%" }}>
                    <AtlasCanvas
                      graphData={graphData}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={(id) => setSelectedNodeId(id)}
                      tracePathNodeIds={tracePathNodeIds}
                      tracePathEdgeIds={tracePathEdgeIds}
                      isMobile={true}
                    />
                  </div>

                  {/* Context Bar */}
                  <div
                    style={{
                      background: "var(--paper)",
                      borderTop: "1.5px solid var(--border)",
                      borderBottom: "1.5px solid var(--border)",
                      padding: "8px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      zIndex: 25,
                    }}
                  >
                    {selectedNode ? (
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={selectedNode.label}
                        >
                          {selectedNode.label}
                        </div>
                        <div
                          className="font-mono"
                          style={{ fontSize: "10px", color: "var(--muted)", marginTop: "1px" }}
                        >
                          {selectedNode.type.toUpperCase()} ·{" "}
                          {selectedNode.lineCount !== undefined ? `${selectedNode.lineCount} L · ` : ""}
                          {selectedNode.exports ? `${selectedNode.exports.length} EXP` : ""}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="font-mono"
                        style={{ fontSize: "11px", color: "var(--muted)" }}
                      >
                        Tap any node on Atlas to inspect
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      {selectedNode?.path && (
                        <button
                          onClick={() => handleOpenSource(selectedNode.path!)}
                          style={{
                            padding: "4px 8px",
                            minHeight: "34px",
                            fontSize: "11px",
                          }}
                        >
                          <FileText size={12} />
                          <span>SRC</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsMobileInspectorOpen(true)}
                        className={selectedNode ? "btn-primary" : ""}
                        style={{
                          padding: "4px 10px",
                          minHeight: "34px",
                          fontSize: "11px",
                        }}
                      >
                        <Info size={12} />
                        <span>INFO</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Dock */}
                  <nav
                    aria-label="Mobile Navigation"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      borderTop: "1px solid var(--border)",
                      background: "var(--white)",
                      zIndex: 30,
                      paddingBottom: "max(6px, var(--sab))",
                    }}
                  >
                    <button
                      onClick={() => setIsMobileExplorerOpen(true)}
                      style={{
                        border: "none",
                        borderRight: "1px solid var(--border)",
                        minHeight: "48px",
                        flexDirection: "column",
                        padding: "6px 2px",
                        gap: "2px",
                        fontSize: "10px",
                      }}
                    >
                      <Folder size={16} />
                      <span>FILES</span>
                    </button>

                    <button
                      onClick={() => setIsMobileInspectorOpen(true)}
                      style={{
                        border: "none",
                        borderRight: "1px solid var(--border)",
                        minHeight: "48px",
                        flexDirection: "column",
                        padding: "6px 2px",
                        gap: "2px",
                        fontSize: "10px",
                      }}
                    >
                      <Info size={16} />
                      <span>INSPECT</span>
                    </button>

                    <button
                      onClick={() => {
                        setTraceStartId(selectedNodeId);
                        setIsTraceOpen(true);
                      }}
                      style={{
                        border: "none",
                        borderRight: "1px solid var(--border)",
                        minHeight: "48px",
                        flexDirection: "column",
                        padding: "6px 2px",
                        gap: "2px",
                        fontSize: "10px",
                      }}
                    >
                      <GitFork size={16} />
                      <span>TRACE</span>
                    </button>

                    <button
                      onClick={() => setIsAskOpen(true)}
                      className="btn-primary"
                      style={{
                        border: "none",
                        minHeight: "48px",
                        flexDirection: "column",
                        padding: "6px 2px",
                        gap: "2px",
                        fontSize: "10px",
                      }}
                    >
                      <MessageSquare size={16} />
                      <span>ASK</span>
                    </button>
                  </nav>

                  {/* Mobile Left Drawer */}
                  {isMobileExplorerOpen && (
                    <>
                      <div
                        className="mobile-backdrop"
                        onClick={() => setIsMobileExplorerOpen(false)}
                      />
                      <div className="mobile-drawer-left">
                        <FileExplorer
                          nodes={graphData.nodes}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={(id) => {
                            setSelectedNodeId(id);
                            setIsMobileExplorerOpen(false);
                          }}
                          onClose={() => setIsMobileExplorerOpen(false)}
                          isMobileDrawer={true}
                        />
                      </div>
                    </>
                  )}

                  {/* Mobile Bottom Sheet */}
                  {isMobileInspectorOpen && (
                    <>
                      <div
                        className="mobile-backdrop"
                        onClick={() => setIsMobileInspectorOpen(false)}
                      />
                      <div className="mobile-bottom-sheet">
                        <FileInspector
                          selectedNode={selectedNode}
                          graphData={graphData}
                          onSelectNode={(id) => setSelectedNodeId(id)}
                          onOpenSource={(path) => {
                            setIsMobileInspectorOpen(false);
                            handleOpenSource(path);
                          }}
                          onStartTrace={(id) => {
                            setTraceStartId(id);
                            setIsMobileInspectorOpen(false);
                            setIsTraceOpen(true);
                          }}
                          onEndTrace={(id) => {
                            setTraceEndId(id);
                            setIsMobileInspectorOpen(false);
                            setIsTraceOpen(true);
                          }}
                          onClose={() => setIsMobileInspectorOpen(false)}
                          isMobileSheet={true}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Code Viewer Modal */}
        {activeFile && (
          <CodeViewer
            file={activeFile.file}
            symbols={activeFile.symbols}
            targetLineRange={activeFile.targetLineRange}
            onClose={() => setActiveFile(null)}
            onNavigateToFile={(targetPath) => handleOpenSource(targetPath)}
            knownFilePaths={
              graphData?.nodes
                .filter((n) => n.type === "file" && n.path)
                .map((n) => n.path!) || []
            }
          />
        )}

        {/* Ask CodeAtlas Modal */}
        {isAskOpen && graphData && (
          <AskCodeAtlas
            repositoryId={graphData.repository.id}
            onOpenSourceRange={handleOpenCitation}
            onTriggerTrace={(startPath?: string, endPath?: string) => {
              setIsAskOpen(false);
              if (startPath) {
                const sNode = graphData.nodes.find(
                  (n) => n.path === startPath || n.id.endsWith(`:${startPath}`)
                );
                if (sNode) setTraceStartId(sNode.id);
              } else {
                setTraceStartId(selectedNodeId);
              }
              if (endPath && endPath !== startPath) {
                const eNode = graphData.nodes.find(
                  (n) => n.path === endPath || n.id.endsWith(`:${endPath}`)
                );
                if (eNode) setTraceEndId(eNode.id);
              } else {
                setTraceEndId(null);
              }
              setIsTraceOpen(true);
            }}
            onClose={() => setIsAskOpen(false)}
            sessionHistory={sessionAskedQuestions}
            onUpdateSessionHistory={setSessionAskedQuestions}
            activeQuestionId={activeSessionQuestionId}
            onSetActiveQuestionId={setActiveSessionQuestionId}
          />
        )}

        {/* Trace Flow Modal */}
        {isTraceOpen && graphData && (
          <TraceFlowModal
            graphData={graphData}
            initialStartNodeId={traceStartId || selectedNodeId}
            initialEndNodeId={traceEndId}
            onApplyTrace={(nodeIds, edgeIds) => {
              setTracePathNodeIds(nodeIds);
              setTracePathEdgeIds(edgeIds);
            }}
            onClose={() => {
              setIsTraceOpen(false);
              setTraceEndId(null);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
