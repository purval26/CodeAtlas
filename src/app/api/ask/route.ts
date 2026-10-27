import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { buildBoundedContext } from "@/server/intelligence/retrieval";
import { llmAdapter } from "@/server/intelligence/instance";
import { getSession, isAuthorizedForRepo } from "@/server/auth/session";
import { AVAILABLE_MODELS } from "@/types";
import { askRateLimiter, getClientIp } from "@/server/middleware/rateLimiter";

export async function POST(request: Request) {
  try {
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
    const { repositoryId, question, mode, model, reasoningEffort } = body;

    if (!repositoryId || !question) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Missing required 'repositoryId' or 'question'." },
        { status: 400 }
      );
    }

    if (model && typeof model === "string") {
      const isAllowed = AVAILABLE_MODELS.some((m) => m.id === model);
      if (!isAllowed) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: `Invalid model: '${model}'.` },
          { status: 400 }
        );
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
    const authHeader = request.headers.get("authorization");
    const session = getSession(cookieHeader, authHeader);

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

    const response = await llmAdapter.askQuestion(
      question,
      retrieval,
      repoData.parsedFiles,
      {
        mode: targetMode,
        model: model ? String(model) : undefined,
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
