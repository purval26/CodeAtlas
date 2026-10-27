import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";

export async function GET(
  _request: Request,
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

  return NextResponse.json(repoData.graphData, { status: 200 });
}
