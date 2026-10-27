"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Lock,
  Globe,
  FolderGit2,
  GitFork,
  Cpu,
  Search,
  FileCode,
  Sparkles,
  Terminal,
} from "lucide-react";
import { GOLDEN_DEMO_REPO_URL } from "@/server/shared/constants";
import { AuthUser, UserRepoItem } from "@/types";

interface LandingHeroProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  error?: string | null;
  authUser?: AuthUser | null;
  oauthConfigured?: boolean;
}

interface FeatureItem {
  tag: string;
  title: string;
  status?: string;
  description: string;
  icon: React.ReactNode;
  badges: string[];
}

const FEATURES: FeatureItem[] = [
  {
    tag: "MODULE 01",
    title: "Interactive Architecture Graph",
    description: "Compiles TypeScript and JavaScript ASTs to map exact dependencies, module clusters, and package boundaries with zero hallucinations.",
    icon: <GitFork size={16} />,
    badges: ["Pipeline Layout", "Folders Cluster", "Radial View", "Obstacle-Free Routes"],
  },
  {
    tag: "MODULE 02",
    title: "Trace Flow Execution Paths",
    description: "Choose any entrypoint and destination file to illuminate the shortest dependency execution path with live animated step-by-step breadcrumbs.",
    icon: <Compass size={16} />,
    badges: ["Dijkstra Pathfinding", "Animated Flow", "Call Graph Inspection"],
  },
  {
    tag: "MODULE 03",
    title: "Grounded AI with Line Citations",
    description: "Ask architectural questions and receive verifiable answers where every cited file and line range is server-checked against the live AST.",
    icon: <Sparkles size={16} />,
    badges: ["Verified Citations", "Click-to-Jump", "Dual-Tier Models"],
  },
  {
    tag: "MODULE 04",
    title: "Source Viewer & Symbol Outline",
    description: "Side-by-side code inspection with syntax highlighting, function declarations, class hierarchies, import relations, and inbound callers.",
    icon: <FileCode size={16} />,
    badges: ["AST Symbol Hierarchy", "Caller Analysis", "Clickable Line Numbers"],
  },
  {
    tag: "MODULE 05",
    title: "Instant Fuzzy Semantic Search",
    description: "Search every file, function, method, and exported symbol in real-time. Selecting any result centers the canvas and opens the source viewer.",
    icon: <Search size={16} />,
    badges: ["Token Matching", "Auto-Focus Camera", "Sub-Millisecond Search"],
  },
  {
    tag: "MODULE 06",
    title: "Multi-Model & Offline Fallback",
    description: "Use free verified OpenRouter models, bring your own API keys (OpenAI, Gemini, Claude), or run 100% offline with deterministic AST synthesis.",
    icon: <Cpu size={16} />,
    badges: ["Free Verified Models", "Custom API Keys", "Zero-Cost Offline Mode"],
  },
  {
    tag: "MODULE 07",
    title: "Private Repositories & GitHub OAuth",
    description: "Sign in with GitHub to securely map internal and private repositories. Tokens are handled strictly server-side with zero telemetry.",
    icon: <Lock size={16} />,
    badges: ["OAuth 2.0 Integration", "Private Repos", "Organization Access"],
  },
  {
    tag: "MODULE 08",
    title: "Terminal CLI Packaging",
    status: "COMING SOON",
    description: "Analyze local offline projects and air-gapped repositories straight from your terminal without uploading code to any cloud service.",
    icon: <Terminal size={16} />,
    badges: ["npx codeatlas .", "Local Ingestion", "Air-Gapped Workflows"],
  },
];

function cleanRepoInput(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(?:www\.)?github\.com\/?/i, "")
    .replace(/^github\.com\/?/i, "");
}

export { GOLDEN_DEMO_REPO_URL };

