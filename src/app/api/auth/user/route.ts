import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const authHeader = request.headers.get("authorization");
  const session = getSession(cookieHeader, authHeader);

  const oauthConfigured = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  );

  if (session) {
    return NextResponse.json({
      authenticated: true,
      user: session.user,
      oauthConfigured,
    });
  }

  return NextResponse.json({
    authenticated: false,
    user: null,
    oauthConfigured,
  });
}
