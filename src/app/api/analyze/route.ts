import { NextResponse } from "next/server";
import { parseGitHubUrl } from "@/lib/github-url";

export interface AnalysisJob {
  id: string;
  status:
    | "queued"
    | "fetching"
    | "indexing"
    | "parsing"
    | "resolving"
    | "graphing"
    | "completed"
    | "failed";
  progress: number;
  stageName: string;
  repositoryId?: string;
  repository?: {
    owner: string;
    name: string;
    url: string;
    branch: string;
  };
  fileCount?: number;
  error?: string;
  createdAt: string;
}

// In-memory job registry for development / fast prototype verification
const jobs = new Map<string, AnalysisJob>();

export function getJob(jobId: string): AnalysisJob | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, updates: Partial<AnalysisJob>): AnalysisJob | undefined {
  const current = jobs.get(jobId);
  if (!current) return undefined;
  const updated = { ...current, ...updates };
  jobs.set(jobId, updated);
  return updated;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = parseGitHubUrl(body?.url);

    if (!parseResult.valid) {
      return NextResponse.json(
        {
          error: "INVALID_REPOSITORY",
          message: parseResult.error,
        },
        { status: 400 }
      );
    }

    const { owner, repo, normalizedUrl } = parseResult.data;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const repositoryId = `repo_${owner}_${repo}`.toLowerCase();

    const job: AnalysisJob = {
      id: jobId,
      status: "queued",
      progress: 5,
      stageName: "01 QUEUED",
      repositoryId,
      repository: {
        owner,
        name: repo,
        url: normalizedUrl,
        branch: "main",
      },
      createdAt: new Date().toISOString(),
    };

    jobs.set(jobId, job);

    return NextResponse.json(
      {
        jobId,
        status: job.status,
        repository: job.repository,
        stage: job.stageName,
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse request payload";
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message,
      },
      { status: 400 }
    );
  }
}
