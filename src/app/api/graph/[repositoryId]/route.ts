import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { getSession, isAuthorizedForRepo } from "@/server/auth/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const { repositoryId } = await params;
  const repoData = jobManager.getRepositoryData(repositoryId);

  if (!repoData) {
    return NextResponse.json(
      {
        error: "NOT_FOUND",
        message: `Graph data for repository ${repositoryId} not found.`,
      },
      { status: 404 }
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const authHeader = request.headers.get("authorization");
  const session = getSession(cookieHeader, authHeader);

  if (!isAuthorizedForRepo(session, repoData)) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "This repository is private. Please log in with GitHub to access it.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json(repoData.graphData, { status: 200 });
}
