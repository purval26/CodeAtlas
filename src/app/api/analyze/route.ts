import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { parseGitHubUrl } from "@/server/ingestion/github";
import { getSession } from "@/server/auth/session";
import { analyzeRateLimiter, getClientIp } from "@/server/middleware/rateLimiter";
import { hasAcceptableJsonBody, hasTrustedOrigin } from "@/server/security/request";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Cross-origin requests are not allowed." }, { status: 403 });
    }
    if (!hasAcceptableJsonBody(request)) {
      return NextResponse.json({ error: "PAYLOAD_TOO_LARGE", message: "Request body is too large." }, { status: 413 });
    }
    const ip = getClientIp(request);
    const rateCheck = analyzeRateLimiter.check(ip);
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
    const url = body?.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Repository URL is required." },
        { status: 400 }
      );
    }

    try {
      parseGitHubUrl(url);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: "INVALID_URL", message: parseErr.message },
        { status: 400 }
      );
    }

    // Check for user session or optional custom token
    const cookieHeader = request.headers.get("cookie");
    const session = getSession(cookieHeader);

    // Private repository access is intentionally limited to the OAuth session.
    // Arbitrary GitHub tokens in request bodies are easy to leak and cannot be tied to a user.
    const token = session?.accessToken || process.env.GITHUB_TOKEN;
    const userId = session?.user?.id;

    const job = jobManager.createJob(url, token, userId);

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
      },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message || "Failed to start analysis." },
      { status: 500 }
    );
  }
}
