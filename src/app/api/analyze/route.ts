import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { parseGitHubUrl } from "@/server/ingestion/github";
import { getSession } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
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
    const authHeader = request.headers.get("authorization");
    const session = getSession(cookieHeader, authHeader);

    // Support either session OAuth token, custom token in body/header, or server GITHUB_TOKEN
    const customToken = body?.token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined);
    const token = session?.accessToken || customToken || process.env.GITHUB_TOKEN;
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
