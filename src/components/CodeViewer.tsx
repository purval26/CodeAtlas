"use client";
import React, { useEffect, useRef } from "react";
import { CodeFile, CodeSymbol } from "@/types";
import { X, FileCode } from "lucide-react";

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

  // Clear stale line refs when active file changes to prevent memory leak
  useEffect(() => {
    lineRefs.current = {};
  }, [file.path]);

  // Auto-scroll to target cited range
  useEffect(() => {
    if (targetLineRange && targetLineRange.startLine) {
      const el = lineRefs.current[targetLineRange.startLine];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [targetLineRange, file.path]);

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

  const lines = file.content.split("\n");

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
          width: "min(960px, 100vw)",
          height: "100%",
          background: "var(--paper)",
          borderLeft: "2px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.2)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--white)",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <FileCode size={18} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div
                className="font-mono"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={file.path}
              >
                {file.path}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "2px",
                }}
              >
                <span>{file.lineCount} LINES</span>
                <span>·</span>
                <span>{file.language.toUpperCase()}</span>
                {targetLineRange && (
                  <span
                    style={{
                      background: "var(--accent)",
                      color: "#11100F",
                      padding: "1px 6px",
                      fontWeight: 700,
                      fontSize: "10px",
                    }}
                  >
                    TARGET: L{targetLineRange.startLine}–L{targetLineRange.endLine}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Code Viewer"
            style={{
              padding: "6px 12px",
              minHeight: "36px",
              fontSize: "12px",
              flexShrink: 0,
            }}
          >
            <X size={14} />
            <span style={{ display: "inline-block" }}>CLOSE</span>
          </button>
        </div>

        {/* Code Content with Line Numbers (horizontal scroll inside viewer container only) */}
        <div
          className="font-mono touch-pan-y"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "auto",
            padding: "16px 0",
            background: "var(--code)",
            color: "#F3EFE5",
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

            return (
              <div
                key={lineNum}
                ref={(el) => {
                  lineRefs.current[lineNum] = el;
                }}
                style={{
                  display: "flex",
                  background: isCited
                    ? "rgba(216, 255, 62, 0.22)"
                    : "transparent",
                  borderLeft: isCited
                    ? "4px solid var(--accent)"
                    : "4px solid transparent",
                  paddingRight: "16px",
                  minWidth: "fit-content",
                }}
              >
                {/* Line number gutter */}
                <div
                  style={{
                    width: "52px",
                    textAlign: "right",
                    paddingRight: "16px",
                    userSelect: "none",
                    color: isCited ? "var(--accent)" : "#5C5953",
                    fontWeight: isCited ? 700 : 400,
                    flexShrink: 0,
                  }}
                >
                  {lineNum}
                </div>

                {/* Line text */}
                <div
                  style={{
                    flex: 1,
                    whiteSpace: "pre",
                    color: isCited ? "#FFFFFF" : "#E4DFD3",
                  }}
                >
                  {lineText || " "}
                </div>
              </div>
            );
          })}
        </div>

        {/* Symbols index at footer */}
        {symbols.length > 0 && (
          <div
            style={{
              padding: "8px 14px",
              borderTop: "1px solid var(--border)",
              background: "var(--paper)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}
            >
              JUMP SYMBOL:
            </span>
            {symbols.slice(0, 10).map((sym) => (
              <button
                key={sym.id}
                onClick={() => {
                  const el = lineRefs.current[sym.startLine];
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  minHeight: "26px",
                  fontFamily: "DM Mono",
                  flexShrink: 0,
                }}
              >
                <span>{sym.name}</span>
                <span style={{ color: "var(--muted)" }}>:{sym.startLine}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
