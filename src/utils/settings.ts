import { useState, useEffect, useCallback } from "react";
import {
  GraphLayoutMode,
  GraphEdgeStyle,
  EdgeDensityMode,
  CustomModelConfig,
  ApiProviderType,
} from "@/types";

export interface AppSettings {
  // AI & Custom Models
  customApiKey: string;
  customApiProvider: ApiProviderType;
  customApiBaseUrl: string;
  customModels: CustomModelConfig[];
  selectedModel: string;
  aiMode: "free" | "paid" | "custom";

  // Graph Canvas Customization
  graphLayout: GraphLayoutMode;
  edgeStyle: GraphEdgeStyle;
  edgeDensity: EdgeDensityMode;

  // Code Viewer Customization
  codeViewerTheme: string;
  wordWrap: boolean;
  codeFontSize: "compact" | "normal" | "large";

  // Appearance
  appTheme: "light" | "dark";
}

export const POPULAR_MODEL_PRESETS: CustomModelConfig[] = [
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "openrouter",
    context: "64k tokens",
    description: "State-of-the-art open reasoning model with transparent chain-of-thought",
    supportsReasoning: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "openrouter",
    context: "200k tokens",
    description: "Industry benchmark for deep architectural code analysis & precision",
    supportsReasoning: false,
  },
  {
    id: "openai/gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "openrouter",
    context: "128k tokens",
    description: "High-intelligence multimodal flagship model for comprehensive analysis",
    supportsReasoning: false,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "openrouter",
    context: "128k tokens",
    description: "Top-tier open-weights model fine-tuned for high-complexity instruction following",
    supportsReasoning: false,
  },
  {
    id: "mistralai/codestral-2501",
    name: "Mistral Codestral 2501",
    provider: "openrouter",
    context: "256k tokens",
    description: "Specialized code generation & AST structural comprehension specialist",
    supportsReasoning: false,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "openrouter",
    context: "1M tokens",
    description: "Next-gen ultra-fast reasoning with massive 1M token context capacity",
    supportsReasoning: false,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  customApiKey: "",
  customApiProvider: "openrouter",
  customApiBaseUrl: "",
  customModels: [],
  selectedModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
  aiMode: "free",
  graphLayout: "layered",
  edgeStyle: "bezier",
  edgeDensity: "subtle",
  codeViewerTheme: "vscode-dark",
  wordWrap: false,
  codeFontSize: "normal",
  appTheme: "light",
};

const SETTINGS_KEY = "codeatlas_unified_settings";
export const SETTINGS_EVENT = "codeatlas_settings_changed";

/**
 * Load settings from localStorage with fallback to defaults and legacy standalone keys.
 */
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }

  let base = { ...DEFAULT_SETTINGS };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      base = { ...base, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to parse stored unified settings:", e);
  }

  // Backwards compatibility with standalone keys
  try {
    const legacyApiKey = localStorage.getItem("codeatlas_custom_api_key");
    if (legacyApiKey && !base.customApiKey) base.customApiKey = legacyApiKey;

    const legacyProvider = localStorage.getItem("codeatlas_custom_provider") as ApiProviderType | null;
    if (legacyProvider) base.customApiProvider = legacyProvider;

    const legacyBaseUrl = localStorage.getItem("codeatlas_custom_base_url");
    if (legacyBaseUrl) base.customApiBaseUrl = legacyBaseUrl;

    const legacyModels = localStorage.getItem("codeatlas_custom_models");
    if (legacyModels && (!base.customModels || base.customModels.length === 0)) {
      try {
        base.customModels = JSON.parse(legacyModels);
      } catch {}
    }

    const legacyTheme = localStorage.getItem("codeatlas_theme");
    if (legacyTheme === "dark" || legacyTheme === "light") base.appTheme = legacyTheme;

    const legacyLayout = localStorage.getItem("codeatlas_graph_layout") as GraphLayoutMode | null;
    if (legacyLayout) base.graphLayout = legacyLayout;

    const legacyEdgeStyle = localStorage.getItem("codeatlas_graph_edge_style") as GraphEdgeStyle | null;
    if (legacyEdgeStyle) base.edgeStyle = legacyEdgeStyle;

    const legacyDensity = localStorage.getItem("codeatlas_edge_density") as EdgeDensityMode | null;
    if (legacyDensity) base.edgeDensity = legacyDensity;

    const legacyCodeTheme = localStorage.getItem("codeatlas_code_viewer_theme") || localStorage.getItem("codeatlas_code_theme");
    if (legacyCodeTheme) base.codeViewerTheme = legacyCodeTheme;

    const legacyWordWrap = localStorage.getItem("codeatlas_word_wrap");
    if (legacyWordWrap !== null) base.wordWrap = legacyWordWrap === "true";

    const legacySelectedModel = localStorage.getItem("codeatlas_selected_model");
    if (legacySelectedModel) base.selectedModel = legacySelectedModel;

    const legacyAiMode = localStorage.getItem("codeatlas_ai_mode") as "free" | "paid" | null;
    if (legacyAiMode) base.aiMode = legacyAiMode;
  } catch (e) {
    // ignore legacy parsing errors
  }

  return base;
}

