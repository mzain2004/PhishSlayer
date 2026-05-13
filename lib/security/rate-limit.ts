/**
 * Rate limiter. Redis-backed when REDIS_URL is set, in-memory otherwise.
 *
 * Usage:
 *   const { allowed } = await rateLimit(`alerts:${orgId}`, 100, 60);
 *   if (!allowed) return rateLimitResponse();
 *
 * Counter semantics: fixed window. First call sets EXPIRE; subsequent calls
 * INCR the same window. Cheap and good enough for abuse prevention; not
 * cryptographically precise.
 */

import type { RedisClientType } from "redis";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

// ---- Redis client (lazy, optional) ----------------------------------------

let redisClient: RedisClientType | null = null;
let redisInitAttempted = false;

async function getRedis(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient;
  if (redisInitAttempted) return null;
  redisInitAttempted = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const { createClient } = await import("redis");
    const client = createClient({ url }) as RedisClientType;
    client.on("error", () => {
      // Swallow connection errors at the limiter; we'll fall through to memory.
    });
    await client.connect();
    redisClient = client;
    return client;
  } catch {
    return null;
  }
}

// ---- In-memory fallback ----------------------------------------------------

type MemoryEntry = { count: number; resetAt: number };
const memory = new Map<string, MemoryEntry>();

function memoryCheck(
  key: string,
  max: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }
  if (entry.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return {
    allowed: true,
    remaining: max - entry.count,
    retryAfterSeconds: 0,
  };
}

// ---- Public API ------------------------------------------------------------

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const fullKey = `ratelimit:${key}`;
  const client = await getRedis();
  if (!client) return memoryCheck(fullKey, maxRequests, windowSeconds);

  try {
    const count = await client.incr(fullKey);
    if (count === 1) {
      await client.expire(fullKey, windowSeconds);
    }
    if (count > maxRequests) {
      const ttl = await client.ttl(fullKey);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    }
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - count),
      retryAfterSeconds: 0,
    };
  } catch {
    // If Redis errors mid-flight, fall back to memory rather than fail-open
    // for the rest of the window.
    return memoryCheck(fullKey, maxRequests, windowSeconds);
  }
}

import { NextResponse } from "next/server";

export function rateLimitResponse(retryAfterSeconds: number = 60) {
  return NextResponse.json(
    { error: "Rate limit exceeded" },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
    },
  );
}
