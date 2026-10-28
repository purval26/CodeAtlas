import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { getSession, isAuthorizedForRepo } from "@/server/auth/session";
import { isSafeIdentifier } from "@/server/security/request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const { repositoryId } = await params;
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!isSafeIdentifier(repositoryId) || !filePath || filePath.length > 1_024 || filePath.includes("\0")) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Query parameter 'path' is required." },
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
      {
        error: "UNAUTHORIZED",
        message: "Access denied: you are not authorized to access this private repository.",
      },
      { status: 403 }
    );
  }

  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
  if (!normalizedPath || normalizedPath.split("/").includes("..")) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Path must be repository-relative." }, { status: 400 });
  }

  // 1. Exact normalized path match
  let fileResult = repoData.parsedFiles.get(normalizedPath) || repoData.parsedFiles.get(filePath);

  if (!fileResult) {
    // 2. Safe unique path resolution with path boundaries (rejecting ambiguous matches)
    const matchingPaths: string[] = [];
    for (const existingPath of repoData.parsedFiles.keys()) {
      if (
        existingPath === normalizedPath ||
        existingPath.endsWith("/" + normalizedPath)
      ) {
        matchingPaths.push(existingPath);
      }
    }

    if (matchingPaths.length === 1) {
      fileResult = repoData.parsedFiles.get(matchingPaths[0]);
    } else if (matchingPaths.length > 1) {
      return NextResponse.json(
        {
          error: "AMBIGUOUS_PATH",
          message: `Ambiguous file path '${filePath}': multiple matching files found (${matchingPaths.join(", ")}). Please specify the full repository-relative path.`,
        },
        { status: 400 }
      );
    }
  }

  if (!fileResult) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `File not found: ${filePath}` },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      file: fileResult.file,
      symbols: fileResult.symbols,
      imports: fileResult.imports,
      exports: fileResult.exports,
    },
    { status: 200 }
  );
}
