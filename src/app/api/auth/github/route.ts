import { NextResponse } from "next/server";
import { createOAuthState } from "@/server/auth/session";

function getPublicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (
    forwardedHost ? forwardedHost.split(",")[0].trim() : (request.headers.get("host") || new URL(request.url).host)
  ).toLowerCase();
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.url.startsWith("https") || host.includes("vercel.app") || host.includes("onrender.com") ? "https" : "http");
  return `${proto}://${host}`;
}

export const dynamic = "force-dynamic";

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

  const currentOrigin = getPublicOrigin(request);
  const state = createOAuthState(currentOrigin);

  // Compute redirect URI:
  // If GITHUB_REDIRECT_URI in env points to localhost/127.0.0.1, but current request is on a remote host (e.g. Vercel),
  // override the stale localhost setting with the current domain!
  const envRedirect = process.env.GITHUB_REDIRECT_URI?.trim();
  let redirectUri: string;
  if (envRedirect && !envRedirect.includes("localhost") && !envRedirect.includes("127.0.0.1")) {
    redirectUri = envRedirect;
  } else if (!currentOrigin.includes("localhost") && !currentOrigin.includes("127.0.0.1")) {
    redirectUri = `${currentOrigin}/api/auth/github/callback`;
  } else {
    redirectUri = envRedirect || `${currentOrigin}/api/auth/github/callback`;
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&scope=repo,read:user&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  const response = NextResponse.redirect(githubAuthUrl);
  response.cookies.set({
    name: "codeatlas_oauth_state",
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || currentOrigin.startsWith("https"),
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