/**
 * Save updated settings to localStorage and notify all active components.
 */
export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS, ...partial };
  }

  const current = loadSettings();
  const next: AppSettings = { ...current, ...partial };

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));

    // Sync legacy keys for components reading them directly
    if (partial.customApiKey !== undefined) {
      if (partial.customApiKey) {
        localStorage.setItem("codeatlas_custom_api_key", partial.customApiKey);
      } else {
        localStorage.removeItem("codeatlas_custom_api_key");
      }
    }
    if (partial.customApiProvider !== undefined) {
      localStorage.setItem("codeatlas_custom_provider", partial.customApiProvider);
    }
    if (partial.customApiBaseUrl !== undefined) {
      localStorage.setItem("codeatlas_custom_base_url", partial.customApiBaseUrl);
    }
    if (partial.customModels !== undefined) {
      localStorage.setItem("codeatlas_custom_models", JSON.stringify(partial.customModels));
    }
    if (partial.appTheme !== undefined) {
      localStorage.setItem("codeatlas_theme", partial.appTheme);
      if (partial.appTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    if (partial.graphLayout !== undefined) {
      localStorage.setItem("codeatlas_graph_layout", partial.graphLayout);
    }
    if (partial.edgeStyle !== undefined) {
      localStorage.setItem("codeatlas_graph_edge_style", partial.edgeStyle);
    }
    if (partial.edgeDensity !== undefined) {
      localStorage.setItem("codeatlas_edge_density", partial.edgeDensity);
    }
    if (partial.codeViewerTheme !== undefined) {
      localStorage.setItem("codeatlas_code_theme", partial.codeViewerTheme);
      localStorage.setItem("codeatlas_code_viewer_theme", partial.codeViewerTheme);
    }
    if (partial.wordWrap !== undefined) {
      localStorage.setItem("codeatlas_word_wrap", String(partial.wordWrap));
    }
    if (partial.selectedModel !== undefined) {
      localStorage.setItem("codeatlas_selected_model", partial.selectedModel);
    }
    if (partial.aiMode !== undefined) {
      localStorage.setItem("codeatlas_ai_mode", partial.aiMode);
    }

    // Broadcast change
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
  }

  return next;
}

/**
 * Custom React Hook to consume and update settings across any component with instant synchronization.
 */
export function useSettings(): [AppSettings, (update: Partial<AppSettings>) => void] {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    // Sync on mount
    setSettings(loadSettings());

    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(loadSettings());
      }
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsChanged);
    window.addEventListener("storage", handleSettingsChanged);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSettingsChanged);
      window.removeEventListener("storage", handleSettingsChanged);
    };
  }, []);

  const updateSettings = useCallback((update: Partial<AppSettings>) => {
    const next = saveSettings(update);
    setSettings(next);
  }, []);

  return [settings, updateSettings];
}
