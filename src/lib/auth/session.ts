import 'server-only';

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { asAuth, asStaff } from '@/lib/db/client';
import { publicEnv, serverEnv } from '@/lib/env';
import { verifyPassword } from '@/lib/auth/password';
import type { StaffProfile, StaffRole } from '@/types/domain';

/**
 * Staff sessions.
 *
 * A session token is 32 random bytes. The browser receives
 * `<token>.<hmac>` in an httpOnly cookie; the database stores only
 * SHA-256(token). Two consequences follow:
 *
 *   - A leaked database dump yields no usable cookie.
 *   - A forged cookie fails the HMAC check before any database lookup,
 *     so unauthenticated traffic cannot be used to probe the session table.
 *
 * Rotating SESSION_COOKIE_SECRET invalidates every signed-in session.
 */

export const SESSION_COOKIE_NAME = '__Host-bsp_session';
export const INSECURE_SESSION_COOKIE_NAME = 'bsp_session';

/**
 * Whether the session cookie can carry the `Secure` attribute.
 *
 * This follows the *scheme the site is actually served over*, not NODE_ENV.
 * Browsers reject a `Secure` cookie — and anything using the `__Host-` prefix,
 * which implies it — on a plain HTTP origin. Keying this off NODE_ENV meant a
 * production build served over HTTP (a local smoke test, or a deployment where
 * TLS terminates somewhere unexpected) would set a cookie the browser silently
 * discarded, so sign-in appeared to succeed and then did nothing at all.
 *
 * On HTTPS this still uses the hardened `__Host-` prefix, which pins the cookie
 * to the exact host and forbids a `Domain` attribute.
 */
function usesSecureCookies(): boolean {
  return publicEnv.siteUrl.startsWith('https://');
}

function cookieName(): string {
  return usesSecureCookies() ? SESSION_COOKIE_NAME : INSECURE_SESSION_COOKIE_NAME;
}

function signToken(token: string): string {
  return createHmac('sha256', serverEnv().SESSION_COOKIE_SECRET)
    .update(token)
    .digest('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Returns the raw token only if the cookie value carries a valid signature. */
function verifyCookieValue(value: string): string | null {
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;

  const token = value.slice(0, separator);
  const providedSignature = value.slice(separator + 1);
  const expectedSignature = signToken(token);

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  return token;
}

export interface SignInResult {
  ok: boolean;
  profile?: StaffProfile;
}

/**
 * Verifies credentials and, on success, creates a session and sets the cookie.
 *
 * An unknown email still performs a password verification against a dummy
 * hash so that response timing does not reveal whether an account exists.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const record = await asAuth(async (client) => {
    const { rows } = await client.query<{
      id: string;
      email: string;
      display_name: string;
      role: StaffRole;
      password_hash: string;
    }>(
      `SELECT id, email, display_name, role, password_hash
         FROM profiles
        WHERE lower(email) = $1 AND is_active
        LIMIT 1`,
      [normalizedEmail],
    );
    return rows[0] ?? null;
  });

  // Constant-work path for unknown accounts.
  const hashToCheck =
    record?.password_hash ??
    'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  const passwordMatches = await verifyPassword(password, hashToCheck);
  if (!record || !passwordMatches) {
    return { ok: false };
  }

  const token = randomBytes(32).toString('base64url');
  const ttlHours = serverEnv().SESSION_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await asAuth(async (client) => {
    await client.query(
      `INSERT INTO admin_sessions (profile_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [record.id, hashToken(token), expiresAt],
    );
    await client.query('UPDATE profiles SET last_login_at = now() WHERE id = $1', [
      record.id,
    ]);
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName(), `${token}.${signToken(token)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: usesSecureCookies(),
    path: '/',
    expires: expiresAt,
  });

  return {
    ok: true,
    profile: {
      id: record.id,
      email: record.email,
      displayName: record.display_name,
      role: record.role,
    },
  };
}

/** Resolves the signed-in staff profile, or null. Never throws for a bad cookie. */
export async function getCurrentStaff(): Promise<StaffProfile | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(cookieName())?.value;
  if (!raw) return null;

  const token = verifyCookieValue(raw);
  if (!token) return null;

  try {
    return await asAuth(async (client) => {
      const { rows } = await client.query<{
        id: string;
        email: string;
        display_name: string;
        role: StaffRole;
      }>(
        `SELECT p.id, p.email, p.display_name, p.role
           FROM admin_sessions s
           JOIN profiles p ON p.id = s.profile_id
          WHERE s.token_hash = $1
            AND s.expires_at > now()
            AND p.is_active
          LIMIT 1`,
        [hashToken(token)],
      );

      const row = rows[0];
      if (!row) return null;

      await client.query(
        'UPDATE admin_sessions SET last_seen_at = now() WHERE token_hash = $1',
        [hashToken(token)],
      );

      return {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
      };
    });
  } catch (error) {
    console.error('[auth] session lookup failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
}

/** Deletes the current session server-side and clears the cookie. */
export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(cookieName())?.value;

  if (raw) {
    const token = verifyCookieValue(raw);
    if (token) {
      try {
        await asAuth((client) =>
          client.query('DELETE FROM admin_sessions WHERE token_hash = $1', [
            hashToken(token),
          ]),
        );
      } catch (error) {
        console.error('[auth] session delete failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }

  cookieStore.delete(cookieName());
}

/** Removes expired sessions. Safe to call on a schedule. */
export async function pruneExpiredSessions(): Promise<number> {
  return asStaff(async (client) => {
    const { rowCount } = await client.query(
      'DELETE FROM admin_sessions WHERE expires_at < now()',
    );
    return rowCount;
  });
}
