import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { getSession, isAuthorizedForRepo } from "@/server/auth/session";
import { isSafeIdentifier } from "@/server/security/request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const { repositoryId } = await params;
  if (!isSafeIdentifier(repositoryId)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid repository identifier." }, { status: 400 });
  }
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
  const session = getSession(cookieHeader);

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
