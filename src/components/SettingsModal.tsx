"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Sliders,
  Cpu,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  Code,
  Palette,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  useSettings,
  POPULAR_MODEL_PRESETS,
  DEFAULT_SETTINGS,
} from "@/utils/settings";
import {
  CustomModelConfig,
  ApiProviderType,
  GraphLayoutMode,
  GraphEdgeStyle,
  EdgeDensityMode,
  AVAILABLE_MODELS,
} from "@/types";
import { fetchAvailableModels } from "@/utils/api";

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: "ai" | "canvas" | "editor" | "appearance";
}

type TabType = "ai" | "canvas" | "editor" | "appearance";

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  initialTab = "ai",
}) => {
  const [settings, updateSettings] = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // API Key Visibility
  const [showApiKey, setShowApiKey] = useState(false);

  // New Custom Model Form State
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [newModelContext, setNewModelContext] = useState("128k tokens");
  const [newModelDescription, setNewModelDescription] = useState("");
  const [newModelSupportsReasoning, setNewModelSupportsReasoning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [liveVerifiedModels, setLiveVerifiedModels] = useState<any[]>(AVAILABLE_MODELS);

  // Dynamically verify active models on site load
  useEffect(() => {
    let mounted = true;
    fetchAvailableModels(settings.customApiKey)
      .then((data) => {
        if (mounted && data.models && data.models.length > 0) {
          setLiveVerifiedModels(data.models);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [settings.customApiKey]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle Add Custom Model
  const handleAddCustomModel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    const trimmedId = newModelId.trim();
    if (!trimmedId) {
      setFormError("Model Identifier (e.g. 'deepseek/deepseek-r1') is required.");
      return;
    }

    // Check for duplicates
    if (
      settings.customModels.some((m) => m.id === trimmedId) ||
      AVAILABLE_MODELS.some((m) => m.id === trimmedId)
    ) {
      setFormError(`Model '${trimmedId}' is already added.`);
      return;
    }

    const name = newModelName.trim() || trimmedId.split("/").pop() || trimmedId;
    const newModel: CustomModelConfig = {
      id: trimmedId,
      name,
      provider: settings.customApiProvider,
      context: newModelContext.trim() || "128k tokens",
      description: newModelDescription.trim() || "Custom user-configured AI model",
      supportsReasoning: newModelSupportsReasoning,
    };

    const updated = [...settings.customModels, newModel];
    updateSettings({
      customModels: updated,
      selectedModel: trimmedId,
      aiMode: "custom",
    });

    // Reset form
    setNewModelId("");
    setNewModelName("");
    setNewModelDescription("");
    setNewModelSupportsReasoning(false);
  };

  const handleAddPreset = (preset: CustomModelConfig) => {
    if (settings.customModels.some((m) => m.id === preset.id)) return;
    const updated = [...settings.customModels, preset];
    updateSettings({
      customModels: updated,
      selectedModel: preset.id,
      aiMode: "custom",
    });
  };

  const handleRemoveCustomModel = (id: string) => {
    const updated = settings.customModels.filter((m) => m.id !== id);
    const updates: any = { customModels: updated };
    if (settings.selectedModel === id) {
      updates.selectedModel = "nvidia/nemotron-3-ultra-550b-a55b:free";
      updates.aiMode = "free";
    }
    updateSettings(updates);
  };

  const handleSelectActiveModel = (modelId: string) => {
    const isCustom = settings.customModels.some((m) => m.id === modelId);
    const isPaid = AVAILABLE_MODELS.find((m) => m.id === modelId)?.mode === "paid";
    updateSettings({
      selectedModel: modelId,
      aiMode: isCustom ? "custom" : isPaid ? "paid" : "free",
    });
  };

  const handleTestApiKey = async () => {
    const key = settings.customApiKey.trim();
    if (!key) {
      setTestStatus("error");
      setTestMessage("Please enter an API key to test.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Testing API authentication...");

    try {
      const targetUrl = "https://openrouter.ai/api/v1/auth/key";

      const res = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (res.ok) {
        setTestStatus("success");
        setTestMessage("API Key verified successfully! Connection established.");
      } else {
        // If provider doesn't support /models or /auth/key or returned 401
        if (res.status === 401 || res.status === 403) {
          setTestStatus("error");
          setTestMessage(`Authentication failed (${res.status}): Invalid API key.`);
        } else {
          setTestStatus("success");
          setTestMessage(`Provider responded (HTTP ${res.status}).`);
        }
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage("Could not verify the key from this browser. You can still save it for this session.");
    }
  };

  const allAvailableModels = [
    ...liveVerifiedModels,
    ...settings.customModels.map((cm) => ({
      id: cm.id,
      name: cm.name,
      mode: "custom" as const,
      description: cm.description || "Custom model",
      context: cm.context,
      supportsReasoning: cm.supportsReasoning,
      isCustom: true,
    })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-modal="true"
      aria-label="CodeAtlas Settings"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 8 }}
        transition={{ type: "spring", damping: 32, stiffness: 420 }}
        className="settings-modal-card"
        style={{
          background: "var(--paper)",
          border: "2px solid var(--border)",
          boxShadow: "0 20px 48px rgba(0,0,0,0.4)",
          width: "100%",
          maxWidth: "780px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--white)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Sliders size={16} style={{ color: "var(--ink)" }} />
            <span
              className="font-mono"
              style={{
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              CODEATLAS PREFERENCES & CUSTOMIZATION
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Settings"
            style={{
              padding: "4px 8px",
              height: "30px",
              minHeight: "30px",
              fontSize: "11px",
              boxSizing: "border-box",
            }}
          >
            <X size={14} />
            <span className="font-mono">ESC</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderBottom: "1.5px solid var(--border)",
            background: "var(--paper)",
          }}
        >
          <button
            onClick={() => setActiveTab("ai")}
            className="font-mono"
            style={{
              border: "none",
              borderRight: "1px solid var(--border)",
              borderBottom: activeTab === "ai" ? "3px solid var(--ink)" : "3px solid transparent",
              background: activeTab === "ai" ? "var(--white)" : "transparent",
              color: activeTab === "ai" ? "var(--ink)" : "var(--muted)",
              fontWeight: activeTab === "ai" ? 800 : 600,
              padding: "10px 8px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            <Cpu size={13} />
            <span>AI & MODELS</span>
          </button>

          <button
            onClick={() => setActiveTab("canvas")}
            className="font-mono"
            style={{
              border: "none",
              borderRight: "1px solid var(--border)",
              borderBottom: activeTab === "canvas" ? "3px solid var(--ink)" : "3px solid transparent",
              background: activeTab === "canvas" ? "var(--white)" : "transparent",
              color: activeTab === "canvas" ? "var(--ink)" : "var(--muted)",
              fontWeight: activeTab === "canvas" ? 800 : 600,
              padding: "10px 8px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            <Layers size={13} />
            <span>GRAPH CANVAS</span>
          </button>

          <button
            onClick={() => setActiveTab("editor")}
            className="font-mono"
            style={{
              border: "none",
              borderRight: "1px solid var(--border)",
              borderBottom: activeTab === "editor" ? "3px solid var(--ink)" : "3px solid transparent",
              background: activeTab === "editor" ? "var(--white)" : "transparent",
              color: activeTab === "editor" ? "var(--ink)" : "var(--muted)",
              fontWeight: activeTab === "editor" ? 800 : 600,
              padding: "10px 8px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            <Code size={13} />
            <span>CODE VIEWER</span>
          </button>

          <button
            onClick={() => setActiveTab("appearance")}
            className="font-mono"
            style={{
              border: "none",
              borderBottom: activeTab === "appearance" ? "3px solid var(--ink)" : "3px solid transparent",
              background: activeTab === "appearance" ? "var(--white)" : "transparent",
              color: activeTab === "appearance" ? "var(--ink)" : "var(--muted)",
              fontWeight: activeTab === "appearance" ? 800 : 600,
              padding: "10px 8px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            <Palette size={13} />
            <span>APPEARANCE</span>
          </button>
        </div>

        {/* Tab Body */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* ======================================================== */}
          {/* TAB 1: AI & CUSTOM MODELS */}
          {/* ======================================================== */}
          {activeTab === "ai" && (
            <>
              {/* SECTION 1: API KEY & PROVIDER */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={16} style={{ color: "var(--ink)" }} />
                    <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                      01 API KEY & PROVIDER CONFIGURATION
                    </span>
                  </div>

                  <span
                    className="font-mono"
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      background: settings.customApiKey ? "#10B981" : "var(--muted)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                    }}
                  >
                    {settings.customApiKey ? "CUSTOM KEY CONFIGURED" : "SERVER SYNTHESIZER / DEFAULT"}
                  </span>
                </div>

                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                  Provide your own API key to query custom models, reasoning models (DeepSeek R1, Claude 3.5, GPT-4o),
                  or higher throughput models without rate-limiting. Stored strictly in your browser.
                </p>

                {/* Provider Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="font-mono" style={{ fontSize: "11px", fontWeight: 700 }}>
                    PROVIDER / GATEWAY:
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {(
                      [
                        { id: "openrouter", label: "OpenRouter (Recommended - 200+ Models)" },
                        { id: "openai", label: "OpenAI" },
                        { id: "gemini", label: "Google Gemini" },
                        { id: "anthropic", label: "Anthropic" },
                        { id: "custom", label: "Custom / Local (Ollama / vLLM)" },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateSettings({ customApiProvider: p.id })}
                        style={{
                          height: "32px",
                          minHeight: "32px",
                          fontSize: "11px",
                          padding: "0 10px",
                          background: settings.customApiProvider === p.id ? "var(--ink)" : "var(--paper)",
                          color: settings.customApiProvider === p.id ? "var(--white)" : "var(--ink)",
                          borderColor: settings.customApiProvider === p.id ? "var(--ink)" : "var(--border)",
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="font-mono" style={{ fontSize: "11px", fontWeight: 700 }}>
                    API KEY:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={settings.customApiKey}
                        onChange={(e) => updateSettings({ customApiKey: e.target.value.trim() })}
                        placeholder={
                          settings.customApiProvider === "openrouter"
                            ? "sk-or-v1-..."
                            : settings.customApiProvider === "gemini"
                            ? "AIza..."
                            : "sk-..."
                        }
                        className="font-mono"
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 36px 0 10px",
                          fontSize: "12px",
                          background: "var(--paper)",
                          border: "1.5px solid var(--border)",
                          color: "var(--ink)",
                          boxSizing: "border-box",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          padding: "4px",
                          cursor: "pointer",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          height: "24px",
                          minHeight: "24px",
                        }}
                        title={showApiKey ? "Hide Key" : "Show Key"}
                      >
                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestApiKey}
                      disabled={testStatus === "testing" || !settings.customApiKey}
                      style={{
                        height: "36px",
                        minHeight: "36px",
                        padding: "0 12px",
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        boxSizing: "border-box",
                      }}
                    >
                      {testStatus === "testing" ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>TESTING</span>
                        </>
                      ) : (
                        <span>TEST KEY</span>
                      )}
                    </button>

                    {settings.customApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          updateSettings({ customApiKey: "" });
                          setTestStatus("idle");
                          setTestMessage(null);
                        }}
                        style={{
                          height: "36px",
                          minHeight: "36px",
                          padding: "0 10px",
                          fontSize: "11px",
                          boxSizing: "border-box",
                          color: "var(--muted)",
                        }}
                        title="Clear API Key"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {testMessage && (
                    <div
                      className="font-mono"
                      style={{
                        fontSize: "11px",
                        padding: "6px 8px",
                        background: testStatus === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                        color: testStatus === "error" ? "#EF4444" : "#10B981",
                        border: `1px solid ${testStatus === "error" ? "#EF4444" : "#10B981"}`,
                      }}
                    >
                      {testMessage}
                    </div>
                  )}
                </div>

                {settings.customApiProvider === "custom" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label className="font-mono" style={{ fontSize: "11px", fontWeight: 700 }}>
                      CUSTOM ENDPOINTS:
                    </label>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
                      Disabled for security. CodeAtlas only sends repository context to supported providers.
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 2: ADD CUSTOM MODEL */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={16} style={{ color: "var(--ink)" }} />
                  <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                    02 ADD CUSTOM MODEL
                  </span>
                </div>

                {/* Popular 1-Click Presets */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span className="font-mono" style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>
                    POPULAR MODEL PRESETS (CLICK TO ADD):
                  </span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {POPULAR_MODEL_PRESETS.map((preset) => {
                      const isAdded = settings.customModels.some((m) => m.id === preset.id);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleAddPreset(preset)}
                          disabled={isAdded}
                          style={{
                            height: "28px",
                            minHeight: "28px",
                            padding: "0 8px",
                            fontSize: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            opacity: isAdded ? 0.6 : 1,
                            background: isAdded ? "var(--paper)" : "var(--white)",
                          }}
                        >
                          {isAdded ? <Check size={11} style={{ color: "#10B981" }} /> : <Plus size={11} />}
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Model Form */}
                <form
                  onSubmit={handleAddCustomModel}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    background: "var(--paper)",
                    padding: "12px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label className="font-mono" style={{ fontSize: "10px", fontWeight: 700 }}>
                        MODEL IDENTIFIER (REQUIRED):
                      </label>
                      <input
                        type="text"
                        value={newModelId}
                        onChange={(e) => setNewModelId(e.target.value)}
                        placeholder="e.g. deepseek/deepseek-r1"
                        className="font-mono"
                        style={{
                          height: "34px",
                          padding: "0 8px",
                          fontSize: "11px",
                          border: "1.5px solid var(--border)",
                          background: "var(--white)",
                          color: "var(--ink)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label className="font-mono" style={{ fontSize: "10px", fontWeight: 700 }}>
                        FRIENDLY NAME:
                      </label>
                      <input
                        type="text"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="e.g. DeepSeek R1"
                        className="font-mono"
                        style={{
                          height: "34px",
                          padding: "0 8px",
                          fontSize: "11px",
                          border: "1.5px solid var(--border)",
                          background: "var(--white)",
                          color: "var(--ink)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label className="font-mono" style={{ fontSize: "10px", fontWeight: 700 }}>
                        CONTEXT WINDOW:
                      </label>
                      <input
                        type="text"
                        value={newModelContext}
                        onChange={(e) => setNewModelContext(e.target.value)}
                        placeholder="e.g. 128k tokens"
                        className="font-mono"
                        style={{
                          height: "34px",
                          padding: "0 8px",
                          fontSize: "11px",
                          border: "1.5px solid var(--border)",
                          background: "var(--white)",
                          color: "var(--ink)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label className="font-mono" style={{ fontSize: "10px", fontWeight: 700 }}>
                        DESCRIPTION:
                      </label>
                      <input
                        type="text"
                        value={newModelDescription}
                        onChange={(e) => setNewModelDescription(e.target.value)}
                        placeholder="e.g. Deep reasoning specialist"
                        className="font-mono"
                        style={{
                          height: "34px",
                          padding: "0 8px",
                          fontSize: "11px",
                          border: "1.5px solid var(--border)",
                          background: "var(--white)",
                          color: "var(--ink)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newModelSupportsReasoning}
                        onChange={(e) => setNewModelSupportsReasoning(e.target.checked)}
                        style={{ width: "14px", height: "14px" }}
                      />
                      <span className="font-mono" style={{ fontWeight: 600 }}>
                        Supports Adaptive Reasoning Effort (Chain of Thought)
                      </span>
                    </label>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{
                        height: "34px",
                        minHeight: "34px",
                        padding: "0 14px",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxSizing: "border-box",
                      }}
                    >
                      <Plus size={13} />
                      <span>ADD MODEL</span>
                    </button>
                  </div>

                  {formError && (
                    <div className="font-mono" style={{ fontSize: "11px", color: "#EF4444" }}>
                      {formError}
                    </div>
                  )}
                </form>
              </div>

              {/* SECTION 3: CONFIGURED MODELS & ACTIVE SELECTION */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Zap size={16} style={{ color: "var(--ink)" }} />
                    <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                      03 ACTIVE MODEL FOR ARCHITECTURAL Q&A
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: "10px", color: "var(--muted)" }}>
                    TOTAL: {allAvailableModels.length} MODELS
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {allAvailableModels.map((m) => {
                    const isSelected = settings.selectedModel === m.id;
                    const isCustom = "isCustom" in m && m.isCustom;

                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: "10px 12px",
                          border: isSelected ? "2px solid var(--ink)" : "1px solid var(--border)",
                          background: isSelected ? "var(--paper)" : "var(--white)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>
                              {m.name}
                            </span>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: "9px",
                                padding: "1px 5px",
                                background: isCustom ? "var(--accent)" : m.mode === "paid" ? "#8B5CF6" : "#3B82F6",
                                color: isCustom ? "#11100F" : "#FFFFFF",
                                fontWeight: 700,
                              }}
                            >
                              {isCustom ? "CUSTOM" : m.mode.toUpperCase()}
                            </span>
                            {m.context && (
                              <span className="font-mono" style={{ fontSize: "10px", color: "var(--muted)" }}>
                                {m.context}
                              </span>
                            )}
                            {m.supportsReasoning && (
                              <span
                                className="font-mono"
                                style={{
                                  fontSize: "9px",
                                  padding: "1px 5px",
                                  background: "var(--border)",
                                  color: "var(--ink)",
                                  fontWeight: 600,
                                }}
                              >
                                REASONING
                              </span>
                            )}
                          </div>
                          <div
                            className="font-mono"
                            style={{
                              fontSize: "11px",
                              color: "var(--muted)",
                              marginTop: "2px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {m.id} · {m.description}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          {isSelected ? (
                            <div
                              className="font-mono"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "var(--ink)",
                                padding: "4px 8px",
                                border: "1px solid var(--ink)",
                                background: "var(--white)",
                              }}
                            >
                              <Check size={12} />
                              <span>ACTIVE</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectActiveModel(m.id)}
                              style={{
                                height: "30px",
                                minHeight: "30px",
                                padding: "0 10px",
                                fontSize: "11px",
                                boxSizing: "border-box",
                              }}
                            >
                              SELECT
                            </button>
                          )}

                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomModel(m.id)}
                              style={{
                                height: "30px",
                                minHeight: "30px",
                                padding: "0 8px",
                                fontSize: "11px",
                                color: "#EF4444",
                                borderColor: "var(--border)",
                                boxSizing: "border-box",
                              }}
                              title="Delete custom model"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: GRAPH CANVAS CUSTOMIZATION */}
          {/* ======================================================== */}
          {activeTab === "canvas" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Layout Mode */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                  01 ARCHITECTURAL LAYOUT ALGORITHM
                </span>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Controls how nodes and directory modules are positioned across 2D space.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  {(
                    [
                      {
                        id: "layered" as GraphLayoutMode,
                        name: "Layered (Hierarchical DAG)",
                        desc: "Sugiyama layout aligning imports top-down with horizontal tiering.",
                      },
                      {
                        id: "cluster" as GraphLayoutMode,
                        name: "Cluster (Directory Domains)",
                        desc: "Groups related modules into visual bounded context domains.",
                      },
                      {
                        id: "radial" as GraphLayoutMode,
                        name: "Radial (Central Hub Orbit)",
                        desc: "Orbits dependencies circularly around high-degree architectural hubs.",
                      },
                      {
                        id: "subway" as GraphLayoutMode,
                        name: "Subway (Metro Transit Lines)",
                        desc: "Straight orthogonal transit tracks with uniform grid spacing.",
                      },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSettings({ graphLayout: opt.id })}
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        border: settings.graphLayout === opt.id ? "2px solid var(--ink)" : "1px solid var(--border)",
                        background: settings.graphLayout === opt.id ? "var(--paper)" : "var(--white)",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        minHeight: "70px",
                        cursor: "pointer",
                      }}
                    >
                      <div className="font-mono" style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>
                        {opt.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edge Curve Style */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                  02 EDGE CURVES & CONNECTIONS
                </span>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Controls the visual drawing and geometry of dependency lines.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  {(
                    [
                      {
                        id: "bezier" as GraphEdgeStyle,
                        name: "Fluid Curves (Bezier)",
                        desc: "Adaptive S-curves with staggered port offsets for clean legibility.",
                      },
                      {
                        id: "smoothstep" as GraphEdgeStyle,
                        name: "Subway Curves (Curved 90°)",
                        desc: "Rounded orthogonal right angles reminiscent of transit maps.",
                      },
                      {
                        id: "obstacleFree" as GraphEdgeStyle,
                        name: "Obstacle-Free (Direct Bypass)",
                        desc: "Calculates unobstructed path routing bypassing intermediate nodes.",
                      },
                      {
                        id: "straight" as GraphEdgeStyle,
                        name: "Straight Vectors",
                        desc: "Direct Euclidean line segments without routing curvature.",
                      },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSettings({ edgeStyle: opt.id })}
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        border: settings.edgeStyle === opt.id ? "2px solid var(--ink)" : "1px solid var(--border)",
                        background: settings.edgeStyle === opt.id ? "var(--paper)" : "var(--white)",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        minHeight: "70px",
                        cursor: "pointer",
                      }}
                    >
                      <div className="font-mono" style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>
                        {opt.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edge Density */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                  03 EDGE DENSITY FILTER
                </span>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Controls background edge clutter and focused connection highlighting.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {(
                    [
                      {
                        id: "subtle" as EdgeDensityMode,
                        name: "Subtle (Recommended)",
                        desc: "Subtle background lines; illuminates active connections on hover or select.",
                      },
                      {
                        id: "focus" as EdgeDensityMode,
                        name: "Focus Only",
                        desc: "Hides all unrelated lines completely; shows only selected node connections.",
                      },
                      {
                        id: "all" as EdgeDensityMode,
                        name: "Dense Tapestry",
                        desc: "Renders all repository dependencies at full visual presence.",
                      },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSettings({ edgeDensity: opt.id })}
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        border: settings.edgeDensity === opt.id ? "2px solid var(--ink)" : "1px solid var(--border)",
                        background: settings.edgeDensity === opt.id ? "var(--paper)" : "var(--white)",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        minHeight: "70px",
                        cursor: "pointer",
                      }}
                    >
                      <div className="font-mono" style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>
                        {opt.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: CODE VIEWER CUSTOMIZATION */}
          {/* ======================================================== */}
          {activeTab === "editor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* VS Code Theme */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                  01 SYNTAX COLOR THEME
                </span>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Select the syntax highlighting palette for source file viewing.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {(
                    [
                      { id: "vscode-dark", name: "VS Code Dark+", bg: "#1E1E1E" },
                      { id: "vscode-light", name: "VS Code Light+", bg: "#FFFFFF" },
                      { id: "github-dark", name: "GitHub Dark", bg: "#0D1117" },
                      { id: "one-dark-pro", name: "One Dark Pro", bg: "#282C34" },
                      { id: "monokai", name: "Monokai", bg: "#272822" },
                      { id: "dracula", name: "Dracula", bg: "#282A36" },
                      { id: "solarized-dark", name: "Solarized Dark", bg: "#002B36" },
                      { id: "abyss", name: "Abyss", bg: "#000C18" },
                    ]
                  ).map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => updateSettings({ codeViewerTheme: th.id })}
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        border: settings.codeViewerTheme === th.id ? "2px solid var(--ink)" : "1px solid var(--border)",
                        background: settings.codeViewerTheme === th.id ? "var(--paper)" : "var(--white)",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          background: th.bg,
                          border: "1px solid #555",
                          flexShrink: 0,
                        }}
                      />
                      <span className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                        {th.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Wrap & Typography */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                  02 EDITOR BEHAVIOR & FONT SIZE
                </span>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="font-mono" style={{ fontSize: "12px", fontWeight: 700 }}>
                      SOFT WORD WRAPPING
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Wrap long code lines without horizontal scrolling
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateSettings({ wordWrap: !settings.wordWrap })}
                    style={{
                      height: "34px",
                      minHeight: "34px",
                      padding: "0 14px",
                      fontSize: "11px",
                      background: settings.wordWrap ? "var(--ink)" : "var(--paper)",
                      color: settings.wordWrap ? "var(--white)" : "var(--ink)",
                      borderColor: settings.wordWrap ? "var(--ink)" : "var(--border)",
                    }}
                  >
                    {settings.wordWrap ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: APPEARANCE */}
          {/* ======================================================== */}
          {activeTab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <span className="font-mono" style={{ fontSize: "12px", fontWeight: 800 }}>
                  01 GLOBAL APPLICATION THEME
                </span>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Swiss Brutalist high-contrast light or dark mode.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => updateSettings({ appTheme: "light" })}
                    style={{
                      padding: "14px",
                      border: settings.appTheme === "light" ? "2px solid var(--ink)" : "1px solid var(--border)",
                      background: settings.appTheme === "light" ? "var(--paper)" : "var(--white)",
                      textAlign: "left",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      cursor: "pointer",
                    }}
                  >
                    <div className="font-mono" style={{ fontSize: "13px", fontWeight: 800 }}>
                      LIGHT MODE (PAPER & INK)
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                      Crisp architectural drawing aesthetic with warm paper backgrounds.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateSettings({ appTheme: "dark" })}
                    style={{
                      padding: "14px",
                      border: settings.appTheme === "dark" ? "2px solid var(--ink)" : "1px solid var(--border)",
                      background: settings.appTheme === "dark" ? "var(--paper)" : "var(--white)",
                      textAlign: "left",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      cursor: "pointer",
                    }}
                  >
                    <div className="font-mono" style={{ fontSize: "13px", fontWeight: 800 }}>
                      DARK MODE (HIGH CONTRAST)
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                      Deep Obsidian backdrop with amber and cyan visual accents.
                    </div>
                  </button>
                </div>
              </div>

              {/* Reset Defaults */}
              <div
                style={{
                  border: "1.5px solid var(--border)",
                  padding: "16px",
                  background: "var(--white)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div className="font-mono" style={{ fontSize: "12px", fontWeight: 700 }}>
                    RESET ALL SETTINGS
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Restores layout, theme, curves, and editor preferences to defaults.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Reset all customizations to default settings?")) {
                      updateSettings(DEFAULT_SETTINGS);
                    }
                  }}
                  style={{
                    height: "34px",
                    minHeight: "34px",
                    padding: "0 14px",
                    fontSize: "11px",
                    boxSizing: "border-box",
                  }}
                >
                  RESET DEFAULTS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--white)",
          }}
        >
          <div className="font-mono" style={{ fontSize: "11px", color: "var(--muted)" }}>
            SETTINGS ARE PERSISTED IN LOCAL STORAGE
          </div>

          <button
            onClick={onClose}
            className="btn-primary"
            style={{
              height: "34px",
              minHeight: "34px",
              padding: "0 18px",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          >
            <span>DONE</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
