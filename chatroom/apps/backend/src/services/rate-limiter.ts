/**
 * rate-limiter.ts
 *
 * Shared token-bucket rate limiter factory.
 *
 * Usage:
 *   const check = createTokenBucket(20, 60_000);
 *   if (!check('per-user-key')) { return 429; }
 *
 * Each call to createTokenBucket creates an independent bucket map so that
 * different rate limiters (API auth, invite, WS per-connection) never share
 * state and cannot starve one another.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Returns a check(key) function that returns true when the request is allowed
 * and false when the bucket for that key is empty.
 *
 * @param max       Maximum tokens per window (burst capacity)
 * @param windowMs  Rolling window duration in milliseconds
 */
export function createTokenBucket(max: number, windowMs: number): (key: string) => boolean {
  const buckets = new Map<string, Bucket>();

  return function check(key: string): boolean {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket) {
      // First request for this key — consume one token immediately
      buckets.set(key, { tokens: max - 1, lastRefill: now });
      return true;
    }

    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor((elapsed / windowMs) * max);
    if (refill > 0) {
      bucket.tokens = Math.min(max, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) return false;
    bucket.tokens -= 1;
    return true;
  };
}
