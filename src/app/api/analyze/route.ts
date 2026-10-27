import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { parseGitHubUrl } from "@/server/ingestion/github";

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

    const job = jobManager.createJob(url);

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
