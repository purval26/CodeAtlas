"use client";

import React, { useState, useEffect } from "react";
import { parseGitHubUrl } from "@/lib/github-url";

type StageStatus = "pending" | "running" | "completed" | "failed";

interface AnalysisStage {
  id: string;
  code: string;
  name: string;
  status: StageStatus;
  description: string;
}

const INITIAL_STAGES: AnalysisStage[] = [
  { id: "fetch", code: "01", name: "FETCH REPOSITORY", status: "pending", description: "Cloning source tree and metadata from GitHub API" },
  { id: "index", code: "02", name: "INDEX FILES", status: "pending", description: "Filtering ignored paths, node_modules, build outputs and assets" },
  { id: "parse", code: "03", name: "PARSE AST", status: "pending", description: "Extracting TypeScript Compiler AST imports, exports and symbols" },
  { id: "resolve", code: "04", name: "RESOLVE DEPENDENCIES", status: "pending", description: "Resolving relative imports and tsconfig.json path aliases" },
  { id: "graph", code: "05", name: "BUILD ATLAS", status: "pending", description: "Constructing deterministic file and package dependency graph" },
  { id: "search", code: "06", name: "PREPARE SEARCH", status: "pending", description: "Indexing bounded source lines for grounded AI evidence" },
];

const PRESET_REPOS = [
  { label: "pmndrs / zustand", url: "https://github.com/pmndrs/zustand" },
  { label: "colinhacks / zod", url: "https://github.com/colinhacks/zod" },
  { label: "facebook / react", url: "https://github.com/facebook/react" },
];

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [stages, setStages] = useState<AnalysisStage[]>(INITIAL_STAGES);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(-1);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [targetRepoName, setTargetRepoName] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check initial system or storage theme
    const saved = localStorage.getItem("codeatlas_theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("codeatlas_theme", next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
    if (inputError) setInputError(null);
  };

  const handleSelectPreset = (url: string) => {
    setRepoUrl(url);
    if (inputError) setInputError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const validation = parseGitHubUrl(repoUrl);
    if (!validation.valid) {
      setInputError(validation.error);
      return;
    }

    const { owner, repo, normalizedUrl } = validation.data;
    setTargetRepoName(`${owner}/${repo}`);
    setIsSubmitting(true);
    setActiveStageIndex(0);
    setCurrentProgress(10);

    // Reset stages
    setStages(
      INITIAL_STAGES.map((s, idx) => ({
        ...s,
        status: idx === 0 ? "running" : "pending",
      }))
    );

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to initialize analysis job.");
      }

      setActiveJobId(data.jobId);

      // Simulate step progression for prototype verification feedback
      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step < INITIAL_STAGES.length) {
          setActiveStageIndex(step);
          setCurrentProgress(Math.round(((step + 1) / INITIAL_STAGES.length) * 100));
          setStages((prev) =>
            prev.map((s, idx) => {
              if (idx < step) return { ...s, status: "completed" };
              if (idx === step) return { ...s, status: "running" };
              return s;
            })
          );
        } else {
          clearInterval(interval);
          setCurrentProgress(100);
          setStages((prev) => prev.map((s) => ({ ...s, status: "completed" })));
        }
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting repository";
      setInputError(msg);
      setIsSubmitting(false);
      setActiveStageIndex(-1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[var(--accent)] selection:text-[var(--ink)]">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVIGATION / PROTOCOL HEADER
         ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-[var(--ink)] bg-[var(--paper)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold tracking-widest uppercase bg-[var(--ink)] text-[var(--paper)] px-2 py-0.5">
              ATLAS-SYS
            </span>
            <div className="font-mono text-xs tracking-wider uppercase">
              <span className="font-bold">CODEATLAS</span>
              <span className="text-[var(--muted)] mx-2">/</span>
              <span className="text-[var(--muted)]">REPOSITORY INTELLIGENCE</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-2 font-mono text-[11px] text-[var(--muted)] uppercase tracking-wider">
              <span className="text-[var(--ink)] font-semibold">IMPORT</span>
              <span>→</span>
              <span>UNDERSTAND</span>
              <span>→</span>
              <span>MAP</span>
              <span>→</span>
              <span>EXPLORE</span>
              <span>→</span>
              <span>TRACE</span>
              <span>→</span>
              <span>ASK</span>
              <span>→</span>
              <span>EVIDENCE</span>
            </nav>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="border border-[var(--ink)] px-2.5 py-1 font-mono text-xs uppercase hover:bg-[var(--accent)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              {theme === "light" ? "LIGHT (LIME)" : "DARK (MAGENTA)"}
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          
          {/* LEFT COLUMN: HERO TYPOGRAPHY & DISCOVERY */}
          <div className="lg:col-span-7 flex flex-col space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
                <span className="w-2 h-2 bg-[var(--accent)] border border-[var(--ink)] inline-block"></span>
                <span>DETERMINISTIC REPOSITORY GRAPH ENGINE</span>
              </div>

              {/* Large Focal Hero Title as mandated in PRD */}
              <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-extrabold tracking-[-0.075em] leading-[0.88] uppercase text-[var(--ink)]">
                Understand
                <br />
                any codebase.
                <br />
                <span className="relative inline-block">
                  Visually.
                  <span className="absolute bottom-1 left-0 w-full h-[6px] bg-[var(--accent)] -z-10"></span>
                </span>
              </h1>
            </div>

            <p className="text-lg sm:text-xl text-[var(--muted)] max-w-xl font-normal leading-relaxed">
              Turns public JS/TS repositories into deterministic maps of architecture and dependencies.
              Inspect every file, trace execution flows, and ask questions backed by verified line-level source evidence.
            </p>

            {/* PRODUCT THESIS BANNER */}
            <div className="border border-[var(--ink)] bg-[var(--white)] p-4 max-w-xl">
              <div className="font-mono text-xs uppercase tracking-wider text-[var(--muted)] mb-1">
                EXECUTION PROTOCOL
              </div>
              <div className="font-mono text-sm sm:text-base font-semibold tracking-tight text-[var(--ink)] flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Structure first.</span>
                <span className="text-[var(--muted)]">/</span>
                <span>Reason second.</span>
                <span className="text-[var(--muted)]">/</span>
                <span className="text-[var(--ink)] bg-[var(--accent)] px-1">Evidence always.</span>
              </div>
            </div>

            {/* THREE PILLARS (EDITORIAL TECHNICAL PANELS) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-2xl">
              <div className="border border-[var(--ink)] p-3 bg-[var(--white)]">
                <div className="font-mono text-[11px] text-[var(--muted)] mb-1">01 / PARSER</div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1">AST RESOLUTION</div>
                <p className="text-[11px] text-[var(--muted)] leading-normal font-mono">
                  TypeScript Compiler API extracts symbols and resolves @/* tsconfig paths.
                </p>
              </div>

              <div className="border border-[var(--ink)] p-3 bg-[var(--white)]">
                <div className="font-mono text-[11px] text-[var(--muted)] mb-1">02 / GRAPH</div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1">DETERMINISTIC</div>
                <p className="text-[11px] text-[var(--muted)] leading-normal font-mono">
                  File & package nodes with strict imports edges. Zero AI guesswork.
                </p>
              </div>

              <div className="border border-[var(--ink)] p-3 bg-[var(--white)]">
                <div className="font-mono text-[11px] text-[var(--muted)] mb-1">03 / CITATIONS</div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1">VERIFIED LINES</div>
                <p className="text-[11px] text-[var(--muted)] leading-normal font-mono">
                  Server authoritatively drops hallucinated citations and line bounds.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: GITHUB REPO INPUT & ENGINEERING STATUS CARD */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* INPUT PANEL */}
            <div className="border-2 border-[var(--ink)] bg-[var(--white)] p-6 shadow-none">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--ink)]">
                <div className="font-mono text-xs uppercase tracking-widest font-bold text-[var(--ink)]">
                  INGESTION TERMINAL
                </div>
                <div className="font-mono text-[11px] text-[var(--muted)]">
                  STATUS: READY
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="repo-url-input"
                    className="block font-mono text-xs uppercase tracking-wider font-semibold mb-2 text-[var(--ink)]"
                  >
                    GITHUB REPOSITORY URL
                  </label>
                  <div className="relative">
                    <input
                      id="repo-url-input"
                      type="text"
                      placeholder="https://github.com/owner/repository"
                      value={repoUrl}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-3 font-mono text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-0 focus:border-[var(--ink)] focus:bg-[var(--white)] ${
                        inputError ? "border-red-600 bg-red-50 text-red-900" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* ERROR STATE MESSAGE (PRD 12.9) */}
                {inputError && (
                  <div className="border border-red-600 bg-red-50 p-3 font-mono text-xs text-red-700">
                    <div className="font-bold uppercase tracking-wider mb-0.5">INPUT ERROR</div>
                    <div>{inputError}</div>
                  </div>
                )}

                {/* PRESET SAMPLES FOR QUICK TESTING */}
                <div className="space-y-1.5 pt-1">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    TEST FIXTURES / SAMPLE REPOSITORIES:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_REPOS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        disabled={isSubmitting}
                        className="font-mono text-xs border border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1 text-[var(--ink)] hover:bg-[var(--accent)] hover:text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PRIMARY ACTION BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !repoUrl.trim()}
                    className={`w-full border-2 border-[var(--ink)] py-3.5 px-4 font-mono text-sm uppercase tracking-widest font-bold cursor-pointer transition-colors ${
                      isSubmitting
                        ? "bg-[var(--muted)] text-[var(--white)] cursor-wait"
                        : "bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] active:translate-y-[1px]"
                    }`}
                  >
                    {isSubmitting ? "ANALYZING REPOSITORY..." : "ANALYZE REPOSITORY →"}
                  </button>
                </div>
              </form>
            </div>

            {/* ANALYSIS STAGED PROCESS MONITOR (PRD 11.9) */}
            {isSubmitting && (
              <div className="border-2 border-[var(--ink)] bg-[var(--white)] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--ink)] pb-3">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider">
                    ANALYSIS MONITOR
                  </div>
                  <div className="font-mono text-xs text-[var(--muted)]">
                    {targetRepoName}
                  </div>
                </div>

                {/* PROGRESS METRIC BAR */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    <span>OVERALL PROGRESS</span>
                    <span>{currentProgress}%</span>
                  </div>
                  <div className="w-full h-2 border border-[var(--ink)] bg-[var(--paper)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* STAGED PROCESS LIST */}
                <div className="divide-y divide-[var(--ink)] border border-[var(--ink)]">
                  {stages.map((stage, idx) => (
                    <div
                      key={stage.id}
                      className={`p-2.5 flex items-start justify-between font-mono text-xs ${
                        idx === activeStageIndex
                          ? "bg-[var(--accent)] text-[var(--ink)] font-semibold"
                          : stage.status === "completed"
                          ? "bg-[var(--white)] text-[var(--ink)]"
                          : "bg-[var(--paper)] text-[var(--muted)]"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">{stage.code}</span>
                        <span>{stage.name}</span>
                      </div>
                      <div className="font-bold">
                        {stage.status === "completed" && "✓"}
                        {stage.status === "running" && "●"}
                        {stage.status === "pending" && "○"}
                        {stage.status === "failed" && "✕"}
                      </div>
                    </div>
                  ))}
                </div>

                {activeJobId && (
                  <div className="font-mono text-[11px] text-[var(--muted)] pt-1">
                    JOB ID: <span className="text-[var(--ink)] font-semibold">{activeJobId}</span>
                  </div>
                )}

                {currentProgress === 100 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => alert("Atlas visualizer screen will open next!")}
                      className="w-full border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] py-3 px-4 font-mono text-sm uppercase tracking-widest font-bold hover:bg-[var(--accent)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                    >
                      OPEN ATLAS CANVAS →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TECHNICAL CONSTRAINTS BOX */}
            <div className="border border-[var(--ink)] p-4 bg-[var(--paper)]">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                SYSTEM CONSTRAINTS (P0)
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-[var(--muted)]">
                <li>• Public JS/TS repositories (.js, .jsx, .ts, .tsx)</li>
                <li>• Max 8 files / 120 lines context window</li>
                <li>• tsconfig.json @/* alias resolution enabled</li>
                <li>• Server-side authoritative citation validation</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. FOOTER
         ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--ink)] bg-[var(--paper)] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between font-mono text-xs text-[var(--muted)] space-y-2 sm:space-y-0">
          <div>
            CODEATLAS v1.0.0 · ENGINEERING ARTIFACT
          </div>
          <div className="flex items-center space-x-4">
            <span>DETERMINISTIC GRAPH</span>
            <span>·</span>
            <span>BOUNDED RETRIEVAL</span>
            <span>·</span>
            <span>VERIFIED CITATIONS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
