import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const { repositoryId } = await params;
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
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

  const fileResult = repoData.parsedFiles.get(filePath);
  if (!fileResult) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `File ${filePath} not found in repository.` },
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
