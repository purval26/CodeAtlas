import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { traceDependencyFlow } from "@/server/trace/flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repositoryId, startNodeId, endNodeId } = body;

    if (!repositoryId || !startNodeId || !endNodeId) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "repositoryId, startNodeId, and endNodeId are required." },
        { status: 400 }
      );
    }

    const repoData = jobManager.getRepositoryData(repositoryId);
    if (!repoData) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Repository ${repositoryId} not found.` },
        { status: 404 }
      );
    }

    const { nodes, edges } = repoData.graphData;
    const result = traceDependencyFlow(startNodeId, endNodeId, nodes, edges);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message || "Failed to trace flow." },
      { status: 500 }
    );
  }
}
