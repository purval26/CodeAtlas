import { randomUUID, createHmac } from "node:crypto";
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

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getAuthSecret(): string {
  return (
    process.env.GITHUB_CLIENT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "codeatlas-production-auth-hmac-secret-v1"
  );
}

function pruneExpiredSessions(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of userSessions.entries()) {
    if (session.createdAt < cutoff) userSessions.delete(id);
  }
}

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

/**
 * Creates an OAuth state token that encodes the originating origin (e.g. Vercel deployment)
 * and an HMAC signature so it can be safely verified on serverless functions across instances.
 */
export function createOAuthState(origin?: string): string {
  const rawId = randomUUID();
  oauthStates.set(rawId, Date.now());

  // Clean up states older than 10 minutes
  const tenMinAgo = Date.now() - OAUTH_STATE_TTL_MS;
  for (const [st, time] of oauthStates.entries()) {
    if (time < tenMinAgo) oauthStates.delete(st);
  }

  const payload = {
    id: rawId,
    origin: origin || "",
    createdAt: Date.now(),
  };

  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret()).update(dataStr).digest("base64url");
  return `st_${dataStr}.${signature}`;
}

export interface VerifiedOAuthState {
  valid: boolean;
  origin?: string;
  rawId?: string;
}

/**
 * Verifies OAuth state token. Checks HMAC signature, expiration, and in-memory fallback.
 */
export function verifyOAuthState(state: string | null | undefined): VerifiedOAuthState {
  if (!state || typeof state !== "string") {
    return { valid: false };
  }

  // Handle stateless signed state: st_<base64url>.<signature>
  if (state.startsWith("st_")) {
    const [dataStr, signature] = state.slice(3).split(".");
    if (!dataStr || !signature) {
      return { valid: false };
    }

    const expectedSig = createHmac("sha256", getAuthSecret()).update(dataStr).digest("base64url");
    if (signature !== expectedSig) {
      return { valid: false };
    }

    try {
      const payload = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf-8"));
      if (!payload || !payload.createdAt || Date.now() - payload.createdAt > OAUTH_STATE_TTL_MS) {
        return { valid: false };
      }

      if (payload.id) {
        oauthStates.delete(payload.id);
      }

      return {
        valid: true,
        origin: payload.origin || undefined,
        rawId: payload.id,
      };
    } catch {
      return { valid: false };
    }
  }

  // Fallback to legacy in-memory state lookup
  const createdAt = oauthStates.get(state);
  if (createdAt && Date.now() - createdAt <= OAUTH_STATE_TTL_MS) {
    oauthStates.delete(state);
    return { valid: true };
  }

  return { valid: false };
}

export function verifyAndConsumeOAuthState(state: string): boolean {
  return verifyOAuthState(state).valid;
}

/**
 * Creates a signed session token. Includes an HMAC signature so serverless lambdas
 * (e.g. on Vercel) can verify sessions across ephemeral instances without an external DB.
 */
export function createSession(user: AuthUser, accessToken: string): string {
  const sessionId = `sess_${randomUUID().replace(/-/g, "")}`;
  const now = Date.now();

  const sessionObj: UserSession = {
    user,
    accessToken,
    createdAt: now,
  };

  userSessions.set(sessionId, sessionObj);

  // Sign payload for stateless serverless recovery
  const payload = {
    sid: sessionId,
    user,
    accessToken,
    createdAt: now,
  };

  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret()).update(dataStr).digest("base64url");
  return `${sessionId}.${dataStr}.${signature}`;
}

export function destroySession(sessionId: string): void {
  const cleanId = sessionId.split(".")[0];
  userSessions.delete(cleanId);
}

export function getSession(cookieHeader: string | null, authHeader?: string | null): UserSession | undefined {
  void authHeader; // GitHub OAuth tokens must never be accepted as application bearer tokens.
  pruneExpiredSessions();

  const cookies = parseCookieString(cookieHeader);
  const rawSession = cookies["codeatlas_session"];
  if (!rawSession) return undefined;

  const parts = rawSession.split(".");
  const cleanId = parts[0];

  // 1. In-memory hit (fast path on persistent process)
  if (cleanId && userSessions.has(cleanId)) {
    return userSessions.get(cleanId);
  }

  // 2. Stateless HMAC verification (Vercel serverless multi-instance recovery)
  if (parts.length === 3) {
    const [, dataStr, signature] = parts;
    const expectedSig = createHmac("sha256", getAuthSecret()).update(dataStr).digest("base64url");
    if (signature === expectedSig) {
      try {
        const payload = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf-8"));
        if (payload && payload.user && payload.accessToken && payload.createdAt) {
          if (Date.now() - payload.createdAt <= SESSION_TTL_MS) {
            const restored: UserSession = {
              user: payload.user,
              accessToken: payload.accessToken,
              createdAt: payload.createdAt,
            };
            // Cache in memory for subsequent calls on this instance
            userSessions.set(cleanId, restored);
            return restored;
          }
        }
      } catch {}
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
