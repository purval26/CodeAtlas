"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { LandingHero, GOLDEN_DEMO_REPO_URL } from "@/components/LandingHero";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { AnalysisJob, GraphData } from "@/types";

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [activeJob, setActiveJob] = useState<AnalysisJob | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);

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

  const handleReset = () => {
    setActiveJob(null);
    setGraphData(null);
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
            setGraphData(graph);
          }
        } else if (updatedJob.status === "failed") {
          clearInterval(interval);
          setIsAnalyzing(false);
        }
      } catch (pollErr) {
        console.error("Job poll error:", pollErr);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Header
        repository={graphData?.repository || null}
        onReset={handleReset}
        onLoadDemo={() => handleAnalyze(GOLDEN_DEMO_REPO_URL)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
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
          />
        )}

        {activeJob && activeJob.status !== "completed" && (
          <AnalysisProgress
            job={activeJob}
            onRetry={() => activeJob.url && handleAnalyze(activeJob.url)}
          />
        )}

        {activeJob && activeJob.status === "completed" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 20px",
              minHeight: "calc(100dvh - 56px)",
            }}
          >
            <div
              style={{
                maxWidth: "680px",
                width: "100%",
                border: "2px solid var(--border)",
                background: "var(--white)",
                padding: "36px",
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: "12px",
                  color: "var(--accent)",
                  background: "var(--ink)",
                  padding: "4px 8px",
                  display: "inline-block",
                  fontWeight: 700,
                  marginBottom: "16px",
                }}
              >
                ANALYSIS COMPLETE ✓
              </div>

              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  marginBottom: "12px",
                  color: "var(--ink)",
                }}
              >
                {graphData?.repository.name || "Repository"} Mapped Successfully
              </h2>

              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "14px",
                  marginBottom: "24px",
                  lineHeight: 1.5,
                }}
              >
                AST dependency graph compiled deterministically. All local imports and tsconfig path aliases resolved with real source lines indexed.
              </p>

              {graphData && (
                <div
                  className="font-mono"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--paper)",
                    padding: "16px",
                    marginBottom: "24px",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>FILES</div>
                    <div style={{ fontSize: "20px", fontWeight: 800 }}>
                      {graphData.stats.totalFiles}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>PACKAGES</div>
                    <div style={{ fontSize: "20px", fontWeight: 800 }}>
                      {graphData.stats.totalPackages}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>IMPORTS</div>
                    <div style={{ fontSize: "20px", fontWeight: 800 }}>
                      {graphData.stats.totalImports}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>LINES</div>
                    <div style={{ fontSize: "20px", fontWeight: 800 }}>
                      {graphData.stats.totalLines}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-primary"
                  style={{ minHeight: "44px", padding: "8px 20px" }}
                >
                  ANALYZE ANOTHER REPOSITORY
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
