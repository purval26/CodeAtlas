"use client";

import React, { useState } from "react";
import { ArrowRight, Compass } from "lucide-react";

export const GOLDEN_DEMO_REPO_URL = "https://github.com/pmndrs/zustand";

interface LandingHeroProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onAnalyze,
  isLoading,
  error,
}) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url.trim());
    }
  };

  const handleDemo = () => {
    setUrl(GOLDEN_DEMO_REPO_URL);
    onAnalyze(GOLDEN_DEMO_REPO_URL);
  };

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    onAnalyze(sampleUrl);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100%",
        maxHeight: "100%",
        width: "100%",
        padding: "20px 24px",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
      className="touch-pan-y"
    >
      <div
        style={{
          maxWidth: "860px",
          width: "100%",
          padding: "20px 0 40px 0",
          margin: "auto 0",
          boxSizing: "border-box",
        }}
      >
        {/* Editorial Subtitle */}
        <div
          className="font-mono"
          style={{
            fontSize: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "16px",
          }}
        >
          CODEATLAS / REPOSITORY INTELLIGENCE
        </div>

        {/* Focal Heading */}
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 92px)",
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
            marginBottom: "24px",
            color: "var(--ink)",
          }}
        >
          Understand any<br />
          codebase.<br />
          <span style={{ color: "var(--muted)" }}>Visually.</span>
        </h1>

        {/* Product Thesis */}
        <p
          style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            lineHeight: 1.5,
            color: "var(--ink)",
            maxWidth: "680px",
            marginBottom: "28px",
          }}
        >
          Turns any public or private JavaScript/TypeScript repository into an interactive, deterministic map of its architecture and dependencies, then provides verifiable answers with clickable line citations.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: "16px" }}>
          <div className="hero-form-container">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              disabled={isLoading}
              aria-label="GitHub Repository URL"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                padding: "14px 18px",
                fontSize: "15px",
                outline: "none",
                background: "transparent",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="btn-primary"
              aria-label="Fetch repository"
              title="Fetch and analyze repository"
              style={{
                border: "none",
                borderLeft: "2px solid var(--ink)",
                padding: "0 24px",
                fontSize: "14px",
                minHeight: "48px",
                whiteSpace: "nowrap",
              }}
            >
              <span>{isLoading ? "FETCHING..." : "FETCH REPOSITORY"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div
            className="font-mono"
            style={{
              border: "1.5px solid #FF3B30",
              background: "rgba(255, 59, 48, 0.08)",
              padding: "12px 16px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "var(--ink)",
            }}
          >
            <strong>ERROR:</strong> {error}
          </div>
        )}

        {/* Demo Shortcut & Quick Links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "36px",
            flexWrap: "wrap",
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: "12px", color: "var(--muted)" }}
          >
            PREPARED DEMO:
          </span>
          <button
            type="button"
            onClick={handleDemo}
            disabled={isLoading}
            style={{
              background: "var(--paper)",
              borderColor: "var(--ink)",
              fontSize: "12px",
              padding: "6px 14px",
              minHeight: "34px",
            }}
          >
            <Compass size={13} />
            <span>TRY DEMO REPOSITORY: ZUSTAND</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSample("https://github.com/colinhacks/zod")}
            disabled={isLoading}
            style={{
              background: "var(--paper)",
              borderColor: "var(--border)",
              fontSize: "12px",
              padding: "6px 12px",
              minHeight: "34px",
            }}
          >
            <span>ZOD</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSample("https://github.com/facebook/react")}
            disabled={isLoading}
            style={{
              background: "var(--paper)",
              borderColor: "var(--border)",
              fontSize: "12px",
              padding: "6px 12px",
              minHeight: "34px",
            }}
          >
            <span>REACT</span>
          </button>
        </div>

        {/* Core Principles Section */}
        <div
          style={{
            borderTop: "1.5px solid var(--border)",
            paddingTop: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "24px",
          }}
        >
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: "6px",
              }}
            >
              PRINCIPLE 01
            </div>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
              Structure first.
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
              Deterministic AST compilation and alias resolution. Zero hallucinated dependencies.
            </div>
          </div>

          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: "6px",
              }}
            >
              PRINCIPLE 02
            </div>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
              Reason second.
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
              Graph traversal and bounded retrieval context strictly focused on real evidence.
            </div>
          </div>

          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: "6px",
              }}
            >
              PRINCIPLE 03
            </div>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
              Evidence always.
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
              Server-verified citations. Click any claim to jump to the exact source lines.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
