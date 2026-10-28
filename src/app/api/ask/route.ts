import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { buildBoundedContext } from "@/server/intelligence/retrieval";
import { llmAdapter } from "@/server/intelligence/instance";
import { getSession, isAuthorizedForRepo } from "@/server/auth/session";
import { AVAILABLE_MODELS } from "@/types";
import { askRateLimiter, getClientIp } from "@/server/middleware/rateLimiter";
import { hasAcceptableJsonBody, hasTrustedOrigin, isSafeIdentifier, isSafeQuestion } from "@/server/security/request";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Cross-origin requests are not allowed." }, { status: 403 });
    }
    if (!hasAcceptableJsonBody(request)) {
      return NextResponse.json({ error: "PAYLOAD_TOO_LARGE", message: "Request body is too large." }, { status: 413 });
    }
    const ip = getClientIp(request);
    const rateCheck = askRateLimiter.check(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: rateCheck.message },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfter || 60) },
        }
      );
    }

    const body = await request.json();
    const { repositoryId, question, mode, model, provider, baseUrl } = body;

    // Check optional custom API key in headers as well
    const headerApiKey = request.headers.get("x-custom-api-key") || undefined;
    const effectiveApiKey = headerApiKey?.trim();
    const effectiveProvider = typeof provider === "string" ? provider.trim() : undefined;
    const effectiveBaseUrl = typeof baseUrl === "string" ? baseUrl.trim() : undefined;

    if (!isSafeIdentifier(repositoryId) || !isSafeQuestion(question)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Missing required 'repositoryId' or 'question'." },
        { status: 400 }
      );
    }

    if (effectiveApiKey && effectiveApiKey.length > 2_048) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "API key is too long." }, { status: 400 });
    }

    // Requests are made from the server and include repository context. Allowing
    // arbitrary endpoints would create an SSRF primitive and could disclose a
    // server-managed provider key on retries.
    if (effectiveBaseUrl) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Custom AI endpoints are not supported. Use a supported provider configuration." }, { status: 400 });
    }

    if (mode === "custom" && !effectiveApiKey) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Custom model mode requires a valid custom API key." },
        { status: 400 }
      );
    }

    if (model && typeof model === "string") {
      const trimmedModel = model.trim();
      const isBuiltin = AVAILABLE_MODELS.some((m) => m.id === trimmedModel);

      if (effectiveApiKey) {
        // User-funded request: validate model identifier format (prevent injection / control characters)
        const isSafeCustomFormat = /^[a-zA-Z0-9_\-.:/]+$/.test(trimmedModel) && trimmedModel.length <= 128;
        if (!isSafeCustomFormat) {
          return NextResponse.json(
            { error: "BAD_REQUEST", message: `Invalid custom model identifier: '${model}'.` },
            { status: 400 }
          );
        }
      } else {
        // Server-funded request: strictly enforce allowlist against AVAILABLE_MODELS
        if (!isBuiltin) {
          return NextResponse.json(
            {
              error: "BAD_REQUEST",
              message: `Invalid model '${model}'. For server-funded requests, model must be one of: ${AVAILABLE_MODELS.map((m) => m.id).join(", ")}. To use other models, provide your own API key in Settings.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const repoData = jobManager.getRepositoryData(repositoryId);
    if (!repoData) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Repository ${repositoryId} not found.` },
        { status: 404 }
      );
    }

    const cookieHeader = request.headers.get("cookie");
    const session = getSession(cookieHeader);

    if (!isAuthorizedForRepo(session, repoData)) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Repository is private. Authentication required." },
        { status: 403 }
      );
    }

    const retrieval = buildBoundedContext(
      question,
      repoData.parsedFiles,
      repoData.graphData
    );

    const targetMode: "free" | "paid" = mode === "paid" ? "paid" : "free";

    const isStream =
      body.stream === true ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (isStream) {
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            const response = await llmAdapter.askQuestionStream(
              question,
              retrieval,
              repoData.parsedFiles,
              {
                mode: targetMode,
                model: model ? String(model) : undefined,
                apiKey: effectiveApiKey,
                provider: effectiveProvider,
                baseUrl: effectiveBaseUrl,
              },
              (token: string) => {
                controller.enqueue(
                  encoder.encode(`event: token\ndata: ${JSON.stringify({ token })}\n\n`)
                );
              }
            );

            controller.enqueue(
              encoder.encode(`event: done\ndata: ${JSON.stringify(response)}\n\n`)
            );
            controller.close();
          } catch (err: any) {
            console.error("Ask stream error:", err);
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({
                  error: err.message || "Internal error processing question stream.",
                })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(customStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const response = await llmAdapter.askQuestion(
      question,
      retrieval,
      repoData.parsedFiles,
      {
        mode: targetMode,
        model: model ? String(model) : undefined,
        apiKey: effectiveApiKey,
        provider: effectiveProvider,
        baseUrl: effectiveBaseUrl,
      }
    );

    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error("Ask endpoint error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message || "Failed to process question." },
      { status: 502 }
    );
  }
}
