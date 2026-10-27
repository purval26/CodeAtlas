import { randomUUID } from "node:crypto";
import { AuthUser } from "@/types";
import { StoredRepoData } from "../jobs";

export interface UserSession {
  user: AuthUser;
  accessToken: string;
  createdAt: number;
}

const globalForAuth = globalThis as unknown as {
  userSessions?: Map<string, UserSession>;
  oauthStates?: Map<string, number>;
};

const userSessions = globalForAuth.userSessions || new Map<string, UserSession>();
const oauthStates = globalForAuth.oauthStates || new Map<string, number>();
globalForAuth.userSessions = userSessions;
globalForAuth.oauthStates = oauthStates;

// Parse cookie string into key-value map
export function parseCookieString(cookieHeader: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    if (name) {
      map[name] = decodeURIComponent(parts.slice(1).join("=").trim());
    }
  });
  return map;
}

export function createOAuthState(): string {
  const state = randomUUID();
  oauthStates.set(state, Date.now());

  // Clean up states older than 10 minutes
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  for (const [st, time] of oauthStates.entries()) {
    if (time < tenMinAgo) oauthStates.delete(st);
  }

  return state;
}

export function verifyAndConsumeOAuthState(state: string): boolean {
  if (!state || !oauthStates.has(state)) return false;
  oauthStates.delete(state);
  return true;
}

export function createSession(user: AuthUser, accessToken: string): string {
  const sessionId = `sess_${randomUUID().replace(/-/g, "")}`;
  userSessions.set(sessionId, {
    user,
    accessToken,
    createdAt: Date.now(),
  });
  return sessionId;
}

export function destroySession(sessionId: string): void {
  userSessions.delete(sessionId);
}

export function getSession(cookieHeader: string | null, authHeader?: string | null): UserSession | undefined {
  const cookies = parseCookieString(cookieHeader);
  const sessionId = cookies["codeatlas_session"];
  if (sessionId && userSessions.has(sessionId)) {
    return userSessions.get(sessionId);
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    for (const session of userSessions.values()) {
      if (session.accessToken === token) {
        return session;
      }
    }
  }

  return undefined;
}

export function isAuthorizedForRepo(session: UserSession | undefined, repoData: StoredRepoData): boolean {
  // Public repositories (or golden demo repo) are accessible to all
  if (!repoData.repository.isPrivate) {
    return true;
  }

  // Private repositories require an authenticated session
  if (!session) {
    return false;
  }

  // Creator / initiator of analysis
  if (repoData.ownerUserId !== undefined && session.user.id === repoData.ownerUserId) {
    return true;
  }

  // Explicitly authorized user ID
  if (repoData.authorizedUserIds && repoData.authorizedUserIds.has(session.user.id)) {
    return true;
  }

  // Repository owner matches logged-in user
  if (
    repoData.repository.owner &&
    session.user.login &&
    repoData.repository.owner.toLowerCase() === session.user.login.toLowerCase()
  ) {
    return true;
  }

  return false;
}
