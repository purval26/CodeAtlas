const MAX_JSON_BODY_BYTES = 1_000_000;

/** Reject oversized JSON requests before parsing them into memory. */
export function hasAcceptableJsonBody(request: Request): boolean {
  const length = request.headers.get("content-length");
  if (!length) return true;

  const parsed = Number(length);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= MAX_JSON_BODY_BYTES;
}

/**
 * Browser-originated mutation requests must be same-origin. Requests without an
 * Origin header are permitted for non-browser clients (for example the CLI).
 */
export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
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
