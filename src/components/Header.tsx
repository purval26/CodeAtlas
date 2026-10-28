"use client";

import React, { useState, useRef, useEffect } from "react";
import { Repository, AuthUser } from "@/types";
import {
  Sun,
  Moon,
  Compass,
  RefreshCw,
  MessageSquare,
  LogOut,
  FolderGit2,
  Sliders,
  ChevronDown,
  User,
} from "lucide-react";

interface HeaderProps {
  repository: Repository | null;
  onReset: () => void;
  onLoadDemo: () => void;
  onOpenAsk?: () => void;
  onOpenTrace?: () => void;
  onOpenSettings?: () => void;
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
  onOpenSettings,
  isDark,
  onToggleTheme,
  isMobile = false,
  authUser,
  oauthConfigured = false,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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
        </div>

        {repository && (
          <div
            className="font-mono"
            style={{
              borderLeft: "1.5px solid var(--border)",
              paddingLeft: "12px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "2px",
            }}
          >
            <span
              style={{
                color: "var(--ink)",
                fontWeight: 700,
                fontSize: "12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: isMobile ? "130px" : "240px",
                lineHeight: "1.2",
              }}
              title={`${repository.owner || ""}/${repository.name}`}
            >
              {isMobile ? repository.name : `${repository.owner || ""}/${repository.name}`}
            </span>
            {repository.language && (
              <div>
                <span
                  style={{
                    background: "var(--accent)",
                    color: "#11100F",
                    padding: "0.5px 5px",
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    display: "inline-block",
                    lineHeight: "1.3",
                  }}
                >
                  {repository.language}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {repository ? (
          <>
            {!isMobile && onOpenAsk && (
              <button
                onClick={onOpenAsk}
                className="btn-primary"
                title="Grounded Codebase Q&A"
                style={{
                  height: "36px",
                  minHeight: "36px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              >
                <MessageSquare size={13} />
                <span>ASK</span>
              </button>
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

        {/* Unified Profile / Settings / Theme Dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="User account and settings menu"
            style={{
              height: "36px",
              minHeight: "36px",
              padding: authUser ? "2px 8px 2px 3px" : "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              boxSizing: "border-box",
              background: isMenuOpen ? "var(--hover-bg)" : "var(--paper)",
              border: "1.5px solid var(--border)",
              cursor: "pointer",
            }}
          >
            {authUser ? (
              <>
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.login}
                  style={{
                    width: "28px",
                    height: "28px",
                    objectFit: "cover",
                    border: "1px solid var(--border)",
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
              </>
            ) : (
              <>
                <User size={15} />
                {!isMobile && (
                  <span className="font-mono" style={{ fontSize: "11px", fontWeight: 700 }}>
                    ACCOUNT
                  </span>
                )}
              </>
            )}
            <ChevronDown
              size={13}
              style={{
                transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
                opacity: 0.7,
              }}
            />
          </button>

          {/* Dropdown Menu Container */}
          {isMenuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                width: "230px",
                background: "var(--paper)",
                border: "2px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* User details header (if authenticated) */}
              {authUser && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--white)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {authUser.name || authUser.login}
                  </div>
                  <div className="font-mono" style={{ fontSize: "10px", color: "var(--muted)" }}>
                    @{authUser.login}
                  </div>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleTheme();
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "12px",
                  cursor: "pointer",
                  color: "var(--ink)",
                  textAlign: "left",
                  borderRadius: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isDark ? <Sun size={14} style={{ color: "var(--accent)" }} /> : <Moon size={14} />}
                  <span>Theme</span>
                </div>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "1px 6px",
                    background: "var(--hover-bg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {isDark ? "DARK" : "LIGHT"}
                </span>
              </button>

              {/* Settings */}
              {onOpenSettings && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings();
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "transparent",
                    border: "none",
                    borderBottom: authUser || oauthConfigured ? "1px solid var(--border)" : "none",
                    fontSize: "12px",
                    cursor: "pointer",
                    color: "var(--ink)",
                    textAlign: "left",
                    borderRadius: 0,
                  }}
                >
                  <Sliders size={14} />
                  <span>Settings</span>
                </button>
              )}

              {/* Login or Logout */}
              {authUser ? (
                onLogout && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "transparent",
                      border: "none",
                      fontSize: "12px",
                      cursor: "pointer",
                      color: "#FF3B30",
                      textAlign: "left",
                      borderRadius: 0,
                      fontWeight: 700,
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                )
              ) : oauthConfigured ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.location.href = "/api/auth/github";
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "transparent",
                    border: "none",
                    fontSize: "12px",
                    cursor: "pointer",
                    color: "var(--ink)",
                    textAlign: "left",
                    borderRadius: 0,
                    fontWeight: 700,
                  }}
                >
                  <FolderGit2 size={14} />
                  <span>Sign In with GitHub</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
