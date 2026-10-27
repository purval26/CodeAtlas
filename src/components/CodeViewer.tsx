"use client";
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { CodeFile, CodeSymbol } from "@/types";
import { X, FileCode, Palette, Copy, Check } from "lucide-react";
import { VSCODE_THEMES, VSCodeTheme, tokenizeCode } from "@/utils/codeTheming";

interface CodeViewerProps {
  file: CodeFile;
  symbols?: CodeSymbol[];
  targetLineRange?: { startLine: number; endLine: number } | null;
  onClose: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  file,
  symbols = [],
  targetLineRange,
  onClose,
}) => {
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevFilePathRef = useRef<string>(file.path);
  const [copied, setCopied] = useState(false);

  // Selected VS Code theme
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codeatlas_code_viewer_theme");
      if (saved && VSCODE_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      return isDark ? "vscode-dark" : "vscode-light";
    }
    return "vscode-dark";
  });

  const activeTheme: VSCodeTheme = useMemo(() => {
    return VSCODE_THEMES.find((t) => t.id === themeId) || VSCODE_THEMES[0];
  }, [themeId]);

  const handleThemeChange = (newId: string) => {
    setThemeId(newId);
    if (typeof window !== "undefined") {
      localStorage.setItem("codeatlas_code_viewer_theme", newId);
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Clear stale line refs only when active file path actually changes
  if (prevFilePathRef.current !== file.path) {
    prevFilePathRef.current = file.path;
    lineRefs.current = {};
  }

  const scrollToLine = useCallback((targetLine: number, smooth: boolean = false) => {
    const el = lineRefs.current[targetLine];
    if (el) {
      el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
      return true;
    }
    if (scrollContainerRef.current) {
      const lineHeight = 22;
      const targetTop = Math.max(0, (targetLine - 1) * lineHeight - scrollContainerRef.current.clientHeight / 2);
      scrollContainerRef.current.scrollTo({
        top: targetTop,
        behavior: smooth ? "smooth" : "auto",
      });
      return true;
    }
    return false;
  }, []);

  // Auto-scroll to target cited range
  useEffect(() => {
    if (targetLineRange && targetLineRange.startLine) {
      const line = targetLineRange.startLine;
      scrollToLine(line, false);

      const raf = requestAnimationFrame(() => {
        scrollToLine(line, false);
      });

      const timer = setTimeout(() => {
        scrollToLine(line, false);
      }, 60);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [targetLineRange, file.path, scrollToLine]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const lines = useMemo(() => file.content.split("\n"), [file.content]);
  const tokenizedLines = useMemo(
    () => tokenizeCode(lines, file.language),
    [lines, file.language]
  );

  return (
    <div
      role="dialog"
      aria-label={`Code Viewer: ${file.path}`}
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(2px)",
        zIndex: 160,
        display: "flex",
        justifyContent: "flex-end",
        paddingTop: "var(--sat)",
        paddingBottom: "var(--sab)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "min(980px, 100vw)",
          height: "100%",
          background: activeTheme.colors.bg,
          borderLeft: `2px solid ${activeTheme.colors.border}`,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header / Tab Bar */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${activeTheme.colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: activeTheme.colors.tabBg,
            gap: "12px",
            flexShrink: 0,
          }}
        >
          {/* File details */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <FileCode size={18} style={{ flexShrink: 0, color: activeTheme.colors.control }} />
            <div style={{ minWidth: 0 }}>
              <div
                className="font-mono"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: activeTheme.colors.text,
                }}
                title={file.path}
              >
                {file.path}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: "10px",
                  color: activeTheme.colors.gutterText,
                  marginTop: "2px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {lines.length} lines ({file.lineCount} total)
                </span>
                <span>•</span>
                <span style={{ textTransform: "uppercase" }}>{file.language}</span>
                {targetLineRange && (
                  <>
                    <span>•</span>
                    <span
                      style={{
                        color: activeTheme.colors.citationBorder,
                        fontWeight: 700,
                        background: activeTheme.colors.citationBg,
                        padding: "0 4px",
                      }}
                    >
                      Lines {targetLineRange.startLine}–{targetLineRange.endLine}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controls: Theme Selector, Copy, Close */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {/* VS Code Theme Dropdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: activeTheme.colors.bg,
                border: `1px solid ${activeTheme.colors.border}`,
                padding: "2px 6px",
              }}
            >
              <Palette size={12} style={{ color: activeTheme.colors.fn, flexShrink: 0 }} />
              <label
                htmlFor="vscode-theme-select"
                className="font-mono"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: activeTheme.colors.gutterText,
                  marginRight: "2px",
                  userSelect: "none",
                }}
              >
                THEME:
              </label>
              <select
                id="vscode-theme-select"
                value={themeId}
                onChange={(e) => handleThemeChange(e.target.value)}
                aria-label="Select VS Code Theme"
                className="font-mono"
                style={{
                  background: "transparent",
                  color: activeTheme.colors.text,
                  border: "none",
                  fontSize: "11px",
                  cursor: "pointer",
                  outline: "none",
                  fontWeight: 600,
                }}
              >
                {VSCODE_THEMES.map((theme) => (
                  <option
                    key={theme.id}
                    value={theme.id}
                    style={{
                      background: theme.colors.bg,
                      color: theme.colors.text,
                    }}
                  >
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              title="Copy file contents"
              style={{
                padding: "4px 8px",
                minHeight: "28px",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: activeTheme.colors.bg,
                color: activeTheme.colors.text,
                borderColor: activeTheme.colors.border,
              }}
            >
              {copied ? <Check size={12} style={{ color: "#4EC9B0" }} /> : <Copy size={12} />}
              <span>{copied ? "COPIED" : "COPY"}</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                padding: "4px 8px",
                minHeight: "28px",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: activeTheme.colors.bg,
                color: activeTheme.colors.text,
                borderColor: activeTheme.colors.border,
              }}
            >
              <X size={14} />
              <span>CLOSE</span>
            </button>
          </div>
        </div>

        {/* Code Content with Line Numbers */}
        <div
          ref={scrollContainerRef}
          className="font-mono touch-pan-y"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "auto",
            padding: "12px 0",
            background: activeTheme.colors.bg,
            color: activeTheme.colors.text,
            fontSize: "13px",
            lineHeight: "22px",
          }}
        >
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const isCited =
              targetLineRange &&
              lineNum >= targetLineRange.startLine &&
              lineNum <= targetLineRange.endLine;

            const tokens = tokenizedLines[idx] || [{ text: lineText || " ", type: "text" }];

            return (
              <div
                key={lineNum}
                ref={(el) => {
                  lineRefs.current[lineNum] = el;
                }}
                style={{
                  display: "flex",
                  background: isCited
                    ? activeTheme.colors.citationBg
                    : "transparent",
                  borderLeft: isCited
                    ? `4px solid ${activeTheme.colors.citationBorder}`
                    : "4px solid transparent",
                  paddingRight: "16px",
                  minWidth: "fit-content",
                }}
              >
                {/* Line number gutter */}
                <div
                  style={{
                    width: "56px",
                    textAlign: "right",
                    paddingRight: "16px",
                    userSelect: "none",
                    color: isCited
                      ? activeTheme.colors.gutterActiveText
                      : activeTheme.colors.gutterText,
                    fontWeight: isCited ? 700 : 400,
                    background: activeTheme.colors.gutterBg,
                    flexShrink: 0,
                  }}
                >
                  {lineNum}
                </div>

                {/* Syntax highlighted line text */}
                <div
                  style={{
                    flex: 1,
                    whiteSpace: "pre",
                    color: activeTheme.colors.text,
                    paddingLeft: "8px",
                  }}
                >
                  {tokens.map((token, tokenIdx) => {
                    const tokenColor =
                      activeTheme.colors[token.type as keyof typeof activeTheme.colors] ||
                      activeTheme.colors.text;

                    return (
                      <span key={tokenIdx} style={{ color: tokenColor }}>
                        {token.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Symbols index at footer (if symbols exist) */}
        {symbols.length > 0 && (
          <div
            style={{
              padding: "6px 14px",
              borderTop: `1px solid ${activeTheme.colors.border}`,
              background: activeTheme.colors.tabBg,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: "10px",
                color: activeTheme.colors.gutterText,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              JUMP SYMBOL:
            </span>
            {symbols.slice(0, 10).map((sym) => (
              <button
                key={sym.id}
                onClick={() => {
                  scrollToLine(sym.startLine, true);
                }}
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  minHeight: "24px",
                  fontFamily: "var(--font-dm-mono), monospace",
                  flexShrink: 0,
                  background: activeTheme.colors.bg,
                  color: activeTheme.colors.text,
                  borderColor: activeTheme.colors.border,
                }}
              >
                <span style={{ color: activeTheme.colors.fn }}>{sym.name}</span>
                <span style={{ color: activeTheme.colors.gutterText }}>:{sym.startLine}</span>
              </button>
            ))}
          </div>
        )}

        {/* VS Code Status Bar */}
        <div
          style={{
            height: "24px",
            background: activeTheme.colors.statusBarBg,
            color: activeTheme.colors.statusBarText,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            fontSize: "11px",
            fontFamily: "var(--font-dm-mono), monospace",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            {targetLineRange ? (
              <span style={{ fontWeight: 700 }}>
                Ln {targetLineRange.startLine}-{targetLineRange.endLine} (Evidence Target)
              </span>
            ) : (
              <span>Lines: {lines.length}</span>
            )}
            <span>•</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.path}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span style={{ textTransform: "uppercase" }}>{file.language}</span>
            <span style={{ fontWeight: 700 }}>{activeTheme.name.split(" ")[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
