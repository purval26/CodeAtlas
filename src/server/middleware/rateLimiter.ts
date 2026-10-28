export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export class MemoryRateLimiter {
  private hits = new Map<string, number[]>();
  private windowMs: number;
  private max: number;
  private message: string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.message = options.message || "Too many requests. Please try again later.";
  }

  public check(ip: string): { allowed: boolean; retryAfter?: number; message?: string } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.hits.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= this.max) {
      const oldest = validTimestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      return { allowed: false, retryAfter, message: this.message };
    }

    validTimestamps.push(now);
    this.hits.set(ip, validTimestamps);

    // Keep an in-memory fallback bounded when anonymous clients rotate identifiers.
    if (this.hits.size > 10_000) {
      for (const [key, entries] of this.hits.entries()) {
        if (entries.every((timestamp) => timestamp <= windowStart)) this.hits.delete(key);
      }
    }
    return { allowed: true };
  }

  public reset() {
    this.hits.clear();
  }
}

export function getClientIp(request: Request): string {
  // Cloudflare header (Render and custom domains using Cloudflare)
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Vercel proxy header
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  // Standard reverse proxy headers
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "127.0.0.1";
}

export const analyzeRateLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: "Rate limit exceeded for repository analysis (30 requests per 15 minutes). Please try again shortly.",
});

export const askRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: "Rate limit exceeded for repository questions (30 requests per minute). Please try again shortly.",
});
