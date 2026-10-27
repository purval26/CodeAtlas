import { NextResponse } from "next/server";
import { AVAILABLE_MODELS, ModelOption } from "@/types";
import { llmAdapter } from "@/server/intelligence/instance";

// In-memory cache for dynamic OpenRouter model registry checks (5 minute TTL)
let cachedOpenRouterModelIds: Set<string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getLiveOpenRouterModelIds(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedOpenRouterModelIds && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedOpenRouterModelIds;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        const idSet = new Set<string>(data.data.map((m: any) => m.id));
        cachedOpenRouterModelIds = idSet;
        cacheTimestamp = now;
        return idSet;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live OpenRouter models registry:", err);
  }

  // Fallback to cached set or known live working free models
  if (cachedOpenRouterModelIds) return cachedOpenRouterModelIds;
  return new Set([
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "cohere/north-mini-code:free",
    "liquid/lfm-2.5-2.6b:free",
    "google/gemini-3.8-flash",
  ]);
}

export async function GET(request: Request) {
  const customApiKey = request.headers.get("x-custom-api-key")?.trim();
  const hasServerApiKey = llmAdapter.hasApiKey();
  const hasApiKey = Boolean(customApiKey || hasServerApiKey);

  // If there is NO API key (neither server nor user), external OpenRouter models
  // return 401 Unauthorized ("No cookie auth credentials found").
  // Therefore, hide external models that cannot work without an API key,
  // and provide the offline AST synthesizer that works 100% without an API key.
  if (!hasApiKey) {
    const offlineSynthesizerModel: ModelOption = {
      id: "codeatlas/deterministic-synthesizer",
      name: "CodeAtlas AST Synthesizer (Offline)",
      mode: "free",
      description: "Local AST syntax & architectural dependency analysis (works 100% offline without API key)",
      context: "Local repository",
    };

    return NextResponse.json({
      models: [offlineSynthesizerModel],
      defaultFree: "codeatlas/deterministic-synthesizer",
      defaultPaid: "google/gemini-3.8-flash",
      provider: "synthesizer",
      hasApiKey: false,
      requiresApiKey: true,
      message: "External models require an API key to run. Configure your API key in Settings to unlock live neural reasoning.",
    });
  }

  // When an API key IS present, dynamically check which models are alive on OpenRouter
  const liveModelIds = await getLiveOpenRouterModelIds();

  // Filter AVAILABLE_MODELS to only include models confirmed working & alive on OpenRouter
  const workingModels = AVAILABLE_MODELS.filter((model) => liveModelIds.has(model.id));

  // Determine healthy default models
  const firstFree = workingModels.find((m) => m.mode === "free")?.id || "nvidia/nemotron-3-ultra-550b-a55b:free";
  const defaultPaid = workingModels.find((m) => m.mode === "paid")?.id || "google/gemini-3.8-flash";

  return NextResponse.json({
    models: workingModels,
    defaultFree: firstFree,
    defaultPaid,
    provider: llmAdapter.getProvider() || "openrouter",
    hasApiKey: true,
    requiresApiKey: false,
    checkedAt: new Date().toISOString(),
  });
}
