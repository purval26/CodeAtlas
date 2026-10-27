"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AskResponse, AskedQuestionSessionItem } from "@/types";
import { askCodeAtlas, askCodeAtlasStream, fetchAvailableModels } from "@/utils/api";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  X,
  Send,
  GitFork,
  FileText,
  AlertTriangle,
  Zap,
  Sparkles,
  History,
  PlusCircle,
  User,
  Bot,
  Sliders,
  Cpu,
} from "lucide-react";
import { useSettings } from "@/utils/settings";

interface AskCodeAtlasProps {
  repositoryId: string;
  onOpenSourceRange: (filePath: string, startLine: number, endLine: number) => void;
  onTriggerTrace: (startPath?: string, endPath?: string) => void;
  onClose: () => void;
  onOpenSettings?: () => void;
  sessionHistory?: AskedQuestionSessionItem[];
  onUpdateSessionHistory?: (history: AskedQuestionSessionItem[]) => void;
  activeQuestionId?: string | null;
  onSetActiveQuestionId?: (id: string | null) => void;
}

// Module-level fallback store ensuring session persistence even if parent props are omitted
let fallbackSessionHistory: AskedQuestionSessionItem[] = [];
let fallbackActiveQuestionId: string | null = null;

export const AskCodeAtlas: React.FC<AskCodeAtlasProps> = ({
  repositoryId,
  onOpenSourceRange,
  onTriggerTrace,
  onClose,
  onOpenSettings,
  sessionHistory,
  onUpdateSessionHistory,
  activeQuestionId,
  onSetActiveQuestionId,
}) => {
  const [settings, updateSettings] = useSettings();
  const history = sessionHistory ?? fallbackSessionHistory;
  const updateHistory = (newHistory: AskedQuestionSessionItem[]) => {
    if (onUpdateSessionHistory) {
      onUpdateSessionHistory(newHistory);
    } else {
      fallbackSessionHistory = newHistory;
    }
  };

  const activeId = activeQuestionId !== undefined ? activeQuestionId : fallbackActiveQuestionId;
  const setActiveId = (id: string | null) => {
    if (onSetActiveQuestionId) {
      onSetActiveQuestionId(id);
    } else {
      fallbackActiveQuestionId = id;
    }
  };

  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Free vs Paid vs Custom Mode toggle and Model Selector
  const [aiMode, setAiMode] = useState<"free" | "paid" | "custom">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codeatlas_ai_mode");
      if (saved === "free" || saved === "paid" || saved === "custom") return saved;
    }
    return "free";
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codeatlas_selected_model");
      if (saved) return saved;
    }
    return "nvidia/nemotron-3-ultra-550b-a55b:free";
  });

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Dynamically verify working models on site load
  useEffect(() => {
    let mounted = true;
    fetchAvailableModels(settings.customApiKey)
      .then((data) => {
        if (!mounted) return;
        setHasApiKey(Boolean(data.hasApiKey));
        const live = data.models || [];
        setAvailableModels(live);

        // Dynamic fallback: if currently selected model is missing from live working models and not in customModels,
        // automatically fallback to the live working default model.
        if (live.length > 0) {
          const isAlive =
            live.some((m: any) => m.id === selectedModel) ||
            settings.customModels.some((m) => m.id === selectedModel);

          if (!isAlive) {
            const fallback = data.defaultFree || live[0].id;
            setSelectedModel(fallback);
            updateSettings({ selectedModel: fallback });
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setHasApiKey(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [settings.customApiKey, selectedModel, settings.customModels, updateSettings]);

  // Restore active or most recent session question on modal open (persists until page refresh)
  useEffect(() => {
    if (activeId) {
      const activeItem = history.find((h) => h.id === activeId);
      if (activeItem) {
        setResponse(activeItem.response);
        setSubmittedQuestion(activeItem.question);
        setAiMode(activeItem.mode);
        setSelectedModel(activeItem.model);
        return;
      }
    } else if (history.length > 0 && !response) {
      const latest = history[0];
      setActiveId(latest.id);
      setResponse(latest.response);
      setSubmittedQuestion(latest.question);
      setAiMode(latest.mode);
      setSelectedModel(latest.model);
    }
  }, [activeId]);

  // Auto-resize textarea on input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(42, Math.min(textareaRef.current.scrollHeight, 120))}px`;
    }
  }, [question]);

  // Focus textarea when modal opens or active question changes
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeId]);

  // Auto-scroll conversation to bottom when response or loading state updates
  useEffect(() => {
    if (response || loading || error) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [response, loading, error]);

  const handleModeChange = (newMode: "free" | "paid") => {
    setAiMode(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("codeatlas_ai_mode", newMode);
    }
    if (newMode === "free" && !selectedModel.includes(":free")) {
      const defaultFree = "nvidia/nemotron-3-ultra-550b-a55b:free";
      setSelectedModel(defaultFree);
      if (typeof window !== "undefined") {
        localStorage.setItem("codeatlas_selected_model", defaultFree);
      }
    } else if (newMode === "paid" && selectedModel.includes(":free")) {
      const defaultPaid = "google/gemini-3.8-flash";
      setSelectedModel(defaultPaid);
      if (typeof window !== "undefined") {
        localStorage.setItem("codeatlas_selected_model", defaultPaid);
      }
    }
  };

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    const newMode: "free" | "paid" = newModel.includes(":free") ? "free" : "paid";
    setAiMode(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("codeatlas_selected_model", newModel);
      localStorage.setItem("codeatlas_ai_mode", newMode);
    }
  };

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

  const handleAsk = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) return;

    // Check if question was already answered in session history to avoid unnecessary reruns
    const existing = history.find(
      (h) => h.question.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing && existing.response) {
      setActiveId(existing.id);
      setResponse(existing.response);
      setSubmittedQuestion(existing.question);
      setQuestion("");
      setAiMode(existing.mode);
      setSelectedModel(existing.model);
      setError(null);
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    setError(null);
    setSubmittedQuestion(trimmed);
    setQuestion("");

    let accumulated = "";
    setResponse({
      answer: "",
      verifiedCitations: [],
      insufficientEvidence: false,
      modelUsed: selectedModel,
      mode: aiMode,
    });

    try {
      let res: AskResponse;
      try {
        res = await askCodeAtlasStream(repositoryId, trimmed, {
          mode: aiMode,
          model: selectedModel,
          apiKey: settings.customApiKey || undefined,
          provider: settings.customApiProvider,
          baseUrl: settings.customApiBaseUrl || undefined,
          onToken: (token) => {
            accumulated += token;
            setResponse({
              answer: accumulated,
              verifiedCitations: [],
              insufficientEvidence: false,
              modelUsed: selectedModel,
              mode: aiMode,
            });
          },
        });
      } catch (streamErr: any) {
        if (!accumulated) {
          res = await askCodeAtlas(repositoryId, trimmed, {
            mode: aiMode,
            model: selectedModel,
            apiKey: settings.customApiKey || undefined,
            provider: settings.customApiProvider,
            baseUrl: settings.customApiBaseUrl || undefined,
          });
        } else {
          throw streamErr;
        }
      }

      setResponse(res);

      // Persist in session history until page refresh
      const newItem: AskedQuestionSessionItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        question: trimmed,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: res.modelUsed || selectedModel,
        mode: res.mode || aiMode,
      };

      const nextHistory = [
        newItem,
        ...history.filter((h) => h.question.toLowerCase() !== trimmed.toLowerCase()),
      ];
      updateHistory(nextHistory);
      setActiveId(newItem.id);
    } catch (err: any) {
      setError(err.message || "Failed to get answer");
      setQuestion(trimmed); // Restore on error so user doesn't lose text
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !loading) {
      handleAsk(question);
    }
  };

  const handleNewChat = () => {
    setActiveId(null);
    setResponse(null);
    setSubmittedQuestion("");
    setQuestion("");
    setError(null);
    textareaRef.current?.focus();
  };

  const hasActiveConversation = Boolean(submittedQuestion || response || loading || error);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-label="Ask CodeAtlas Intelligence"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(2px)",
        zIndex: 140,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "max(6px, var(--sab))",
        paddingLeft: "max(8px, var(--sal))",
        paddingRight: "max(8px, var(--sar))",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 400 }}
        style={{
          width: "min(960px, 100%)",
          maxHeight: "min(82vh, 660px)",
          height: hasActiveConversation ? "min(82vh, 660px)" : "auto",
          background: "var(--paper)",
          border: "2px solid var(--border)",
          borderBottom: "none",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.28)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: "8px 14px",
            borderBottom: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--white)",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              className="font-mono"
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--muted)",
                letterSpacing: "0.08em",
              }}
            >
              BOUNDED INTELLIGENCE
            </div>
            <span style={{ color: "var(--border)", fontWeight: 700, fontSize: "11px" }}>/</span>
            <h2 style={{ fontSize: "14px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              ASK CODEATLAS
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {history.length > 0 && hasActiveConversation && (
              <button
                type="button"
                onClick={handleNewChat}
                aria-label="Start new question"
                style={{
                  padding: "0 10px",
                  height: "30px",
                  minHeight: "30px",
                  fontSize: "11px",
                  gap: "4px",
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 800,
                  background: "var(--paper)",
                  boxSizing: "border-box",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <PlusCircle size={11} />
                <span>NEW</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close Ask CodeAtlas"
              style={{
                padding: "0 10px",
                height: "30px",
                minHeight: "30px",
                fontSize: "11px",
                gap: "4px",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <X size={13} />
              <span>CLOSE</span>
            </button>
          </div>
        </div>

        {/* Session History Strip (Horizontal chip switcher) */}
        {history.length > 0 && (
          <div
            style={{
              padding: "4px 14px",
              borderBottom: "1px solid var(--border)",
              background: "var(--paper)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--muted)",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <History size={11} />
              <span>HISTORY ({history.length}):</span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                flex: 1,
              }}
            >
              {history.map((item, idx) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      setSubmittedQuestion(item.question);
                      setQuestion("");
                      setResponse(item.response);
                      setError(null);
                      setAiMode(item.mode);
                      setSelectedModel(item.model);
                    }}
                    style={{
                      padding: "2px 8px",
                      fontSize: "10px",
                      fontFamily: "'DM Mono', monospace",
                      background: isActive ? "var(--ink)" : "var(--white)",
                      color: isActive ? "var(--white)" : "var(--ink)",
                      border: isActive ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                      fontWeight: isActive ? 800 : 500,
                      minHeight: "22px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        color: isActive ? "var(--accent)" : "var(--muted)",
                      }}
                    >
                      {isActive ? "●" : `#${history.length - idx}`}
                    </span>
                    <span
                      style={{
                        maxWidth: "180px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.question}
                    </span>
                    <span
                      style={{
                        fontSize: "8px",
                        fontWeight: 800,
                        padding: "0 3px",
                        background: isActive ? "var(--accent)" : "var(--paper)",
                        color: isActive ? "#11100F" : "var(--muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {item.mode.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Offline Synthesizer Mode Banner when no API key configured */}
        {hasApiKey === false && (
          <div
            className="font-mono"
            style={{
              padding: "6px 14px",
              background: "#FFFBEB",
              borderBottom: "1.5px solid #FCD34D",
              color: "#92400E",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexShrink: 0,
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <AlertTriangle size={13} style={{ color: "#D97706", flexShrink: 0 }} />
              <span>
                <strong>OFFLINE MODE:</strong> No API key configured. Answering via CodeAtlas Deterministic Synthesizer.
              </span>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  height: "24px",
                  minHeight: "24px",
                  padding: "0 8px",
                  fontSize: "10px",
                  background: "#D97706",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                + ENTER API KEY / ADD MODEL
              </button>
            )}
          </div>
        )}

        {/* Conversation Stream Area (Messages above input) */}
        <div
          className="touch-pan-y"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            minHeight: hasActiveConversation ? "160px" : "80px",
          }}
        >
          {/* Empty State when no question asked yet */}
          {!hasActiveConversation && (
            <div
              style={{
                textAlign: "center",
                padding: "20px 12px 16px 12px",
                color: "var(--muted)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  background: "var(--ink)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={20} />
              </div>
              <div
                className="font-mono"
                style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", letterSpacing: "0.04em" }}
              >
                ASK CODEATLAS ARCHITECTURE INTELLIGENCE
              </div>
              <div style={{ fontSize: "12px", maxWidth: "520px", margin: "0 auto", lineHeight: 1.5 }}>
                Ask anything about repository structure, component dependencies, state flow, or data pipelines.
                Every answer is grounded in AST analysis with clickable line citations.
              </div>
            </div>
          )}

          {/* User Prompt Message Card */}
          {submittedQuestion && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  maxWidth: "min(680px, 90%)",
                  background: "var(--ink)",
                  color: "var(--white)",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  className="font-mono"
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "var(--accent)",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <User size={11} />
                  <span>YOU</span>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.45",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {submittedQuestion}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              className="font-mono"
              style={{
                border: "1.5px solid #FF3B30",
                background: "rgba(255, 59, 48, 0.08)",
                padding: "12px 16px",
                fontSize: "13px",
              }}
            >
              <strong>ERROR:</strong> {error}
            </div>
          )}

          {/* Live Architecture Analysis Progress Card (Indeterminate State) */}
          {loading && !response?.answer && (
            <div
              style={{
                border: "1.5px solid var(--border)",
                background: "var(--white)",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                overflow: "hidden",
              }}
            >
              {/* Indeterminate Activity Bar */}
              <div className="indeterminate-bar" />

              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "var(--ink)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "var(--muted)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ANALYZING REPOSITORY ARCHITECTURE
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>
                      Grounding question in verified codebase evidence...
                    </div>
                  </div>
                </div>

                <div
                  className="font-mono"
                  style={{
                    padding: "8px 12px",
                    background: "var(--paper)",
                    border: "1px solid var(--border)",
                    fontSize: "11px",
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <span>
                    Model: <strong>{selectedModel.split("/")[1] || selectedModel}</strong>
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "10px", fontWeight: 700 }}>
                    AST SYMBOLS · BOUNDED CONTEXT · CITATIONS
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Assistant Answer & Verified Citations */}
          {response && (Boolean(response.answer) || !loading) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Insufficient evidence alert */}
              {response.insufficientEvidence && (
                <div
                  style={{
                    border: "1.5px solid #FF9500",
                    background: "rgba(255, 149, 0, 0.08)",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <AlertTriangle size={18} style={{ color: "#FF9500", flexShrink: 0 }} />
                  <div>
                    <div
                      className="font-mono"
                      style={{ fontSize: "11px", fontWeight: 700, color: "#FF9500" }}
                    >
                      INSUFFICIENT EVIDENCE
                    </div>
                    <div style={{ fontSize: "12px", marginTop: "2px" }}>
                      CodeAtlas could not find enough repository evidence to answer this confidently.
                    </div>
                  </div>
                </div>
              )}

              {/* Grounded Answer Card */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 12px",
                    background: "var(--white)",
                    border: "1.5px solid var(--border)",
                    borderBottom: "none",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "var(--ink)",
                      letterSpacing: "0.08em",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        background: isStreaming ? "#10B981" : "var(--accent)",
                        border: "1px solid var(--ink)",
                        borderRadius: isStreaming ? "50%" : 0,
                      }}
                    />
                    <span>{isStreaming ? "STREAMING ARCHITECTURE ANSWER..." : "GROUNDED ARCHITECTURE ANSWER"}</span>
                  </div>
                  {response.modelUsed && (
                    <div
                      className="font-mono"
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        border: "1px solid var(--border)",
                        background: response.mode === "paid" ? "var(--accent)" : "var(--paper)",
                        color: "#11100F",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>
                        MODEL:{" "}
                        {response.modelUsed.includes("deterministic-synthesizer")
                          ? "CodeAtlas Synthesizer (Offline Mode)"
                          : response.modelUsed.split("/")[1] || response.modelUsed}
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 800,
                          padding: "1px 4px",
                          background: response.modelUsed.includes("deterministic-synthesizer")
                            ? "#D97706"
                            : "#11100F",
                          color: "var(--white)",
                        }}
                      >
                        {response.modelUsed.includes("deterministic-synthesizer")
                          ? "OFFLINE"
                          : response.mode === "paid"
                          ? "PAID"
                          : "FREE"}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    border: "1.5px solid var(--border)",
                    borderLeft: "4px solid var(--accent)",
                    background: "var(--white)",
                    padding: "16px 18px",
                  }}
                >
                  <MarkdownRenderer
                    content={response.answer + (isStreaming ? " ▋" : "")}
                    onCitationClick={(filePath, startLine, endLine) =>
                      onOpenSourceRange(filePath, startLine, endLine)
                    }
                  />

                  {response.modelUsed?.includes("deterministic-synthesizer") && (
                    <div
                      className="font-mono"
                      style={{
                        marginTop: "12px",
                        padding: "8px 12px",
                        background: "#FFFBEB",
                        border: "1px solid #FCD34D",
                        color: "#92400E",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        lineHeight: 1.4,
                      }}
                    >
                      <AlertTriangle size={14} style={{ color: "#D97706", flexShrink: 0 }} />
                      <span>
                        Answered via local deterministic AST synthesizer. To use live Nemotron 3 Ultra or Gemini models, add your free <code>OPENROUTER_API_KEY</code> to <code>.env</code>.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified Evidence Citations */}
              {response.verifiedCitations.length > 0 && (
                <div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "var(--muted)",
                      marginBottom: "8px",
                      letterSpacing: "0.08em",
                    }}
                  >
                    VERIFIED EVIDENCE ({response.verifiedCitations.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {response.verifiedCitations.map((cit, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          onOpenSourceRange(cit.filePath, cit.startLine, cit.endLine)
                        }
                        className="font-mono"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 12px",
                          border: "1.5px solid var(--border)",
                          background: "var(--white)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          minHeight: "34px",
                          gap: "8px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--hover-bg)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--white)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <FileText size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "12px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cit.filePath}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          <span
                            style={{
                              background: "var(--paper)",
                              border: "1px solid var(--border)",
                              padding: "1px 6px",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}
                          >
                            L{cit.startLine}–L{cit.endLine}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                            [OPEN]
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action shortcuts */}
              {!isStreaming && response.verifiedCitations.length > 0 && (
                <div
                  style={{
                    borderTop: "1.5px solid var(--border)",
                    paddingTop: "10px",
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() => {
                      const firstCite = response.verifiedCitations[0]?.filePath;
                      const lastCite = response.verifiedCitations[response.verifiedCitations.length - 1]?.filePath;
                      onTriggerTrace(firstCite, lastCite !== firstCite ? lastCite : undefined);
                    }}
                    className="btn-primary"
                    style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px" }}
                  >
                    <GitFork size={13} />
                    <span>TRACE FLOW</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* AI Chat Input Composer (docked at the bottom) */}
        <div
          style={{
            padding: "10px 14px",
            background: "var(--paper)",
            borderTop: "1.5px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              border: "2px solid var(--ink)",
              background: "var(--white)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            {/* Multi-line Textarea */}
            <div style={{ padding: "8px 12px 2px 12px", display: "flex" }}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask CodeAtlas about architecture, data flow, dependencies... (Enter to send, Shift+Enter for newline)"
                aria-label="Repository Question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (question.trim() && !loading) {
                      handleAsk(question);
                    }
                  }
                }}
                disabled={loading}
                style={{
                  width: "100%",
                  minHeight: "42px",
                  maxHeight: "120px",
                  resize: "none",
                  border: "none",
                  outline: "none",
                  padding: 0,
                  background: "transparent",
                  color: "var(--ink)",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                }}
              />
            </div>

            {/* Integrated Toolbar inside the Chat Composer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px 8px 10px",
                background: "var(--white)",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {/* Left side: Mode toggle & Model select */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1, minWidth: "220px" }}>
                {/* Mode Toggle Button Group */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "var(--paper)",
                    border: "1px solid var(--border)",
                    padding: "2px",
                    gap: "2px",
                    height: "32px",
                    minHeight: "32px",
                    boxSizing: "border-box",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleModeChange("free")}
                    aria-pressed={aiMode === "free"}
                    aria-label="Free Model Mode"
                    style={{
                      background: aiMode === "free" ? "var(--ink)" : "transparent",
                      color: aiMode === "free" ? "var(--white)" : "var(--ink)",
                      border: "none",
                      padding: "0 8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      fontFamily: "'DM Mono', monospace",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      height: "100%",
                      minHeight: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <Zap size={11} style={{ color: aiMode === "free" ? "var(--accent)" : "inherit" }} />
                    <span>FREE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("paid")}
                    aria-pressed={aiMode === "paid"}
                    aria-label="Paid Model Mode"
                    style={{
                      background: aiMode === "paid" ? "var(--accent)" : "transparent",
                      color: "var(--ink)",
                      border: "none",
                      padding: "0 8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      fontFamily: "'DM Mono', monospace",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      height: "100%",
                      minHeight: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <Sparkles size={11} />
                    <span>PAID</span>
                  </button>
                </div>

                {/* Compact Model dropdown */}
                <select
                  id="codeatlas-model-select"
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={loading}
                  aria-label="Choose Model"
                  className="font-mono"
                  style={{
                    padding: "0 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    border: "1px solid var(--border)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    outline: "none",
                    cursor: "pointer",
                    maxWidth: "280px",
                    height: "32px",
                    minHeight: "32px",
                    boxSizing: "border-box",
                  }}
                >
                  {settings.customModels.length > 0 && (
                    <optgroup label="CUSTOM MODELS (User Configured)">
                      {settings.customModels.map((cm) => (
                        <option key={cm.id} value={cm.id}>
                          [CUSTOM] {cm.name}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Dynamically verified working free models */}
                  {availableModels.filter((m) => m.mode === "free").length > 0 && (
                    <optgroup label={hasApiKey ? "VERIFIED FREE MODELS (OpenRouter)" : "AVAILABLE OFFLINE (No API Key)"}>
                      {availableModels
                        .filter((m) => m.mode === "free")
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id.startsWith("codeatlas/") ? "[OFFLINE] " : "[FREE] "}
                            {m.name.replace(/^\[(FREE|PAID|OFFLINE)\]\s*/i, "")}
                          </option>
                        ))}
                    </optgroup>
                  )}

                  {/* Dynamically verified working paid models */}
                  {hasApiKey && availableModels.filter((m) => m.mode === "paid").length > 0 && (
                    <optgroup label="PAID MODELS (OpenRouter)">
                      {availableModels
                        .filter((m) => m.mode === "paid")
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            [PAID] {m.name.replace(/^\[(FREE|PAID)\]\s*/i, "")}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>

                {/* Settings shortcut button */}
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    title="Configure Custom Models & API Key in Settings"
                    style={{
                      height: "32px",
                      minHeight: "32px",
                      padding: "0 10px",
                      fontSize: "11px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      boxSizing: "border-box",
                    }}
                  >
                    <Sliders size={12} />
                    <span className="font-mono">CUSTOM MODELS</span>
                  </button>
                )}
              </div>

              {/* Right side: Send button */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  aria-label="Send Question"
                  style={{
                    background: question.trim() && !loading ? "var(--ink)" : "var(--paper)",
                    color: question.trim() && !loading ? "var(--accent)" : "var(--muted)",
                    border: "1.5px solid var(--ink)",
                    padding: "0 16px",
                    height: "32px",
                    minHeight: "32px",
                    fontSize: "11px",
                    fontWeight: 800,
                    fontFamily: "'DM Mono', monospace",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: question.trim() && !loading ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                    boxSizing: "border-box",
                  }}
                >
                  <span>{loading ? "ANALYZING..." : "SEND"}</span>
                  <Send size={12} />
                </button>
              </div>
            </div>
          </form>

          {/* Micro-hint bar */}
          <div
            className="font-mono"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "5px",
              padding: "0 2px",
              fontSize: "9px",
              color: "var(--muted)",
              letterSpacing: "0.04em",
            }}
          >
            <span>100% GROUNDED · AST RETRIEVAL · ZERO HALLUCINATION</span>
            <span>ENTER TO SEND · SHIFT+ENTER FOR NEWLINE</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
