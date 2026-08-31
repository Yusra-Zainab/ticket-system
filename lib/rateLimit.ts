import "server-only";

/*
 * Minimal in-memory fixed-window rate limiter for auth endpoints (F4).
 * Process-local — fine for a single Node instance; swap for Redis if the
 * app is ever horizontally scaled. Not a substitute for a WAF, but stops
 * trivial credential-stuffing / reset-spam.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

/**
 * @param key      caller identity (e.g. `login:ip:1.2.3.4` or `login:email:x@y.com`)
 * @param limit    max attempts per window
 * @param windowMs window length in ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/** Clear a key early — call after a *successful* login so a good user isn't throttled. */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many attempts. Please wait a moment and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
