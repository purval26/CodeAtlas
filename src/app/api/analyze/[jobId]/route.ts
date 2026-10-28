import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";
import { getSession } from "@/server/auth/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        error: "NOT_FOUND",
        message: `Analysis job ${jobId} was not found or has expired.`,
      },
      { status: 404 }
    );
  }

  const ownerUserId = jobManager.getJobOwnerId(jobId);
  if (ownerUserId !== undefined) {
    const session = getSession(request.headers.get("cookie"));
    if (!session || session.user.id !== ownerUserId) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "You are not authorized to view this analysis job." }, { status: 403 });
    }
  }

  return NextResponse.json(job, { status: 200 });
}
