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
  const redirectUri = process.env.GITHUB_REDIRECT_URI;

  let githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&scope=repo,read:user&state=${encodeURIComponent(state)}`;

  // If redirect URI is explicitly configured in .env, supply it; otherwise let GitHub use the registered callback URL
  if (redirectUri) {
    githubAuthUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  const response = NextResponse.redirect(githubAuthUrl);
  response.cookies.set({
    name: "codeatlas_oauth_state",
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/github/callback",
    maxAge: 10 * 60,
  });
  return response;
}
