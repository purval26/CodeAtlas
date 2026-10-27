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
    return { allowed: true };
  }

  public reset() {
    this.hits.clear();
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export const analyzeRateLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: "Rate limit exceeded for repository analysis (15 requests per 15 minutes). Please try again later.",
});

export const askRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 25,
  message: "Rate limit exceeded for repository questions (25 requests per minute). Please try again shortly.",
});
