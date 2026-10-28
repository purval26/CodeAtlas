const MAX_JSON_BODY_BYTES = 1_000_000;

/** Reject oversized JSON requests before parsing them into memory. */
export function hasAcceptableJsonBody(request: Request): boolean {
  const length = request.headers.get("content-length");
  if (!length) return true;

  const parsed = Number(length);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= MAX_JSON_BODY_BYTES;
}

/**
 * Browser-originated mutation requests must originate from a trusted origin.
 * Requests without an Origin header are permitted for non-browser clients (such as the CLI or curl).
 * Handles reverse proxy TLS termination and cloud hosting hosts (Render, Vercel).
 */
export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();
    const originHostname = originUrl.hostname.toLowerCase();

    // 1. Direct match with request.url (standard same-origin)
    try {
      const requestUrl = new URL(request.url);
      if (originUrl.origin === requestUrl.origin) return true;
      if (originHost === requestUrl.host.toLowerCase()) return true;
      if (originHostname === requestUrl.hostname.toLowerCase()) return true;
    } catch {
      // Ignore request.url parse issues
    }

    // 2. Reverse proxy headers: x-forwarded-host and host
    // When deployed behind a reverse proxy (e.g. Render, Vercel, Cloudflare, AWS),
    // SSL is terminated at the edge and internal requests may have http:// or internal ports.
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const clientHost = forwardedHost.split(",")[0].trim().toLowerCase();
      if (originHost === clientHost || originHostname === clientHost.split(":")[0]) {
        return true;
      }
    }

    const hostHeader = request.headers.get("host");
    if (hostHeader) {
      const serverHost = hostHeader.split(",")[0].trim().toLowerCase();
      if (originHost === serverHost || originHostname === serverHost.split(":")[0]) {
        return true;
      }
    }

    // 3. User-configured allowed origins (for separate frontend/backend deployments)
    const allowedEnv =
      process.env.ALLOWED_ORIGINS ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL;
    if (allowedEnv) {
      const originsList = allowedEnv
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      for (const item of originsList) {
        if (item === origin.toLowerCase() || item === originHost || item === originHostname) {
          return true;
        }
      }
    }

    // 4. Localhost and loopback for local development/testing
    if (
      originHostname === "localhost" ||
      originHostname === "127.0.0.1" ||
      originHostname === "::1" ||
      originHostname.endsWith(".localhost")
    ) {
      return true;
    }

    // 5. Cloud deployment domains (Render and Vercel services)
    if (originHostname.endsWith(".onrender.com") || originHostname.endsWith(".vercel.app")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function isSafeIdentifier(value: unknown, maxLength = 160): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9_.:-]+$/.test(value)
  );
}

export function isSafeQuestion(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 8_000;
}
