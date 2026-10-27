"use client";

import React from "react";
import { Repository } from "@/types";
import { Sun, Moon, Compass, RefreshCw, GitFork, MessageSquare } from "lucide-react";

interface HeaderProps {
  repository: Repository | null;
  onReset: () => void;
  onLoadDemo: () => void;
  onOpenAsk?: () => void;
  onOpenTrace?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isMobile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  repository,
  onReset,
  onLoadDemo,
  onOpenAsk,
  onOpenTrace,
  isDark,
  onToggleTheme,
  isMobile = false,
}) => {
  return (
    <header
      style={{
        borderBottom: "1.5px solid var(--border)",
        background: "var(--paper)",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        userSelect: "none",
        zIndex: 50,
        gap: "10px",
      }}
    >
      {/* Brand & Repository */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <div
          onClick={onReset}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onReset();
          }}
          style={{
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "15px",
            letterSpacing: "-0.04em",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              background: "var(--ink)",
              color: "var(--accent)",
              padding: "2px 6px",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            CA
          </span>
          <span className="text-[var(--ink)]">CODEATLAS</span>
          {!isMobile && (
            <span
              style={{
                color: "var(--muted)",
                fontWeight: 400,
                fontSize: "12px",
                marginLeft: "2px",
              }}
            >
              / INTELLIGENCE
            </span>
          )}
        </div>

        {repository && (
          <div
            className="font-mono"
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              borderLeft: "1px solid var(--border)",
              paddingLeft: "10px",
              minWidth: 0,
            }}
          >
            <span
              style={{
                color: "var(--ink)",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: isMobile ? "110px" : "180px",
              }}
              title={`${repository.owner || ""}/${repository.name}`}
            >
              {isMobile ? repository.name : `${repository.owner || ""}/${repository.name}`}
            </span>
            {!isMobile && repository.language && (
              <span
                style={{
                  background: "var(--accent)",
                  color: "#11100F",
                  padding: "1px 5px",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {repository.language}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {repository ? (
          <>
            {!isMobile && (
              <>
                {onOpenTrace && (
                  <button
                    onClick={onOpenTrace}
                    title="Shortest path dependency analysis"
                    style={{ minHeight: "36px", padding: "6px 12px", fontSize: "12px" }}
                  >
                    <GitFork size={13} />
                    <span>TRACE</span>
                  </button>
                )}
                {onOpenAsk && (
                  <button
                    onClick={onOpenAsk}
                    className="btn-primary"
                    title="Grounded Codebase Q&A"
                    style={{ minHeight: "36px", padding: "6px 14px", fontSize: "12px" }}
                  >
                    <MessageSquare size={13} />
                    <span>ASK</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={onReset}
              title="Analyze another repository"
              aria-label="New repository"
              style={{
                minHeight: "36px",
                padding: isMobile ? "6px 10px" : "6px 12px",
                fontSize: "12px",
              }}
            >
              <RefreshCw size={13} />
              {!isMobile && <span>NEW REPO</span>}
            </button>
          </>
        ) : (
          <button
            onClick={onLoadDemo}
            className="btn-primary"
            style={{
              minHeight: "36px",
              padding: isMobile ? "6px 10px" : "6px 14px",
              fontSize: "12px",
            }}
          >
            <Compass size={13} />
            <span>{isMobile ? "DEMO" : "TRY DEMO"}</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          style={{ width: "38px", minHeight: "36px", padding: "0" }}
          aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
          title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
};
