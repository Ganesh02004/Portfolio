import 'server-only';

import { createHash } from 'node:crypto';
import { asAuth, asPublic, type TaskClient } from '@/lib/db/client';

/**
 * Fixed-window rate limiting backed by Postgres.
 *
 * The first release deliberately avoids a second datastore. A fixed window is
 * coarser than a sliding window, but it is sufficient to stop form-flooding
 * and credential stuffing, and it needs no extra infrastructure. If limits
 * ever need to be strict, move this to a dedicated limiter rather than making
 * the SQL cleverer.
 *
 * Client identifiers are hashed before storage so the table never holds raw
 * IP addresses.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Logical bucket, e.g. 'submission' or 'login'. */
  scope: string;
  /** Caller identity — typically the client IP. Hashed before use. */
  identifier: string;
  limit: number;
  windowSeconds: number;
  /** Which database role performs the check. Login runs before auth exists. */
  role?: 'public' | 'auth';
}

function bucketKey(scope: string, identifier: string): string {
  const digest = createHash('sha256').update(identifier).digest('base64url').slice(0, 32);
  return `${scope}:${digest}`;
}

function windowStart(windowSeconds: number, now: Date): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

async function consume(
  client: TaskClient,
  options: RateLimitOptions,
  now: Date,
): Promise<RateLimitResult> {
  const key = bucketKey(options.scope, options.identifier);
  const start = windowStart(options.windowSeconds, now);

  const { rows } = await client.query<{ hit_count: number }>(
    `INSERT INTO rate_limit_hits (bucket_key, window_start, hit_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (bucket_key, window_start)
     DO UPDATE SET hit_count = rate_limit_hits.hit_count + 1
     RETURNING hit_count`,
    [key, start],
  );

  const hitCount = rows[0]?.hit_count ?? 1;
  const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  const retryAfterSeconds = Math.max(1, options.windowSeconds - elapsedSeconds);

  return {
    allowed: hitCount <= options.limit,
    remaining: Math.max(0, options.limit - hitCount),
    retryAfterSeconds,
  };
}

/**
 * Records a hit and reports whether the caller is still within its limit.
 *
 * Fails open: if the counter cannot be written the request is allowed through,
 * because losing a genuine inquiry is worse than permitting one extra attempt.
 * The failure is logged so the condition is visible.
 */
export async function checkRateLimit(
  options: RateLimitOptions,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const runner = options.role === 'auth' ? asAuth : asPublic;

  try {
    return await runner((client) => consume(client, options, now));
  } catch (error) {
    console.error('[rate-limit] check failed, allowing request', {
      scope: options.scope,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { allowed: true, remaining: options.limit, retryAfterSeconds: 0 };
  }
}

/** Removes windows that can no longer be hit. Safe to call on a schedule. */
export async function pruneRateLimitHits(olderThan: Date): Promise<number> {
  return asPublic(async (client) => {
    const { rowCount } = await client.query(
      'DELETE FROM rate_limit_hits WHERE window_start < $1',
      [olderThan],
    );
    return rowCount;
  });
}

/**
 * Extracts a best-effort client identifier from proxy headers.
 *
 * Behind a trusted proxy the left-most x-forwarded-for entry is the client.
 * When no header is present the caller is bucketed as 'unknown', which means
 * direct-connection traffic shares one bucket — acceptable, because every
 * supported deployment sits behind a proxy that sets these headers.
 */
export function clientIdentifier(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
