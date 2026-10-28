import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { searchRepository } from "@/server/intelligence/search";
import { getSession, isAuthorizedForRepo } from "@/server/auth/session";
import { hasAcceptableJsonBody, hasTrustedOrigin, isSafeIdentifier, isSafeQuestion } from "@/server/security/request";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request) || !hasAcceptableJsonBody(request)) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid request origin or body size." }, { status: 400 });
    }
    const body = await request.json();
    const { repositoryId, query } = body;

    if (!isSafeIdentifier(repositoryId) || !isSafeQuestion(query)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "repositoryId and query are required." },
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

    const cookieHeader = request.headers.get("cookie");
    const session = getSession(cookieHeader);

    if (!isAuthorizedForRepo(session, repoData)) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Repository is private. Authentication required." },
        { status: 403 }
      );
    }

    const results = searchRepository(query, repoData.parsedFiles);
    return NextResponse.json({ results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message || "Failed to search repository." },
      { status: 500 }
    );
  }
}
