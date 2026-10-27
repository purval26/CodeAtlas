import { NextResponse } from "next/server";
import { jobManager } from "@/server/jobs";

export async function GET(
  _request: Request,
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

  return NextResponse.json(job, { status: 200 });
}
