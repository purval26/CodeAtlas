import { NextResponse } from "next/server";
import { parseCookieString, destroySession } from "@/server/auth/session";
import { hasTrustedOrigin } from "@/server/security/request";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieString(cookieHeader);
  const sessionId = cookies["codeatlas_session"];

  if (sessionId) {
    destroySession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: "codeatlas_session", value: "", path: "/", maxAge: 0 });
  return response;
}
