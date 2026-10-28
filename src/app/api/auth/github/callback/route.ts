import { NextResponse } from "next/server";
import { verifyOAuthState, createSession, parseCookieString } from "@/server/auth/session";

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
  const urlObj = new URL(request.url);
  const code = urlObj.searchParams.get("code");
  const state = urlObj.searchParams.get("state");
  const cookies = parseCookieString(request.headers.get("cookie"));
  const expectedState = cookies["codeatlas_oauth_state"];

  const currentOrigin = getPublicOrigin(request);

  // Verify OAuth state token
  const stateCheck = verifyOAuthState(state);

  // If this callback hit localhost:3000, BUT the state token shows the flow was initiated on Vercel:
  // (This happens if the developer's GitHub OAuth app only has http://localhost:3000 registered in GitHub Developer Settings)
  // Forward the authorization code back to the Vercel site so the user's session lands on Vercel!
  if (
    stateCheck.origin &&
    !stateCheck.origin.includes("localhost") &&
    !stateCheck.origin.includes("127.0.0.1") &&
    (currentOrigin.includes("localhost") || currentOrigin.includes("127.0.0.1"))
  ) {
    return NextResponse.redirect(`${stateCheck.origin}/api/auth/github/callback${urlObj.search}`);
  }

  const targetBaseUrl = stateCheck.origin || currentOrigin;

  // Validate state and code (accept matching cookie or valid signed state)
  const isStateValid = stateCheck.valid && (!expectedState || state === expectedState || Boolean(stateCheck.origin));
  if (!code || !state || !isStateValid) {
    return NextResponse.redirect(`${targetBaseUrl}/?auth_error=invalid_state_or_code`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${targetBaseUrl}/?auth_error=oauth_unconfigured`);
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenData || !tokenData.access_token) {
      console.error("GitHub OAuth token exchange failed:", tokenData);
      return NextResponse.redirect(`${targetBaseUrl}/?auth_error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile from GitHub
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "CodeAtlas",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${targetBaseUrl}/?auth_error=user_fetch_failed`);
    }

    const userData = (await userRes.json()) as any;
    const sessionToken = createSession(
      {
        id: userData.id,
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        htmlUrl: userData.html_url,
      },
      accessToken
    );

    const response = NextResponse.redirect(`${targetBaseUrl}/?auth=success`);

    response.cookies.set({
      name: "codeatlas_session",
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || targetBaseUrl.startsWith("https"),
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    response.cookies.delete("codeatlas_oauth_state");

    return response;
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${targetBaseUrl}/?auth_error=internal_error`);
  }
}
