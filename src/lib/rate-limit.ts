import { NextRequest } from "next/server";

const DEFAULT_WINDOW_MS = 60_000; // 1 minute

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateEntry>();

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function isRateLimitedKey(key: string, max = 10, windowMs = DEFAULT_WINDOW_MS) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfter: 0 };
  }

  if (entry.count >= max) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { limited: false, retryAfter: 0 };
}

export function resetRateLimitForKey(key: string) {
  rateLimitStore.delete(key);
}

export default {
  getClientIp,
  isRateLimitedKey,
  resetRateLimitForKey,
};
