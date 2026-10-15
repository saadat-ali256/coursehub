/* AUTO-FORMATTED FOR READABILITY */
/* Shared helper: contains reusable application or infrastructure logic. */
const buckets = new Map<
  string,
  {
    count: number;
    reset: number;
  }
>();
export function rateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000,
) {
  const now = Date.now();
  const x = buckets.get(key);
  if (!x || x.reset < now) {
    buckets.set(key, {
      count: 1,
      reset: now + windowMs,
    });
    return true;
  }
  if (x.count >= limit) return false;
  x.count++;
  return true;
}
export function clientKey(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
