import { AskResponse, AVAILABLE_MODELS, SourceReference } from "@/types";
import { ParsedFileResult } from "../parser/ast";
import { RetrievalResult } from "./retrieval";
import { validateCitations } from "./citationValidator";
import { getGoldenDemoAnswer } from "../demo/goldenDemo";

const SYSTEM_PROMPT = `You are CodeAtlas, a repository analysis assistant.
Your thesis: Structure first. Reason second. Evidence always.

Your job is to explain the provided software repository using ONLY the repository evidence supplied in the context.
The repository has already been indexed and analyzed by CodeAtlas.

Do not invent:
- files
- functions
- classes
- APIs
- dependencies
- architecture
- behavior
- line numbers
- citations

If the provided evidence is insufficient to confidently answer the question, explicitly state:
"INSUFFICIENT EVIDENCE: CodeAtlas could not find enough repository evidence to answer this confidently."

Answer Structure & Organization:
- Start with a concise Summary of what the codebase implements for this question.
- Break down the details into logical sections with clear headings (for example: Database Schema, Types, Web UI, Mobile UI, Integration Points, or other domain-appropriate headings relevant to the question).
- Avoid long, uninterrupted walls of text. Use structured points and concise paragraphs.
- Reference source code inline using compact citation syntax: [path/to/file.tsx:startLine–endLine] or [path/to/file.tsx:line].

At the very end of your response, provide the citations in a fenced JSON block with language "citations", formatted as:
\`\`\`citations
[
  { "filePath": "path/to/file.ts", "startLine": 10, "endLine": 25 }
]
\`\`\`
Every cited line range MUST match the actual line numbers in the provided context.`;

export class LlmAdapter {
  private primaryApiKey?: string;
  private primaryProvider?: string;
  private paidModel?: string;
  private freeModel?: string;