const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

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
      <motion.div
        variants={heroContainerVariants}
        initial="hidden"
        animate="show"
        style={{
          maxWidth: "960px",
          width: "100%",
          padding: "20px 0 60px 0",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* Editorial Subtitle */}
        <motion.div
          variants={heroItemVariants}
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
        </motion.div>

        {/* Focal Heading with Accent Highlight */}
        <motion.h1
          variants={heroItemVariants}
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
          <motion.span
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
              background: "var(--accent)",
              color: "#11100F",
              padding: "2px 12px",
              display: "inline-block",
              marginTop: "4px",
              cursor: "default",
            }}
          >
            Visually.
          </motion.span>
        </motion.h1>

        {/* Product Thesis */}
        <motion.p
          variants={heroItemVariants}
          style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            lineHeight: 1.5,
            color: "var(--ink)",
            maxWidth: "720px",
            marginBottom: "28px",
          }}
        >
          Turns any public or private JavaScript/TypeScript repository into an interactive, deterministic map of its architecture and dependencies, then provides verifiable answers with clickable line citations.
        </motion.p>

        {/* Input Form with fixed prefix https://github.com/ */}
        <motion.form variants={heroItemVariants} onSubmit={handleSubmit} style={{ marginBottom: "16px" }}>
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
            <motion.button
              whileHover={{ opacity: 0.95 }}
              whileTap={{ scale: 0.98 }}
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
                cursor: isLoading || !repoPath.trim() ? "not-allowed" : "pointer",
              }}
            >
              <span>{isLoading ? "FETCHING..." : "FETCH REPOSITORY"}</span>
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </motion.form>

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
              <FolderGit2 size={12} style={{ color: "currentColor" }} />
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
        <motion.div
          variants={heroItemVariants}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "36px",
            flexWrap: "wrap",
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em" }}
          >
            QUICK DEMOS:
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleDemo}
            disabled={isLoading}
            className="font-mono"
            style={{
              background: "var(--paper)",
              borderColor: "var(--ink)",
              borderWidth: "1.5px",
              fontSize: "11px",
              fontWeight: 800,
              padding: "6px 14px",
              minHeight: "34px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "2px 2px 0px rgba(0,0,0,0.12)",
              cursor: "pointer",
            }}
          >
            <Compass size={13} style={{ color: "var(--ink)" }} />
            <span>AUTHFLOW (GOLDEN DEMO)</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => handleSelectSample("https://github.com/pmndrs/zustand")}
            disabled={isLoading}
            className="font-mono"
            style={{
              background: "var(--white)",
              borderColor: "var(--border)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "6px 12px",
              minHeight: "34px",
              cursor: "pointer",
            }}
          >
            <span>ZUSTAND · STATE</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => handleSelectSample("https://github.com/colinhacks/zod")}
            disabled={isLoading}
            className="font-mono"
            style={{
              background: "var(--white)",
              borderColor: "var(--border)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "6px 12px",
              minHeight: "34px",
              cursor: "pointer",
            }}
          >
            <span>ZOD · VALIDATION</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => handleSelectSample("https://github.com/facebook/react")}
            disabled={isLoading}
            className="font-mono"
            style={{
              background: "var(--white)",
              borderColor: "var(--border)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "6px 12px",
              minHeight: "34px",
              cursor: "pointer",
            }}
          >
            <span>REACT · UI</span>
          </motion.button>
        </motion.div>

        {/* Live Architecture & Evidence Teaser Box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          style={{
            border: "2px solid var(--ink)",
            background: "var(--white)",
            padding: "20px",
            marginBottom: "44px",
            boxShadow: "4px 4px 0px rgba(0,0,0,0.14)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "12px",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  background: "var(--ink)",
                  color: "var(--accent)",
                  padding: "2px 6px",
                  fontSize: "11px",
                  fontWeight: 800,
                  fontFamily: "var(--font-dm-mono), monospace",
                }}
              >
                LIVE ARCHITECTURE
              </span>
              <span className="font-mono" style={{ fontSize: "12px", fontWeight: 700 }}>
                src/server/auth/session.ts ➔ src/db/client.ts
              </span>
            </div>
            <button
              type="button"
              onClick={handleDemo}
              disabled={isLoading}
              style={{
                background: "var(--accent)",
                color: "#11100F",
                border: "1px solid var(--ink)",
                padding: "4px 12px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              LAUNCH INTERACTIVE DEMO ➔
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                border: "1px solid var(--border)",
                background: "var(--paper)",
                padding: "12px",
              }}
            >
              <div className="font-mono" style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "4px" }}>
                01. DETERMINISTIC AST
              </div>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
                Graph Topology
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                Resolves direct imports, exported interfaces, and identifies AuthFlow controller as entrypoint.
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                background: "var(--paper)",
                padding: "12px",
              }}
            >
              <div className="font-mono" style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "4px" }}>
                02. SHORTEST PATH TRACE
              </div>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
                Trace Flow Engine
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                Traces execution from HTTP router ➔ Middleware ➔ Token Validator ➔ PostgreSQL connection pool.
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                background: "var(--paper)",
                padding: "12px",
              }}
            >
              <div className="font-mono" style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "4px" }}>
                03. VERIFIED EVIDENCE
              </div>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
                Grounded Citations
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                Every AI answer links to confirmed source lines (<span style={{ textDecoration: "underline" }}>session.ts:L34-L52</span>) in the integrated viewer.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Complete Feature Showcase Grid */}
        <div style={{ borderTop: "2px solid var(--ink)", paddingTop: "32px", marginBottom: "48px" }}>
          <div
            className="font-mono"
            style={{
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "8px",
            }}
          >
            CAPABILITIES & ARCHITECTURE
          </div>
          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "12px",
              color: "var(--ink)",
            }}
          >
            Engineered for deep repository comprehension.
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.5,
              maxWidth: "680px",
              marginBottom: "28px",
            }}
          >
            Explore how CodeAtlas turns complex repositories into clear, interactive architectural maps with verified line citations.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {FEATURES.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] as const }}
                whileHover={{
                  y: -4,
                  boxShadow: "4px 4px 0px rgba(0,0,0,0.18)",
                  borderColor: "var(--ink)",
                  transition: { duration: 0.14 },
                }}
                style={{
                  border: "1.5px solid var(--border)",
                  background: "var(--white)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "default",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: [0, -3, 3, 0] }}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: "32px",
                        height: "32px",
                        background: "var(--paper)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ink)",
                      }}
                    >
                      {feat.icon}
                    </motion.div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {feat.status && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "1px 6px",
                            background: "var(--accent)",
                            color: "#11100F",
                            border: "1px solid var(--border)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {feat.status}
                        </span>
                      )}
                      <span
                        className="font-mono"
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {feat.tag}
                      </span>
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      marginBottom: "6px",
                      letterSpacing: "-0.02em",
                      color: "var(--ink)",
                    }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--muted)",
                      lineHeight: 1.45,
                      marginBottom: "14px",
                    }}
                  >
                    {feat.description}
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {feat.badges.map((badge, bIdx) => (
                    <span
                      key={bIdx}
                      className="font-mono"
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        background: "var(--paper)",
                        color: "var(--ink)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
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
      </motion.div>
    </div>
  );
};
