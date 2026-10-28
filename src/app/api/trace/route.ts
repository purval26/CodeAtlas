import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { traceDependencyFlow } from "@/server/trace/flow";
import { getSession, isAuthorizedForRepo } from "@/server/auth/session";
import { hasAcceptableJsonBody, hasTrustedOrigin, isSafeIdentifier } from "@/server/security/request";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Cross-origin requests are not allowed." }, { status: 403 });
    }
    if (!hasAcceptableJsonBody(request)) {
      return NextResponse.json({ error: "PAYLOAD_TOO_LARGE", message: "Request body is too large." }, { status: 413 });
    }
    const body = await request.json();
    const { repositoryId, startNodeId, endNodeId } = body;

    if (!isSafeIdentifier(repositoryId) || !isSafeIdentifier(startNodeId) || !isSafeIdentifier(endNodeId)) {
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

    const session = getSession(request.headers.get("cookie"));
    if (!isAuthorizedForRepo(session, repoData)) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Repository access is not authorized." }, { status: 403 });
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
