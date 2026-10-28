import type {
  AnalysisJob,
  AskResponse,
  CodeFile,
  CodeSymbol,
  ExtractedImport,
  GraphData,
  ModelOption,
  SearchResult,
} from "@/types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function analyzeRepository(url: string): Promise<{ jobId: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Analysis failed with status ${res.status}`);
  }
  return res.json();
}

export async function pollJobStatus(jobId: string): Promise<AnalysisJob> {
  const res = await fetch(`${API_BASE}/api/analyze/${jobId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Polling failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchGraph(repositoryId: string): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/api/graph/${repositoryId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch graph (${res.status})`);
  }
  return res.json();
}

export interface FileDetailsResponse {
  file: CodeFile;
  symbols: CodeSymbol[];
  exports: string[];
  imports: ExtractedImport[];
}

export async function fetchFileDetails(
  repositoryId: string,
  filePath: string
): Promise<FileDetailsResponse> {
  const url = `${API_BASE}/api/repository/${repositoryId}/file?path=${encodeURIComponent(filePath)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch file (${res.status})`);
  }
  return res.json();
}

export async function searchRepo(
  repositoryId: string,
  query: string
): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryId, query }),
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.results || [];
}

export async function fetchTraceFlow(
  repositoryId: string,
  startNodeId: string,
  endNodeId: string
): Promise<{
  found: boolean;
  nodePath: string[];
  edgePath: string[];
  readableSteps: string[];
}> {
  const res = await fetch(`${API_BASE}/api/trace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryId, startNodeId, endNodeId }),
  });
  if (!res.ok) {
    throw new Error("Failed to calculate trace flow");
  }
  return res.json();
}

export async function askCodeAtlas(
  repositoryId: string,
  question: string,
  options?: "free" | "paid" | "custom" | {
    mode?: "free" | "paid" | "custom";
    model?: string;
    apiKey?: string;
    provider?: string;
    baseUrl?: string;
  }
): Promise<AskResponse> {
  const mode = typeof options === "string" ? options : options?.mode || "free";
  const model = typeof options === "object" ? options.model : undefined;
  const apiKey = typeof options === "object" ? options.apiKey : undefined;
  const provider = typeof options === "object" ? options.provider : undefined;
  const baseUrl = typeof options === "object" ? options.baseUrl : undefined;

  const res = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-custom-api-key": apiKey } : {}),
    },
    body: JSON.stringify({ repositoryId, question, mode, model, provider }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Failed to process question");
  }
  return res.json();
}

export async function askCodeAtlasStream(
  repositoryId: string,
  question: string,
  options: {
    mode?: "free" | "paid" | "custom";
    model?: string;
    apiKey?: string;
    provider?: string;
    baseUrl?: string;
    onToken: (token: string) => void;
  }
): Promise<AskResponse> {
  const mode = options.mode || "free";
  const model = options.model;
  const apiKey = options.apiKey;
  const provider = options.provider;
  const baseUrl = options.baseUrl;

  const res = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(apiKey ? { "x-custom-api-key": apiKey } : {}),
    },
    body: JSON.stringify({ repositoryId, question, mode, model, provider, stream: true }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to process question (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Streaming not supported by browser environment");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let accumulatedTokens = "";
  let finalResponse: AskResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const evt of events) {
        const trimmed = evt.trim();
        // Skip empty lines and keep-alive ping comments (: ping)
        if (!trimmed || trimmed.startsWith(":")) continue;

        let eventType = "message";
        let dataStr = "";

        for (const line of trimmed.split("\n")) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataStr = line.slice(6).trim();
          }
        }

        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === "token" || (parsed && parsed.token !== undefined)) {
              const tok = parsed.token || "";
              accumulatedTokens += tok;
              options.onToken(tok);
            } else if (eventType === "done" || (parsed && parsed.answer !== undefined)) {
              finalResponse = parsed;
            } else if (eventType === "error") {
              throw new Error(parsed.error || "Streaming error occurred");
            }
          } catch (e: any) {
            if (eventType === "error") throw e;
          }
        }
      }
    }
  } catch (readErr: any) {
    // If the network connection drops or times out after tokens were already received,
    // gracefully salvage the streamed text rather than failing with a network error.
    if (accumulatedTokens.trim().length > 30) {
      finalResponse = {
        answer: accumulatedTokens,
        verifiedCitations: [],
        insufficientEvidence: false,
        modelUsed: options.model || "streamed-response",
        mode: options.mode || "free",
      };
    } else {
      throw readErr;
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (!trimmed.startsWith(":")) {
      let eventType = "message";
      let dataStr = "";
      for (const line of trimmed.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataStr = line.slice(6).trim();
        }
      }
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === "done" || (parsed && parsed.answer !== undefined)) {
            finalResponse = parsed;
          }
        } catch {}
      }
    }
  }

  if (!finalResponse) {
    if (accumulatedTokens.trim().length > 30) {
      finalResponse = {
        answer: accumulatedTokens,
        verifiedCitations: [],
        insufficientEvidence: false,
        modelUsed: options.model || "streamed-response",
        mode: options.mode || "free",
      };
    } else {
      throw new Error("Streaming ended unexpectedly before completion.");
    }
  }

  return finalResponse;
}

export async function fetchAvailableModels(customApiKey?: string): Promise<{
  models: ModelOption[];
  defaultFree: string;
  defaultPaid: string;
  provider: string;
  hasApiKey: boolean;
  requiresApiKey?: boolean;
}> {
  const effectiveKey =
    customApiKey !== undefined
      ? customApiKey
      : typeof window !== "undefined"
      ? sessionStorage.getItem("codeatlas_custom_api_key_session") || ""
      : "";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (effectiveKey) {
    headers["x-custom-api-key"] = effectiveKey;
  }

  const res = await fetch(`${API_BASE}/api/models`, { headers });
  if (!res.ok) {
    return {
      models: [],
      defaultFree: "nvidia/nemotron-3-ultra-550b-a55b:free",
      defaultPaid: "google/gemini-3.8-flash",
      provider: "synthesizer",
      hasApiKey: false,
    };
  }
  return res.json();
}

export async function fetchAuthStatus(): Promise<{
  authenticated: boolean;
  user: any | null;
  oauthConfigured: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/user`);
    if (!res.ok) return { authenticated: false, user: null, oauthConfigured: false };
    return res.json();
  } catch {
    return { authenticated: false, user: null, oauthConfigured: false };
  }
}

export async function logoutAuthUser(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
}

export async function fetchUserRepos(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/auth/repos`);
  if (!res.ok) {
    throw new Error(`Failed to load repositories (${res.status})`);
  }
  const data = await res.json();
  return data.repos || [];
}

