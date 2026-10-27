import { NextResponse } from "next/server";
import { verifyAndConsumeOAuthState, createSession } from "@/server/auth/session";

export async function GET(request: Request) {
  const urlObj = new URL(request.url);
  const code = urlObj.searchParams.get("code");
  const state = urlObj.searchParams.get("state");

  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  if (!code || !state || !verifyAndConsumeOAuthState(state)) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=invalid_state_or_code`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=oauth_unconfigured`);
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
      return NextResponse.redirect(`${baseUrl}/?auth_error=token_exchange_failed`);
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
      return NextResponse.redirect(`${baseUrl}/?auth_error=user_fetch_failed`);
    }

    const userData = (await userRes.json()) as any;
    const sessionId = createSession(
      {
        id: userData.id,
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        htmlUrl: userData.html_url,
      },
      accessToken
    );

    const response = NextResponse.redirect(`${baseUrl}/?auth=success`);

    response.cookies.set({
      name: "codeatlas_session",
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?auth_error=internal_error`);
  }
}
