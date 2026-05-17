const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(key: string, limit = 30, windowMs = 60_000): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) throw new Error("Export rate limit exceeded. Please try again shortly.");
  bucket.count += 1;
}
