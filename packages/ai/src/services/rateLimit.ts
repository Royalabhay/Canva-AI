interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

export function assertRateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) throw new Error("AI rate limit exceeded. Please wait before starting another generation.");
  bucket.count += 1;
}
