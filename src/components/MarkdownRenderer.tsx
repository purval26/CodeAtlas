"use client";
import React, { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import {
  tokenizeMarkdown,
  parseInlineTokens,
  isSafeMarkdownUrl,
  MarkdownBlock,
  InlineToken,
} from "@/utils/markdownParser";

export { isSafeMarkdownUrl };

interface MarkdownRendererProps {
  content: string;
  onCitationClick?: (filePath: string, startLine: number, endLine: number) => void;
}

const CodeBlockRenderer: React.FC<{ code: string; lang: string }> = ({
  code,
  lang,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        margin: "12px 0",
        background: "#141413",
        color: "#EDEAE4",
        border: "1.5px solid var(--border)",
        fontFamily: "'DM Mono', monospace",
        fontSize: "12px",
        overflow: "hidden",
        maxWidth: "100%",
        boxSizing: "border-box",
        borderRadius: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "#1E1D1B",
          borderBottom: "1px solid #2E2D2A",
          fontSize: "10px",
          fontWeight: 700,
          color: "#9E9A90",
          letterSpacing: "0.05em",
        }}
      >
        <span>{lang ? lang.toUpperCase() : "CODE"}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          style={{
            background: "transparent",
            border: "none",
            color: copied ? "var(--accent)" : "#9E9A90",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            padding: "2px 6px",
            minHeight: "20px",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? "COPIED" : "COPY"}</span>
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "12px 14px",
          overflowX: "auto",
          lineHeight: 1.55,
          whiteSpace: "pre",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onCitationClick,
}) => {
  const blocks = tokenizeMarkdown(content);

  const renderInline = (text: string): React.ReactNode => {
    const tokens: InlineToken[] = parseInlineTokens(text);

    return tokens.map((tok, idx) => {
      const key = `${idx}_${tok.type}`;
      switch (tok.type) {
        case "code":
          return (
            <code
              key={key}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--border)",
                padding: "1.5px 5px",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 600,
                color: "var(--ink)",
                borderRadius: "2px",
              }}
            >
              {tok.value}
            </code>
          );
        case "bold":
          return <strong key={key} style={{ fontWeight: 700 }}>{tok.value}</strong>;
        case "italic":
          return <em key={key}>{tok.value}</em>;
        case "link":
          if (!isSafeMarkdownUrl(tok.href)) {
            return (
              <span key={key} style={{ fontWeight: 600 }}>
                {tok.text}
              </span>
            );
          }
          return (
            <a
              key={key}
              href={tok.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--ink)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                fontWeight: 600,
              }}
            >
              {tok.text}
            </a>
          );
        case "citation": {
          const lineStr = `L${tok.startLine}${tok.endLine && tok.endLine !== tok.startLine ? `–${tok.endLine}` : ""}`;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (onCitationClick) {
                  onCitationClick(tok.file, tok.startLine, tok.endLine);
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "var(--paper)",
                border: "1.5px solid var(--border)",
                padding: "1px 6px",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                color: "var(--ink)",
                cursor: onCitationClick ? "pointer" : "default",
                margin: "1px 3px",
                verticalAlign: "middle",
                minHeight: "22px",
                maxWidth: "min(360px, 92vw)",
                boxSizing: "border-box",
                borderRadius: 0,
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--white)";
                e.currentTarget.style.borderColor = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--paper)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              title={`Jump to ${tok.file} (${lineStr}) in CodeViewer`}
              aria-label={`Open source reference ${tok.file} lines ${tok.startLine} to ${tok.endLine}`}
            >
              <FileText size={10} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {tok.file}
              </span>
              <span
                style={{
                  background: "var(--ink)",
                  color: "var(--white)",
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "0 4px",
                  flexShrink: 0,
                  letterSpacing: "0.02em",
                }}
              >
                {lineStr}
              </span>
            </button>
          );
        }
        case "text":
        default:
          return tok.value;
      }
    });
  };

  return (
    <div
      className="codeatlas-markdown-body"
      style={{
        fontSize: "15px",
        lineHeight: 1.65,
        color: "var(--ink)",
      }}
    >
      {blocks.map((block: MarkdownBlock, idx: number) => {
        // Suppress JSON citations block from raw markdown if present
        if (block.type === "code" && block.lang.toLowerCase() === "citations") {
          return null;
        }

        switch (block.type) {
          case "table": {
            return (
              <div
                key={idx}
                style={{
                  margin: "18px 0",
                  overflowX: "auto",
                  border: "1.5px solid var(--border)",
                  background: "var(--white)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                    fontFamily: "'DM Mono', monospace",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--paper)",
                        borderBottom: "1.5px solid var(--border)",
                      }}
                    >
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          style={{
                            padding: "10px 14px",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            textAlign: block.aligns[hIdx] || "left",
                            borderRight:
                              hIdx < block.headers.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                            color: "var(--ink)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom:
                            rIdx < block.rows.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                          background:
                            rIdx % 2 === 1 ? "rgba(0,0,0,0.015)" : "transparent",
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: "10px 14px",
                              textAlign: block.aligns[cIdx] || "left",
                              borderRight:
                                cIdx < row.length - 1
                                  ? "1px solid var(--border)"
                                  : "none",
                              color: "var(--ink)",
                              verticalAlign: "top",
                            }}
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case "code": {
            return (
              <CodeBlockRenderer
                key={idx}
                code={block.code}
                lang={block.lang}
              />
            );
          }

          case "heading": {
            const levelSizes: Record<number, string> = {
              1: "17px",
              2: "15px",
              3: "13px",
              4: "12px",
              5: "11px",
              6: "11px",
            };
            const size = levelSizes[block.level] || "13px";
            return (
              <div
                key={idx}
                style={{
                  fontSize: size,
                  fontWeight: 800,
                  marginTop: idx === 0 ? "4px" : "18px",
                  marginBottom: "8px",
                  paddingBottom: block.level <= 2 ? "5px" : "2px",
                  borderBottom: block.level <= 2 ? "1.5px solid var(--border)" : "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                }}
              >
                {renderInline(block.text)}
              </div>
            );
          }

          case "blockquote": {
            return (
              <blockquote
                key={idx}
                style={{
                  margin: "14px 0",
                  padding: "10px 16px",
                  borderLeft: "3.5px solid var(--accent)",
                  background: "rgba(216, 255, 62, 0.08)",
                  fontSize: "14px",
                  color: "var(--ink)",
                  fontStyle: "normal",
                }}
              >
                {renderInline(block.text)}
              </blockquote>
            );
          }

          case "unordered-list": {
            return (
              <ul
                key={idx}
                style={{
                  margin: "10px 0 14px 20px",
                  padding: 0,
                  listStyleType: "disc",
                }}
              >
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    style={{
                      marginBottom: "6px",
                      paddingLeft: "4px",
                    }}
                  >
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          }

          case "ordered-list": {
            return (
              <ol
                key={idx}
                style={{
                  margin: "10px 0 14px 22px",
                  padding: 0,
                  listStyleType: "decimal",
                }}
              >
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    style={{
                      marginBottom: "6px",
                      paddingLeft: "4px",
                    }}
                  >
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );
          }

          case "paragraph": {
            return (
              <p
                key={idx}
                style={{
                  margin: "0 0 12px 0",
                  lineHeight: 1.65,
                }}
              >
                {renderInline(block.text)}
              </p>
            );
          }

          case "divider": {
            return (
              <hr
                key={idx}
                style={{
                  border: "none",
                  borderTop: "1.5px solid var(--border)",
                  margin: "18px 0",
                  opacity: 0.8,
                }}
              />
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
