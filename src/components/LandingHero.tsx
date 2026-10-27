"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Compass, Lock, Globe, FolderGit2 } from "lucide-react";
import { GOLDEN_DEMO_REPO_URL } from "@/server/shared/constants";
import { AuthUser, UserRepoItem } from "@/types";

interface LandingHeroProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  error?: string | null;
  authUser?: AuthUser | null;
  oauthConfigured?: boolean;
}

function cleanRepoInput(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(?:www\.)?github\.com\/?/i, "")
    .replace(/^github\.com\/?/i, "");
}

export { GOLDEN_DEMO_REPO_URL };

export const LandingHero: React.FC<LandingHeroProps> = ({
  onAnalyze,
  isLoading,
  error,
  authUser,
  oauthConfigured = false,
}) => {
  const [repoPath, setRepoPath] = useState("");
  const [userRepos, setUserRepos] = useState<UserRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [showReposList, setShowReposList] = useState(false);

  useEffect(() => {
    if (authUser) {
      setLoadingRepos(true);
      fetch("/api/auth/repos")
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
        .then((data) => {
          if (data?.repos) setUserRepos(data.repos);
        })
        .catch((err) => {
          console.error("Failed to load user repositories:", err);
        })
        .finally(() => {
          setLoadingRepos(false);
        });
    } else {
      setUserRepos([]);
    }
  }, [authUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanRepoInput(repoPath);
    if (cleaned) {
      onAnalyze(`https://github.com/${cleaned}`);
    }
  };

  const handleDemo = () => {
    const demoPath = cleanRepoInput(GOLDEN_DEMO_REPO_URL);
    setRepoPath(demoPath);
    onAnalyze(GOLDEN_DEMO_REPO_URL);
  };

  const handleSelectSample = (sampleUrl: string) => {
    const cleaned = cleanRepoInput(sampleUrl);
    setRepoPath(cleaned);
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

        {/* Input Form with fixed prefix https://github.com/ */}
        <form onSubmit={handleSubmit} style={{ marginBottom: "16px" }}>
          <div className="hero-form-container">
            <div
              className="font-mono url-prefix"
              style={{
                display: "flex",
                alignItems: "center",
                paddingLeft: "16px",
                color: "var(--muted)",
                userSelect: "none",
                fontSize: "15px",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              https://github.com/
            </div>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(cleanRepoInput(e.target.value))}
              placeholder="owner/repository"
              disabled={isLoading}
              aria-label="GitHub Repository Path"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                padding: "14px 16px 14px 4px",
                fontSize: "15px",
                outline: "none",
                background: "transparent",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !repoPath.trim()}
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

        {/* Authenticated user repository selector (Private & Public) */}
        {authUser && (
          <div
            style={{
              marginBottom: "20px",
              border: "1.5px solid var(--border)",
              background: "var(--white)",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderGit2 size={15} style={{ color: "var(--ink)" }} />
                <span className="font-mono" style={{ fontSize: "11px", fontWeight: 700 }}>
                  LOGGED IN AS @{authUser.login} · {userRepos.length} REPOSITORIES
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowReposList(!showReposList)}
                style={{
                  padding: "3px 10px",
                  minHeight: "26px",
                  fontSize: "11px",
                  fontFamily: "var(--font-dm-mono), monospace",
                  fontWeight: 700,
                  background: showReposList ? "var(--ink)" : "var(--paper)",
                  color: showReposList ? "var(--white)" : "var(--ink)",
                }}
              >
                {showReposList ? "HIDE MY REPOS ▲" : "SELECT MY REPOS (PRIVATE & PUBLIC) ▼"}
              </button>
            </div>

            {showReposList && (
              <div
                style={{
                  marginTop: "10px",
                  maxHeight: "240px",
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  background: "var(--paper)",
                }}
              >
                {loadingRepos ? (
                  <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
                    Loading your repositories...
                  </div>
                ) : userRepos.length === 0 ? (
                  <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
                    No repositories found under this account.
                  </div>
                ) : (
                  userRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => {
                        setRepoPath(repo.fullName);
                        setShowReposList(false);
                        onAnalyze(repo.htmlUrl);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--white)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        {repo.private ? (
                          <Lock size={13} style={{ color: "#FF9500", flexShrink: 0 }} />
                        ) : (
                          <Globe size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                        )}
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {repo.fullName}
                        </span>
                        {repo.description && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--muted)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            — {repo.description}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "1px 5px",
                            background: repo.private ? "#FF9500" : "var(--paper)",
                            color: repo.private ? "#000" : "var(--muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {repo.private ? "PRIVATE" : "PUBLIC"}
                        </span>
                        <span className="font-mono" style={{ fontSize: "10px", fontWeight: 700 }}>
                          ANALYZE ➔
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Login with GitHub Callout when unauthenticated */}
        {!authUser && oauthConfigured && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--white)",
              border: "1.5px solid var(--border)",
              padding: "10px 16px",
              marginBottom: "20px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={14} style={{ color: "var(--muted)" }} />
              <span style={{ fontSize: "13px" }}>
                Need to analyze <strong>private repositories</strong>?
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/github";
              }}
              className="btn-primary"
              style={{ minHeight: "32px", padding: "4px 14px", fontSize: "11px", gap: "5px" }}
            >
              <FolderGit2 size={12} style={{ color: "var(--accent)" }} />
              <span>LOGIN WITH GITHUB</span>
            </button>
          </div>
        )}

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
            <span>TRY DEMO REPOSITORY: AUTHFLOW</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSample("https://github.com/pmndrs/zustand")}
            disabled={isLoading}
            style={{
              background: "var(--paper)",
              borderColor: "var(--border)",
              fontSize: "12px",
              padding: "6px 12px",
              minHeight: "34px",
            }}
          >
            <span>ZUSTAND</span>
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
