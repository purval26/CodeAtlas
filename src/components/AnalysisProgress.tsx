"use client";

import React from "react";
import { AnalysisJob } from "@/types";
import { RefreshCw } from "lucide-react";

interface AnalysisProgressProps {
  job: AnalysisJob;
  onRetry: () => void;
}

const STAGES = [
  { key: "fetching", label: "01 FETCH REPOSITORY" },
  { key: "indexing", label: "02 INDEX FILES" },
  { key: "parsing", label: "03 PARSE AST" },
  { key: "resolving", label: "04 RESOLVE DEPENDENCIES" },
  { key: "graphing", label: "05 BUILD ATLAS" },
  { key: "completed", label: "06 PREPARE ASK" },
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  job,
  onRetry,
}) => {
  const currentStageIndex = STAGES.findIndex((s) => s.key === job.status);
  const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100dvh - 56px)",
        width: "100%",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "580px",
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
            color: "var(--muted)",
            letterSpacing: "0.08em",
            marginBottom: "8px",
          }}
        >
          REPOSITORY ANALYSIS IN PROGRESS
        </div>

        <h2
          style={{
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            marginBottom: "24px",
            wordBreak: "break-all",
          }}
        >
          {job?.url ? job.url.replace(/^https?:\/\/github\.com\//i, "") : "Repository"}
        </h2>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: "8px",
            border: "1px solid var(--border)",
            background: "var(--paper)",
            marginBottom: "32px",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(5, job.progress))}%`,
              height: "100%",
              background: "var(--accent)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Staged pipeline checklist */}
        <div
          className="font-mono"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginBottom: "36px",
          }}
        >
          {STAGES.map((stage, idx) => {
            const isCompleted = job.status === "completed" || idx < activeIndex;
            const isCurrent = job.status !== "failed" && idx === activeIndex;
            const isPending = idx > activeIndex;

            return (
              <div
                key={stage.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  color: isCurrent
                    ? "var(--ink)"
                    : isCompleted
                    ? "var(--muted)"
                    : "var(--muted)",
                  fontWeight: isCurrent ? 700 : 400,
                  opacity: isPending ? 0.45 : 1,
                }}
              >
                <span>{stage.label}</span>
                <span style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
                  {isCompleted && "✓"}
                  {isCurrent && "●"}
                  {isPending && "○"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {job.status === "failed" && (
          <div
            style={{
              border: "1.5px solid #FF3B30",
              background: "rgba(255, 59, 48, 0.08)",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              className="font-mono"
              style={{
                color: "#FF3B30",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "4px",
              }}
            >
              ANALYSIS FAILED
            </div>
            <div
              className="font-mono"
              style={{ fontSize: "12px", color: "var(--ink)", lineHeight: 1.4 }}
            >
              {job.error || "The repository could not be analyzed."}
            </div>
            <div style={{ marginTop: "16px" }}>
              <button onClick={onRetry} className="btn-primary" style={{ minHeight: "36px" }}>
                <RefreshCw size={14} />
                <span>RETRY</span>
              </button>
            </div>
          </div>
        )}

        <div
          className="font-mono"
          style={{ fontSize: "11px", color: "var(--muted)" }}
        >
          STAGE: {job.stage || "INDEXING"} · STATUS: {job.status.toUpperCase()} ({job.progress}%)
        </div>
      </div>
    </div>
  );
};
