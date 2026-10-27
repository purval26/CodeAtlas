"use client";
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CodeFile, CodeSymbol } from "@/types";
import {
  X,
  FileCode,
  Palette,
  Copy,
  Check,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import {
  VSCODE_THEMES,
  VSCodeTheme,
  TokenType,
  tokenizeCode,
  resolveImportPath,
} from "@/utils/codeTheming";
import { CustomSelect, CustomSelectOption } from "./CustomSelect";
import { useSettings } from "@/utils/settings";

interface CodeViewerProps {
  file: CodeFile;
  symbols?: CodeSymbol[];
  targetLineRange?: { startLine: number; endLine: number } | null;
  onClose: () => void;
  onNavigateToFile?: (filePath: string) => void;
  knownFilePaths?: string[];
}

interface SearchMatch {
  lineIndex: number;
  lineNum: number;
  charStart: number;
  charEnd: number;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  file,
  symbols = [],
  targetLineRange,
  onClose,
  onNavigateToFile,
  knownFilePaths = [],
}) => {
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevFilePathRef = useRef<string>(file.path);

  const [copied, setCopied] = useState(false);
  const [fileHistory, setFileHistory] = useState<string[]>([]);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Synchronize theme and editor preferences with unified Settings
  const [settings, updateSettings] = useSettings();
  const themeId = settings.codeViewerTheme || "vscode-dark";

  const activeTheme: VSCodeTheme = useMemo(() => {
    return VSCODE_THEMES.find((t) => t.id === themeId) || VSCODE_THEMES[0];
  }, [themeId]);

  const themeOptions: CustomSelectOption[] = useMemo(() => {
    return VSCODE_THEMES.map((t) => ({
      value: t.id,
      label: t.name.split(" (")[0],
    }));
  }, []);

  const handleThemeChange = (newId: string) => {
    updateSettings({ codeViewerTheme: newId });
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Clear stale line refs only when active file path changes
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

  const lines = useMemo(() => file.content.split("\n"), [file.content]);
  const tokenizedLines = useMemo(
    () => tokenizeCode(lines, file.language),
    [lines, file.language]
  );

  // Search match computation
  const matches = useMemo<SearchMatch[]>(() => {
    if (!searchQuery.trim()) return [];
    const query = matchCase ? searchQuery : searchQuery.toLowerCase();
    const result: SearchMatch[] = [];

    lines.forEach((lineText, lineIdx) => {
      const target = matchCase ? lineText : lineText.toLowerCase();
      let startIdx = 0;
      while (startIdx < target.length) {
        const foundIdx = target.indexOf(query, startIdx);
        if (foundIdx === -1) break;
        result.push({
          lineIndex: lineIdx,
          lineNum: lineIdx + 1,
          charStart: foundIdx,
          charEnd: foundIdx + query.length,
        });
        startIdx = foundIdx + query.length;
      }
    });

    return result;
  }, [lines, searchQuery, matchCase]);

  // Navigate next match
  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => {
      const next = (prev + 1) % matches.length;
      scrollToLine(matches[next].lineNum, false);
      return next;
    });
  }, [matches, scrollToLine]);

  // Navigate prev match
  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => {
      const next = (prev - 1 + matches.length) % matches.length;
      scrollToLine(matches[next].lineNum, false);
      return next;
    });
  }, [matches, scrollToLine]);

  // Keyboard shortcut listener (Ctrl+F / Cmd+F to open search, Escape to close search/viewer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 30);
        return;
      }

      if (e.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, onClose]);

  // When search query changes, reset index and jump to first match
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentMatchIndex(0);
  };

  useEffect(() => {
    if (matches.length > 0 && isSearchOpen) {
      scrollToLine(matches[0].lineNum, false);
    }
  }, [matches, isSearchOpen, scrollToLine]);

  // Cross-file navigation
  const handleNavigate = (targetPath: string) => {
    if (onNavigateToFile && targetPath !== file.path) {
      setFileHistory((prev) => [...prev, file.path]);
      onNavigateToFile(targetPath);
    }
  };

  const handleGoBack = () => {
    if (fileHistory.length > 0 && onNavigateToFile) {
      const prevPath = fileHistory[fileHistory.length - 1];
      setFileHistory((prev) => prev.slice(0, -1));
      onNavigateToFile(prevPath);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
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
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        style={{
          width: "min(1020px, 100vw)",
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
            padding: "8px 16px",
            borderBottom: `1px solid ${activeTheme.colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: activeTheme.colors.tabBg,
            gap: "12px",
            flexShrink: 0,
            overflow: "visible",
            zIndex: 40,
            minHeight: "48px",
            boxSizing: "border-box",
          }}
        >
          {/* File details & back button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {fileHistory.length > 0 && (
              <button
                onClick={handleGoBack}
                title={`Back to ${fileHistory[fileHistory.length - 1]}`}
                style={{
                  padding: "4px 8px",
                  height: "32px",
                  minHeight: "32px",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: activeTheme.colors.bg,
                  color: activeTheme.colors.text,
                  borderColor: activeTheme.colors.border,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                <ArrowLeft size={13} />
                <span className="font-mono">BACK</span>
              </button>
            )}

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

          {/* Controls: Search Toggle, Theme, Copy, Close */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              overflow: "visible",
            }}
          >
            {/* Find Button */}
            <button
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                if (!isSearchOpen) {
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                  }, 40);
                }
              }}
              title="Find in file (Ctrl+F)"
              style={{
                padding: "0 10px",
                height: "32px",
                minHeight: "32px",
                maxHeight: "32px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: isSearchOpen ? activeTheme.colors.statusBarBg : activeTheme.colors.bg,
                color: isSearchOpen ? activeTheme.colors.statusBarText : activeTheme.colors.text,
                borderColor: activeTheme.colors.border,
                boxSizing: "border-box",
              }}
            >
              <Search size={13} />
              <span>FIND</span>
            </button>

            {/* VS Code Theme CustomSelect */}
            <CustomSelect
              labelPrefix="THEME:"
              value={themeId}
              options={themeOptions}
              onChange={handleThemeChange}
              icon={<Palette size={12} style={{ color: activeTheme.colors.fn, flexShrink: 0 }} />}
              ariaLabel="Select VS Code Theme"
              compact={false}
              buttonStyle={{
                background: activeTheme.colors.bg,
                color: activeTheme.colors.text,
                border: `1px solid ${activeTheme.colors.border}`,
                height: "32px",
                minHeight: "32px",
                maxHeight: "32px",
                boxShadow: "none",
                boxSizing: "border-box",
                padding: "0 10px",
                fontSize: "11px",
              }}
              dropdownStyle={{
                background: activeTheme.colors.tabBg,
                border: `1.5px solid ${activeTheme.colors.border}`,
                color: activeTheme.colors.text,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                maxHeight: "260px",
                overflowY: "auto",
                minWidth: "160px",
                zIndex: 300,
              }}
            />

            {/* Copy button */}
            <button
              onClick={handleCopy}
              title="Copy file contents"
              style={{
                padding: "0 10px",
                height: "32px",
                minHeight: "32px",
                maxHeight: "32px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: activeTheme.colors.bg,
                color: activeTheme.colors.text,
                borderColor: activeTheme.colors.border,
                boxSizing: "border-box",
              }}
            >
              {copied ? <Check size={12} style={{ color: "#4EC9B0" }} /> : <Copy size={12} />}
              <span>{copied ? "COPIED" : "COPY"}</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                padding: "0 10px",
                height: "32px",
                minHeight: "32px",
                maxHeight: "32px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: activeTheme.colors.bg,
                color: activeTheme.colors.text,
                borderColor: activeTheme.colors.border,
                boxSizing: "border-box",
              }}
            >
              <X size={14} />
              <span>CLOSE</span>
            </button>
          </div>
        </div>

        {/* Editor Body Wrapper */}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Floating VS Code Find Widget */}
          {isSearchOpen && (
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "24px",
                zIndex: 40,
                background: activeTheme.colors.tabBg,
                border: `1px solid ${activeTheme.colors.border}`,
                boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Search size={13} style={{ color: activeTheme.colors.gutterText, flexShrink: 0 }} />

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) {
                      goToPrevMatch();
                    } else {
                      goToNextMatch();
                    }
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setIsSearchOpen(false);
                  }
                }}
                placeholder="Find in file..."
                className="font-mono"
                style={{
                  background: activeTheme.colors.bg,
                  color: activeTheme.colors.text,
                  border: `1px solid ${activeTheme.colors.border}`,
                  padding: "0 8px",
                  fontSize: "12px",
                  width: "180px",
                  height: "28px",
                  minHeight: "28px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Match counter */}
              <span
                className="font-mono"
                style={{
                  fontSize: "11px",
                  minWidth: "55px",
                  color:
                    searchQuery && matches.length === 0
                      ? "#FF6B6B"
                      : activeTheme.colors.gutterText,
                  fontWeight: 600,
                  userSelect: "none",
                }}
              >
                {searchQuery
                  ? matches.length > 0
                    ? `${currentMatchIndex + 1} of ${matches.length}`
                    : "0 of 0"
                  : ""}
              </span>

              {/* Match Case toggle button */}
              <button
                type="button"
                onClick={() => setMatchCase((prev) => !prev)}
                title="Match Case (Alt+C)"
                style={{
                  padding: "0 8px",
                  height: "28px",
                  minHeight: "28px",
                  fontSize: "10px",
                  fontFamily: "var(--font-dm-mono), monospace",
                  background: matchCase ? activeTheme.colors.statusBarBg : activeTheme.colors.bg,
                  color: matchCase ? activeTheme.colors.statusBarText : activeTheme.colors.text,
                  borderColor: matchCase ? activeTheme.colors.statusBarBg : activeTheme.colors.border,
                  boxSizing: "border-box",
                }}
              >
                Aa
              </button>

              {/* Previous Match */}
              <button
                type="button"
                onClick={goToPrevMatch}
                disabled={matches.length === 0}
                title="Previous Match (Shift+Enter)"
                style={{
                  padding: "0 6px",
                  height: "28px",
                  minHeight: "28px",
                  background: activeTheme.colors.bg,
                  color: activeTheme.colors.text,
                  borderColor: activeTheme.colors.border,
                  opacity: matches.length === 0 ? 0.4 : 1,
                  boxSizing: "border-box",
                }}
              >
                <ChevronUp size={13} />
              </button>

              {/* Next Match */}
              <button
                type="button"
                onClick={goToNextMatch}
                disabled={matches.length === 0}
                title="Next Match (Enter)"
                style={{
                  padding: "0 6px",
                  height: "28px",
                  minHeight: "28px",
                  background: activeTheme.colors.bg,
                  color: activeTheme.colors.text,
                  borderColor: activeTheme.colors.border,
                  opacity: matches.length === 0 ? 0.4 : 1,
                  boxSizing: "border-box",
                }}
              >
                <ChevronDown size={13} />
              </button>

              {/* Close Find */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                title="Close (Escape)"
                style={{
                  padding: "0 6px",
                  height: "28px",
                  minHeight: "28px",
                  background: "transparent",
                  border: "none",
                  color: activeTheme.colors.gutterText,
                  boxSizing: "border-box",
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}

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
              const lineMatches = matches.filter((m) => m.lineIndex === idx);

              // Check if line contains an import/from/require
              const isImportLine =
                /^(?:import|export|from|const|let|var)\b/.test(lineText.trim()) ||
                lineText.includes("require(") ||
                lineText.includes("import(");

              // Track character offset in line to match character spans
              let charOffset = 0;

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

                  {/* Line text */}
                  <div
                    style={{
                      flex: 1,
                      whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
                      wordBreak: settings.wordWrap ? "break-word" : "normal",
                      color: activeTheme.colors.text,
                      paddingLeft: "8px",
                    }}
                  >
                    {tokens.map((token, tokenIdx) => {
                      const tokenStart = charOffset;
                      const tokenEnd = charOffset + token.text.length;
                      charOffset = tokenEnd;

                      // Check if string token is a clickable import
                      let resolvedImportPath: string | null = null;
                      if (token.type === "string" && isImportLine && knownFilePaths.length > 0) {
                        resolvedImportPath = resolveImportPath(file.path, token.text, knownFilePaths);
                      }

                      // Check if this token intersects any search matches
                      const overlappingMatches = lineMatches.filter(
                        (m) => m.charStart < tokenEnd && m.charEnd > tokenStart
                      );

                      if (overlappingMatches.length === 0) {
                        // Regular token (or clickable import)
                        if (resolvedImportPath) {
                          return (
                            <span
                              key={tokenIdx}
                              onClick={() => handleNavigate(resolvedImportPath!)}
                              title={`Jump to ${resolvedImportPath} (Click to open)`}
                              style={{
                                color: activeTheme.colors.fn,
                                textDecoration: "underline",
                                textDecorationStyle: "dotted",
                                textUnderlineOffset: "3px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              className="hover:opacity-80"
                            >
                              {token.text}
                              <ExternalLink
                                size={10}
                                style={{
                                  display: "inline",
                                  marginLeft: "2px",
                                  verticalAlign: "middle",
                                }}
                              />
                            </span>
                          );
                        }

                        const tokenColor =
                          activeTheme.colors[token.type as keyof typeof activeTheme.colors] ||
                          activeTheme.colors.text;

                        return (
                          <span key={tokenIdx} style={{ color: tokenColor }}>
                            {token.text}
                          </span>
                        );
                      }

                      // Token intersects search match: render sub-segments with search highlighting
                      const segments: React.ReactNode[] = [];
                      let currentPos = tokenStart;

                      while (currentPos < tokenEnd) {
                        // Find match overlapping currentPos
                        const match = overlappingMatches.find(
                          (m) => m.charStart <= currentPos && m.charEnd > currentPos
                        );

                        if (match) {
                          const sliceEnd = Math.min(tokenEnd, match.charEnd);
                          const sliceText = token.text.slice(
                            currentPos - tokenStart,
                            sliceEnd - tokenStart
                          );

                          // Check if this match is the currently focused match
                          const matchGlobalIdx = matches.indexOf(match);
                          const isActiveMatch = matchGlobalIdx === currentMatchIndex;

                          segments.push(
                            <span
                              key={`${tokenIdx}-${currentPos}`}
                              style={{
                                background: isActiveMatch
                                  ? "#FF9632"
                                  : "rgba(255, 215, 0, 0.45)",
                                color: isActiveMatch ? "#000000" : "inherit",
                                outline: isActiveMatch
                                  ? "1px solid #FFFFFF"
                                  : "1px solid rgba(255, 215, 0, 0.7)",
                                fontWeight: isActiveMatch ? 700 : 500,
                              }}
                            >
                              {sliceText}
                            </span>
                          );
                          currentPos = sliceEnd;
                        } else {
                          // Find next match start or tokenEnd
                          const nextMatch = overlappingMatches
                            .filter((m) => m.charStart > currentPos)
                            .sort((a, b) => a.charStart - b.charStart)[0];

                          const sliceEnd = nextMatch
                            ? Math.min(tokenEnd, nextMatch.charStart)
                            : tokenEnd;

                          const sliceText = token.text.slice(
                            currentPos - tokenStart,
                            sliceEnd - tokenStart
                          );

                          const tokenColor =
                            activeTheme.colors[token.type as keyof typeof activeTheme.colors] ||
                            activeTheme.colors.text;

                          segments.push(
                            <span key={`${tokenIdx}-${currentPos}`} style={{ color: tokenColor }}>
                              {sliceText}
                            </span>
                          );
                          currentPos = sliceEnd;
                        }
                      }

                      return (
                        <span
                          key={tokenIdx}
                          onClick={
                            resolvedImportPath ? () => handleNavigate(resolvedImportPath!) : undefined
                          }
                          title={resolvedImportPath ? `Jump to ${resolvedImportPath}` : undefined}
                          style={{
                            cursor: resolvedImportPath ? "pointer" : "inherit",
                            textDecoration: resolvedImportPath ? "underline" : "none",
                          }}
                        >
                          {segments}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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
            {matches.length > 0 && searchQuery && (
              <span style={{ fontWeight: 600 }}>
                Match: {currentMatchIndex + 1}/{matches.length}
              </span>
            )}
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span style={{ textTransform: "uppercase" }}>{file.language}</span>
            <span style={{ fontWeight: 700 }}>{activeTheme.name.split(" ")[0]}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
