import { NextResponse } from "next/server";
import { createOAuthState } from "@/server/auth/session";

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error: "OAUTH_UNCONFIGURED",
        message: "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.",
      },
      { status: 400 }
    );
  }

  const state = createOAuthState();
  const urlObj = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || urlObj.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || urlObj.host;
  const defaultRedirect = `${proto}://${host}/api/auth/github/callback`;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || defaultRedirect;

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&scope=repo,read:user&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return NextResponse.redirect(githubAuthUrl);
}
