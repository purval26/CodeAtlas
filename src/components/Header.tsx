"use client";

import React from "react";
import { Repository, AuthUser } from "@/types";
import { Sun, Moon, Compass, RefreshCw, GitFork, MessageSquare, LogOut, FolderGit2 } from "lucide-react";

interface HeaderProps {
  repository: Repository | null;
  onReset: () => void;
  onLoadDemo: () => void;
  onOpenAsk?: () => void;
  onOpenTrace?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isMobile?: boolean;
  authUser?: AuthUser | null;
  oauthConfigured?: boolean;
  onLogout?: () => void;
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
  authUser,
  oauthConfigured = false,
  onLogout,
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
                    style={{ height: "36px", minHeight: "36px", padding: "6px 12px", fontSize: "12px", boxSizing: "border-box" }}
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
                    style={{ height: "36px", minHeight: "36px", padding: "6px 14px", fontSize: "12px", boxSizing: "border-box" }}
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
                height: "36px",
                minHeight: "36px",
                padding: isMobile ? "6px 10px" : "6px 12px",
                fontSize: "12px",
                boxSizing: "border-box",
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
              height: "36px",
              minHeight: "36px",
              padding: isMobile ? "6px 10px" : "6px 14px",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          >
            <Compass size={13} />
            <span>{isMobile ? "DEMO" : "TRY DEMO"}</span>
          </button>
        )}

        {/* User Auth or GitHub Login button */}
        {authUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <img
              src={authUser.avatarUrl}
              alt={authUser.login}
              style={{
                width: "36px",
                height: "36px",
                border: "1.5px solid var(--border)",
                objectFit: "cover",
                boxSizing: "border-box",
              }}
              title={`Logged in as ${authUser.login}`}
            />
            {!isMobile && (
              <span
                className="font-mono"
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  maxWidth: "90px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                @{authUser.login}
              </span>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log out from GitHub"
                aria-label="Logout"
                style={{ height: "36px", minHeight: "36px", padding: "6px 10px", fontSize: "11px", gap: "4px", boxSizing: "border-box" }}
              >
                <LogOut size={12} />
                {!isMobile && <span>LOGOUT</span>}
              </button>
            )}
          </div>
        ) : oauthConfigured ? (
          <button
            onClick={() => {
              window.location.href = "/api/auth/github";
            }}
            style={{
              padding: isMobile ? "6px 10px" : "6px 12px",
              height: "36px",
              minHeight: "36px",
              fontSize: "11px",
              gap: "5px",
              background: "var(--ink)",
              color: "var(--white)",
              border: "1.5px solid var(--ink)",
              boxSizing: "border-box",
            }}
            title="Sign in with GitHub to analyze private repositories"
          >
            <FolderGit2 size={13} style={{ color: "var(--accent)" }} />
            <span>{isMobile ? "LOGIN" : "LOGIN GITHUB"}</span>
          </button>
        ) : null}

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          style={{ width: "36px", height: "36px", minHeight: "36px", padding: "0", boxSizing: "border-box" }}
          aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
          title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
};