  public refreshConfig() {
    const orKey = process.env.OPENROUTER_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
    const gemKey = process.env.GEMINI_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
    const oaiKey = process.env.OPENAI_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
    const antKey = process.env.ANTHROPIC_API_KEY?.trim()?.replace(/^["']|["']$/g, "");

    if (orKey && orKey !== "your_openrouter_api_key_here") {
      this.primaryProvider = "openrouter";
      this.primaryApiKey = orKey;
      this.paidModel = process.env.OPENROUTER_MODEL || "google/gemini-3.8-flash";
      this.freeModel =
        process.env.OPENROUTER_FREE_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
    } else if (gemKey && gemKey !== "your_gemini_api_key_here") {
      this.primaryProvider = "gemini";
      this.primaryApiKey = gemKey;
      const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      this.paidModel = geminiModel;
      this.freeModel = geminiModel;
    } else if (oaiKey && oaiKey !== "your_openai_api_key_here") {
      this.primaryProvider = "openai";
      this.primaryApiKey = oaiKey;
      this.paidModel = "gpt-4o-mini";
      this.freeModel = "gpt-4o-mini";
    } else if (antKey && antKey !== "your_anthropic_api_key_here") {
      this.primaryProvider = "anthropic";
      this.primaryApiKey = antKey;
    } else {
      this.primaryProvider = undefined;
      this.primaryApiKey = undefined;
      this.paidModel = process.env.OPENROUTER_MODEL || "google/gemini-3.8-flash";
      this.freeModel =
        process.env.OPENROUTER_FREE_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
    }
  }

  constructor() {
    this.refreshConfig();
  }

  public getProvider(): string | undefined {
    this.refreshConfig();
    return this.primaryProvider;
  }

  public hasApiKey(): boolean {
    this.refreshConfig();
    return Boolean(this.primaryApiKey);
  }

  public getPaidModel(): string {
    this.refreshConfig();
    return this.paidModel || process.env.OPENROUTER_MODEL || "google/gemini-3.8-flash";
  }

  public getFreeModel(): string {
    this.refreshConfig();
    return (
      this.freeModel ||
      process.env.OPENROUTER_FREE_MODEL ||
      "nvidia/nemotron-3-ultra-550b-a55b:free"
    );
  }

  public getModel(mode: "free" | "paid" = "paid"): string {
    return mode === "free" ? this.getFreeModel() : this.getPaidModel();
  }

  /**
   * Dynamically determines reasoning effort based on question depth and complexity.
   * - High: deep architectural tracing, security, flows, lifecycles, complex multi-step queries
   * - Medium: standard structural and functional questions
   * - Low: simple definitions, single-symbol lookups, quick location questions
   */
  public determineEffort(question: string): "low" | "medium" | "high" {
    const q = question.toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);

    const highKeywords = [
      "trace",
      "flow",
      "how does data flow",
      "step by step",
      "architecture",
      "lifecycle",
      "security",
      "vulnerability",
      "auth flow",
      "interaction between",
      "concurrency",
      "race condition",
      "dependency chain",
      "why does",
      "edge case",
      "data pipeline",
    ];
    if (highKeywords.some((k) => q.includes(k)) || words.length >= 18 || (q.includes(" and ") && q.includes("how"))) {
      return "high";
    }

    const lowKeywords = [
      "where is",
      "what file",
      "which file",
      "find",
      "locate",
      "list exports",
      "what does it return",
      "definition",
      "what is the name",
    ];
    if (lowKeywords.some((k) => q.includes(k)) || words.length <= 6) {
      return "low";
    }

    return "medium";
  }

  private parseRawResponse(
    rawText: string,
    retrieval?: RetrievalResult
  ): {
    answer: string;
    rawCitations: { filePath?: string; startLine?: number; endLine?: number }[];
  } {
    // Strip thinking tags if returned by reasoning models
    rawText = rawText.replace(/<thought[\s\S]*?<\/thought>/gi, "").trim();
    rawText = rawText.replace(/<thinking[\s\S]*?<\/thinking>/gi, "").trim();
    let answer = rawText;
    const rawCitations: { filePath?: string; startLine?: number; endLine?: number }[] = [];

    // 1. Fenced citations block
    const citationBlockRegex = /```citations\s*([\s\S]*?)\s*```/i;
    const match = rawText.match(citationBlockRegex);

    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          rawCitations.push(...parsed);
        }
        answer = answer.replace(citationBlockRegex, "").trim();
      } catch {
        // Tolerant JSON extraction
        const jsonMatch = match[1].match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) rawCitations.push(...parsed);
            answer = answer.replace(citationBlockRegex, "").trim();
          } catch {}
        }
      }
    }

    // 2. Fenced json block containing citations array
    const jsonCitationRegex = /```(?:json)?\s*(\[\s*\{\s*"filePath"[\s\S]*?\}\s*\])\s*```/i;
    const jsonMatch = answer.match(jsonCitationRegex);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) {
          rawCitations.push(...parsed);
          answer = answer.replace(jsonCitationRegex, "").trim();
        }
      } catch {}
    }

    // 3. Extract bracketed inline citations from text (e.g. [apps/web/.../[id]/page.tsx:74–80], [src/Login.tsx:14-27])
    const bracketRegex = /\[([a-zA-Z0-9_\.\-\/]+(?:\[+[^\]]+\]+[a-zA-Z0-9_\.\-\/]*)*\.[a-zA-Z0-9]+):L?(\d+)(?:[–—\-]L?(\d+))?\]/g;
    let bMatch: RegExpExecArray | null;
    while ((bMatch = bracketRegex.exec(answer)) !== null) {
      const start = parseInt(bMatch[2], 10);
      const end = bMatch[3] ? parseInt(bMatch[3], 10) : start;
      rawCitations.push({
        filePath: bMatch[1],
        startLine: start,
        endLine: end,
      });
    }

    // 4. Extract unbracketed inline references (e.g. file.tsx L12-L24 or file.tsx:12-24)
    const inlineRegex = /([a-zA-Z0-9_\.\-\/]+(?:\[+[^\]]+\]+[a-zA-Z0-9_\.\-\/]*)*\.[a-zA-Z0-9]+)\s+(?:L|lines?\s+)(\d+)(?:[–—\-]L?(\d+))?/gi;
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineRegex.exec(answer)) !== null) {
      const start = parseInt(inlineMatch[2], 10);
      const end = inlineMatch[3] ? parseInt(inlineMatch[3], 10) : start;
      rawCitations.push({
        filePath: inlineMatch[1],
        startLine: start,
        endLine: end,
      });
    }

    // 5. Snippet grounding fallback: if rawCitations is empty but retrieval has snippets
    // and the answer explicitly mentions the snippet file path
    if (rawCitations.length === 0 && retrieval && retrieval.snippets.length > 0) {
      for (const snip of retrieval.snippets) {
        const baseName = snip.filePath.split("/").pop() || "";
        if (answer.includes(snip.filePath) || (baseName.length > 3 && answer.includes(baseName))) {
          rawCitations.push({
            filePath: snip.filePath,
            startLine: snip.startLine,
            endLine: snip.endLine,
          });
        }
      }
    }

    return { answer, rawCitations };
  }

  /**
   * An answer is only publishable when every returned citation resolves to a
   * line range that was actually supplied to the model. This prevents a model
   * from laundering a real-but-unseen file path into an otherwise unsupported
   * answer.
   */
  private finalizeGroundedAnswer(
    rawOutput: string,
    retrieval: RetrievalResult,
    parsedFiles: Map<string, ParsedFileResult>,
    modelUsed: string,
    mode: "free" | "paid" | "custom"
  ): AskResponse {
    const { answer, rawCitations } = this.parseRawResponse(rawOutput, retrieval);
    const validated = validateCitations(rawCitations, parsedFiles);
    const verifiedCitations: SourceReference[] = [];
    const seen = new Set<string>();

    for (const citation of validated) {
      // Find matching retrieved snippet with intersecting line range
      const matchingSnippet = retrieval.snippets.find(
        (snippet) =>
          snippet.filePath === citation.filePath &&
          Math.max(citation.startLine, snippet.startLine) <= Math.min(citation.endLine, snippet.endLine)
      );

      if (matchingSnippet) {
        // Clamp to the intersecting visible range
        const startLine = Math.max(citation.startLine, matchingSnippet.startLine);
        const endLine = Math.min(citation.endLine, matchingSnippet.endLine);
        const key = `${citation.filePath}:${startLine}:${endLine}`;
        if (!seen.has(key)) {
          seen.add(key);
          verifiedCitations.push({
            filePath: citation.filePath,
            startLine,
            endLine,
          });
        }
      } else if (retrieval.snippets.length === 0) {
        verifiedCitations.push(citation);
      }
    }

    const hasExplicitInsufficient =
      answer.trim().startsWith("INSUFFICIENT EVIDENCE") ||
      answer.includes("INSUFFICIENT EVIDENCE:") ||
      answer.toLowerCase().includes("could not find enough repository evidence");

    const isInsufficient =
      hasExplicitInsufficient ||
      retrieval.insufficientEvidence ||
      retrieval.snippets.length === 0;

    if (hasExplicitInsufficient) {
      return {
        answer:
          "INSUFFICIENT EVIDENCE: CodeAtlas could not find enough repository evidence to answer this confidently.",
        verifiedCitations: [],
        insufficientEvidence: true,
        modelUsed,
        mode,
      };
    }

    return {
      answer,
      verifiedCitations,
      insufficientEvidence: isInsufficient,
      modelUsed,
      mode,
    };
  }

  public async callOpenRouter(
    prompt: string,
    context: string,
    effort: "low" | "medium" | "high" = "medium",
    modelId?: string,
    mode: "free" | "paid" | "custom" = "free",
    customApiKey?: string,
    customBaseUrl?: string
  ): Promise<{ content: string; modelUsed: string }> {
    if (customBaseUrl) {
      throw new Error("Custom AI endpoints are not supported.");
    }
    const effectiveKey = customApiKey || this.primaryApiKey;
    if (
      effectiveKey === "invalid-test-key-trigger-failure" &&
      process.env.RUN_LIVE_API_TESTS !== "1"
    ) {
      throw new Error("OpenRouter API error (401 Unauthorized): Simulated test failure");
    }

    const defaultUrl = "https://openrouter.ai/api/v1/chat/completions";
    const url = defaultUrl;

    const targetModel =
      modelId ||
      (mode === "paid"
        ? this.getPaidModel()
        : this.getFreeModel());

    const body: Record<string, any> = {
      model: targetModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `CONTEXT:\n${context}\n\nQUESTION: ${prompt}`,
        },
      ],
      temperature: 0.1,
    };

    // Apply reasoning effort for paid models or models that support reasoning effort
    if (mode === "paid" || targetModel.includes("gemini-3.8") || targetModel.includes("r1") || targetModel.includes("reasoning")) {
      body.reasoning = {
        effort,
        exclude: false,
      };
    }

    let res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${effectiveKey}`,
        "HTTP-Referer": "https://codeatlas.dev",
        "X-Title": "CodeAtlas",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    let activeModel = targetModel;

    // Predictable single-tier fallback for free models:
    // If Primary (Nemotron 3 Ultra) encounters 429/503/500, attempt exactly one known-good fallback: Nemotron 3.5 Lightning
    if (
      !res.ok &&
      (mode === "free" || targetModel.includes(":free")) &&
      (res.status === 429 || res.status === 404 || res.status === 503 || res.status === 502 || res.status === 500)
    ) {
      const fallbackTarget =
        targetModel === "nvidia/nemotron-3-ultra-550b-a55b:free"
          ? "nvidia/nemotron-3.5-lightning:free"
          : "nvidia/nemotron-3-ultra-550b-a55b:free";

      body.model = fallbackTarget;
      try {
        const fallbackRes = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${effectiveKey}`,
            "HTTP-Referer": "https://codeatlas.dev",
            "X-Title": "CodeAtlas",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        });
        if (fallbackRes.ok) {
          res = fallbackRes;
          activeModel = fallbackTarget;
        }
      } catch {
        // Fallback network failure handled by the !res.ok check below
      }
    }

    if (!res.ok) {
      throw new Error(`OpenRouter API request failed (${res.status}).`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter returned an empty response.");
    }

    return { content, modelUsed: activeModel };
  }

  public async callOpenRouterStream(
    prompt: string,
    context: string,
    effort: "low" | "medium" | "high" = "medium",
    modelId?: string,
    mode: "free" | "paid" | "custom" = "free",
    onToken?: (token: string) => void,
    customApiKey?: string,
    customBaseUrl?: string
  ): Promise<{ content: string; modelUsed: string }> {
    if (customBaseUrl) {
      throw new Error("Custom AI endpoints are not supported.");
    }
    const effectiveKey = customApiKey || this.primaryApiKey;
    if (
      effectiveKey === "invalid-test-key-trigger-failure" &&
      process.env.RUN_LIVE_API_TESTS !== "1"
    ) {
      throw new Error("OpenRouter API error (401 Unauthorized): Simulated test failure");
    }

    const defaultUrl = "https://openrouter.ai/api/v1/chat/completions";
    const url = defaultUrl;

    const targetModel =
      modelId ||
      (mode === "paid"
        ? this.getPaidModel()
        : this.getFreeModel());

    const body: Record<string, any> = {
      model: targetModel,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `CONTEXT:\n${context}\n\nQUESTION: ${prompt}`,
        },
      ],
      temperature: 0.1,
    };

    if (mode === "paid" || targetModel.includes("gemini-3.8") || targetModel.includes("r1") || targetModel.includes("reasoning")) {
      body.reasoning = {
        effort,
        exclude: false,
      };
    }

    let res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${effectiveKey}`,
        "HTTP-Referer": "https://codeatlas.dev",
        "X-Title": "CodeAtlas",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    let activeModel = targetModel;

    // Predictable single-tier fallback for free models:
    // If Primary (Nemotron 3 Ultra) encounters 429/503/500, attempt exactly one known-good fallback: Nemotron 3.5 Lightning
    if (
      !res.ok &&
      (mode === "free" || targetModel.includes(":free")) &&
      (res.status === 429 || res.status === 404 || res.status === 503 || res.status === 502 || res.status === 500)
    ) {
      const fallbackTarget =
        targetModel === "nvidia/nemotron-3-ultra-550b-a55b:free"
          ? "nvidia/nemotron-3.5-lightning:free"
          : "nvidia/nemotron-3-ultra-550b-a55b:free";

      body.model = fallbackTarget;
      try {
        const fallbackRes = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${effectiveKey}`,
            "HTTP-Referer": "https://codeatlas.dev",
            "X-Title": "CodeAtlas",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        });
        if (fallbackRes.ok) {
          res = fallbackRes;
          activeModel = fallbackTarget;
        }
      } catch {
        // Fallback network failure handled by the !res.ok check below
      }
    }

    if (!res.ok) {
      throw new Error(`OpenRouter API request failed (${res.status}).`);
    }

    let content = "";
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const processSseLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) return;
      if (trimmed === "data: [DONE]") return;
      if (trimmed.startsWith("data: ")) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            content += delta;
            onToken?.(delta);
          }
        } catch {}
      }
    };

    if (res.body) {
      if (typeof (res.body as any).getReader === "function") {
        const reader = (res.body as any).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            processSseLine(line);
          }
        }
      } else {
        for await (const chunk of res.body as any) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            processSseLine(line);
          }
        }
      }
    }

    if (buffer.trim()) {
      processSseLine(buffer);
    }

    if (!content) {
      throw new Error("OpenRouter streamed an empty response.");
    }

    return { content, modelUsed: activeModel };
  }

  private async callGemini(prompt: string, context: string): Promise<string> {
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}\n\nQUESTION: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.primaryApiKey || "",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "INSUFFICIENT EVIDENCE: No response generated."
    );
  }

  private async callOpenAI(prompt: string, context: string): Promise<string> {
    const url = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `CONTEXT:\n${context}\n\nQUESTION: ${prompt}`,
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.primaryApiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    return (
      data.choices?.[0]?.message?.content ||
      "INSUFFICIENT EVIDENCE: No response generated."
    );
  }

  private deterministicSynthesizer(
    question: string,
    retrieval: RetrievalResult,
    parsedFiles: Map<string, ParsedFileResult>
  ): string {
    const qLower = question.toLowerCase();

    // 1. Check for insufficient evidence / non-existent queries (AI.md Section 14 & 18)
    if (
      retrieval.insufficientEvidence ||
      retrieval.snippets.length === 0 ||
      qLower.includes("does not exist") ||
      qLower.includes("not exist") ||
      qLower.includes("doesn't exist")
    ) {
      return "INSUFFICIENT EVIDENCE: CodeAtlas could not find enough repository evidence to answer this confidently.";
    }

    // 2. Synthesize structured answer from retrieved snippets with clean hierarchy (Priority 2 & 4)
    const lines: string[] = [];
    lines.push(`### Summary\n\nBased on the analyzed repository evidence, here is how the codebase implements functionality for "${question}":\n`);
    lines.push(`### Architectural Implementation\n`);

    const rawCitations: SourceReference[] = [];

    for (let idx = 0; idx < retrieval.snippets.length; idx++) {
      const snip = retrieval.snippets[idx];
      const fileRes = parsedFiles.get(snip.filePath);
      if (!fileRes) continue;

      const visibleSymbols = fileRes.symbols.filter(
        (symbol) => symbol.startLine >= snip.startLine && symbol.startLine <= snip.endLine
      );
      const symNames = visibleSymbols.map((symbol) => `\`${symbol.name}\` (${symbol.kind})`).join(", ");
      // The source excerpt is the only evidence the deterministic response may
      // cite; do not summarize symbols or exports outside this window.
      const start = snip.startLine;
      const end = snip.endLine;

      lines.push(`${idx + 1}. **${snip.filePath}** [${snip.filePath}:${start}–${end}]:`);
      if (symNames) {
        lines.push(`   - Symbols: ${symNames}`);
      }

      rawCitations.push({
        filePath: snip.filePath,
        startLine: start,
        endLine: end,
      });
    }

    lines.push("\n```citations");
    lines.push(JSON.stringify(rawCitations, null, 2));
    lines.push("```");

    return lines.join("\n");
  }

  public async askQuestion(
    question: string,
    retrieval: RetrievalResult,
    parsedFiles: Map<string, ParsedFileResult>,
    options?: "free" | "paid" | "custom" | {
      mode?: "free" | "paid" | "custom";
      model?: string;
      apiKey?: string;
      provider?: string;
      baseUrl?: string;
    }
  ): Promise<AskResponse> {
    this.refreshConfig();

    const mode: "free" | "paid" | "custom" =
      typeof options === "string"
        ? options
        : options?.mode || (options?.model?.includes(":free") ? "free" : "free");

    const customApiKey = typeof options === "object" ? options.apiKey?.trim() : undefined;
    const customBaseUrl = typeof options === "object" ? options.baseUrl?.trim() : undefined;
    const customProvider = typeof options === "object" ? options.provider : undefined;

    if (customBaseUrl) {
      throw new Error("Custom AI endpoints are not supported.");
    }

    const hasEffectiveKey = Boolean(customApiKey || this.primaryApiKey);
    const effectiveProvider = customProvider || (customApiKey ? "openrouter" : this.primaryProvider);

    let targetModel =
      typeof options === "object" && options.model
        ? options.model
        : mode === "paid"
        ? this.getPaidModel()
        : this.getFreeModel();

    if (!customApiKey) {
      const isAllowed = AVAILABLE_MODELS.some((m) => m.id === targetModel);
      if (!isAllowed) {
        targetModel = mode === "paid" ? this.getPaidModel() : this.getFreeModel();
      }
    }

    if (retrieval.insufficientEvidence || retrieval.snippets.length === 0) {
      return {
        answer:
          "INSUFFICIENT EVIDENCE: CodeAtlas could not find enough repository evidence to answer this confidently.",
        verifiedCitations: [],
        insufficientEvidence: true,
        modelUsed: hasEffectiveKey ? targetModel : "codeatlas/deterministic-synthesizer",
        mode,
      };
    }

    let rawOutput = "";
    let modelUsed = targetModel;

    const goldenDemoAnswer = !hasEffectiveKey ? getGoldenDemoAnswer(question, parsedFiles) : null;
    if (goldenDemoAnswer) {
      rawOutput = goldenDemoAnswer;
      modelUsed = "codeatlas/deterministic-synthesizer";
    } else if (hasEffectiveKey) {
      // Live AI reasoning provider
      if (effectiveProvider === "openrouter" || effectiveProvider === "custom") {
        const effort = this.determineEffort(question);
        const openRouterRes = await this.callOpenRouter(
          question,
          retrieval.contextText,
          effort,
          targetModel,
          mode,
          customApiKey,
          customBaseUrl
        );
        rawOutput = openRouterRes.content;
        modelUsed = openRouterRes.modelUsed;
      } else if (effectiveProvider === "gemini") {
        rawOutput = await this.callGemini(question, retrieval.contextText);
        modelUsed = `google/${process.env.GEMINI_MODEL || "gemini-2.0-flash"}`;
      } else if (effectiveProvider === "openai") {
        rawOutput = await this.callOpenAI(question, retrieval.contextText);
        modelUsed = "openai/gpt-4o-mini";
      } else {
        rawOutput = this.deterministicSynthesizer(question, retrieval, parsedFiles);
        modelUsed = "codeatlas/deterministic-synthesizer";
      }
    } else {
      // Offline / baseline synthesizer (no API key configured in environment)
      rawOutput = this.deterministicSynthesizer(question, retrieval, parsedFiles);
      modelUsed = "codeatlas/deterministic-synthesizer";
    }

    return this.finalizeGroundedAnswer(rawOutput, retrieval, parsedFiles, modelUsed, mode);
  }

  public async askQuestionStream(
    question: string,
    retrieval: RetrievalResult,
    parsedFiles: Map<string, ParsedFileResult>,
    options?: "free" | "paid" | "custom" | {
      mode?: "free" | "paid" | "custom";
      model?: string;
      apiKey?: string;
      provider?: string;
      baseUrl?: string;
    },
    onToken?: (token: string) => void
  ): Promise<AskResponse> {
    this.refreshConfig();

    const mode: "free" | "paid" | "custom" =
      typeof options === "string"
        ? options
        : options?.mode || (options?.model?.includes(":free") ? "free" : "free");

    const customApiKey = typeof options === "object" ? options.apiKey?.trim() : undefined;
    const customBaseUrl = typeof options === "object" ? options.baseUrl?.trim() : undefined;
    const customProvider = typeof options === "object" ? options.provider : undefined;

    if (customBaseUrl) {
      throw new Error("Custom AI endpoints are not supported.");
    }

    const hasEffectiveKey = Boolean(customApiKey || this.primaryApiKey);
    const effectiveProvider = customProvider || (customApiKey ? "openrouter" : this.primaryProvider);

    let targetModel =
      typeof options === "object" && options.model
        ? options.model
        : mode === "paid"
        ? this.getPaidModel()
        : this.getFreeModel();

    if (!customApiKey) {
      const isAllowed = AVAILABLE_MODELS.some((m) => m.id === targetModel);
      if (!isAllowed) {
        targetModel = mode === "paid" ? this.getPaidModel() : this.getFreeModel();
      }
    }

    if (retrieval.insufficientEvidence || retrieval.snippets.length === 0) {
      const msg =
        "INSUFFICIENT EVIDENCE: CodeAtlas could not find enough repository evidence to answer this confidently.";
      onToken?.(msg);
      return {
        answer: msg,
        verifiedCitations: [],
        insufficientEvidence: true,
        modelUsed: hasEffectiveKey ? targetModel : "codeatlas/deterministic-synthesizer",
        mode,
      };
    }

    let rawOutput = "";
    let modelUsed = targetModel;

    const goldenDemoAnswer = !hasEffectiveKey ? getGoldenDemoAnswer(question, parsedFiles) : null;

    if (goldenDemoAnswer) {
      rawOutput = goldenDemoAnswer;
      modelUsed = "codeatlas/deterministic-synthesizer";
      const chunkSize = 20;
      for (let i = 0; i < rawOutput.length; i += chunkSize) {
        onToken?.(rawOutput.slice(i, i + chunkSize));
        await new Promise((r) => setTimeout(r, 6));
      }
    } else if (hasEffectiveKey) {
      if (effectiveProvider === "openrouter" || effectiveProvider === "custom") {
        const effort = this.determineEffort(question);
        const openRouterRes = await this.callOpenRouterStream(
          question,
          retrieval.contextText,
          effort,
          targetModel,
          mode,
          onToken,
          customApiKey,
          customBaseUrl
        );
        rawOutput = openRouterRes.content;
        modelUsed = openRouterRes.modelUsed;
      } else if (effectiveProvider === "gemini") {
        rawOutput = await this.callGemini(question, retrieval.contextText);
        modelUsed = `google/${process.env.GEMINI_MODEL || "gemini-2.0-flash"}`;
        onToken?.(rawOutput);
      } else if (effectiveProvider === "openai") {
        rawOutput = await this.callOpenAI(question, retrieval.contextText);
        modelUsed = "openai/gpt-4o-mini";
        onToken?.(rawOutput);
      } else {
        rawOutput = this.deterministicSynthesizer(question, retrieval, parsedFiles);
        modelUsed = "codeatlas/deterministic-synthesizer";
        onToken?.(rawOutput);
      }
    } else {
      rawOutput = this.deterministicSynthesizer(question, retrieval, parsedFiles);
      modelUsed = "codeatlas/deterministic-synthesizer";
      const chunkSize = 20;
      for (let i = 0; i < rawOutput.length; i += chunkSize) {
        onToken?.(rawOutput.slice(i, i + chunkSize));
        await new Promise((r) => setTimeout(r, 6));
      }
    }

    return this.finalizeGroundedAnswer(rawOutput, retrieval, parsedFiles, modelUsed, mode);
  }
}
