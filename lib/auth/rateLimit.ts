import "server-only";

interface Bucket {
  timestamps: number[];
}

/**
 * In-memory sliding-window rate limiter. Suitable for a single-container
 * deployment; a multi-instance deployment needs a shared store instead.
 */
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Drop the oldest-inserted bucket to bound memory under abuse.
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= maxAttempts) return false;

  bucket.timestamps.push(now);
  return true;
}

export function rateLimitAuthAttempt(ip: string, identifier?: string): boolean {
  const ipAllowed = checkRateLimit(`ip:${ip}`, 20, 15 * 60 * 1000);
  const idAllowed = identifier
    ? checkRateLimit(`id:${identifier.toLowerCase()}`, 10, 15 * 60 * 1000)
    : true;
  return ipAllowed && idAllowed;
}
