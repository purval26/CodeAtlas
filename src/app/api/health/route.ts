import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
