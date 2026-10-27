import { NextResponse } from "next/server";
import { parseCookieString, destroySession } from "@/server/auth/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookieString(cookieHeader);
  const sessionId = cookies["codeatlas_session"];

  if (sessionId) {
    destroySession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("codeatlas_session");
  return response;
}
