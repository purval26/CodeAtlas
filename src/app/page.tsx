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

      const newJob: AnalysisJob = {
        id: data.jobId,
        status: "fetching",
        progress: 15,
        stage: "01 FETCH REPOSITORY: Initializing...",
        url,
        createdAt: new Date().toISOString(),
      };
      setActiveJob(newJob);

      // Simulated pipeline progression matching the prototype
      const stages: { status: AnalysisJob["status"]; progress: number; stage: string }[] = [
        { status: "fetching", progress: 20, stage: "01 FETCH REPOSITORY: Cloning tree..." },
        { status: "indexing", progress: 40, stage: "02 INDEX FILES: Filtering supported JS/TS files..." },
        { status: "parsing", progress: 65, stage: "03 PARSE AST: Extracting syntax & symbols..." },
        { status: "resolving", progress: 85, stage: "04 RESOLVE DEPENDENCIES: Resolving path aliases..." },
        { status: "graphing", progress: 95, stage: "05 BUILD ATLAS: Constructing graph..." },
        { status: "completed", progress: 100, stage: "06 COMPLETE: Atlas ready" },
      ];

      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step < stages.length) {
          const s = stages[step];
          setActiveJob((prev) => (prev ? { ...prev, ...s } : null));
        } else {
          clearInterval(interval);
          setIsAnalyzing(false);
        }
      }, 950);
    } catch (err: unknown) {
      setIsAnalyzing(false);
      const msg = err instanceof Error ? err.message : "Error analyzing repository.";
      setLandingError(msg);
      setActiveJob(null);
    }
  };

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
                maxWidth: "600px",
                width: "100%",
                border: "2px solid var(--border)",
                background: "var(--white)",
                padding: "36px",
                textAlign: "center",
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
              <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>
                Repository Successfully Mapped
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "24px" }}>
                The AST dependency graph and bounded evidence index are compiled and ready.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{ minHeight: "44px", padding: "8px 20px" }}
                >
                  ANALYZE ANOTHER
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
