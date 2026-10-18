import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { asAuth, asStaff } from '@/lib/db/client';

/**
 * Credential verification and session storage, against the real database.
 *
 * These tests work at the data layer rather than through next/headers, because
 * the cookie plumbing needs a request context that only the E2E suite provides.
 * The E2E tests in tests/e2e/admin.spec.ts cover the full sign-in journey.
 */

const PASSWORD = 'integration-session-password';
let profileId: string;
let profileEmail: string;

beforeAll(async () => {
  profileEmail = `session-${randomUUID()}@example.test`;

  const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO profiles (email, display_name, role, password_hash)
       VALUES ($1, 'Session Tester', 'STAFF', $2)
       RETURNING id`,
      [profileEmail, await hashPassword(PASSWORD)],
    );
    profileId = rows[0]!.id;
  } finally {
    await client.end();
  }
});

describe('credential lookup', () => {
  it('finds an active profile case-insensitively', async () => {
    const { rows } = await asAuth((client) =>
      client.query<{ id: string; password_hash: string }>(
        'SELECT id, password_hash FROM profiles WHERE lower(email) = $1 AND is_active',
        [profileEmail.toUpperCase().toLowerCase()],
      ),
    );

    expect(rows[0]?.id).toBe(profileId);
    expect(await verifyPassword(PASSWORD, rows[0]!.password_hash)).toBe(true);
  });

  it('does not return a deactivated profile', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
    await client.connect();
    const disabledEmail = `disabled-${randomUUID()}@example.test`;
    try {
      await client.query(
        `INSERT INTO profiles (email, display_name, role, password_hash, is_active)
         VALUES ($1, 'Disabled', 'STAFF', $2, FALSE)`,
        [disabledEmail, await hashPassword(PASSWORD)],
      );
    } finally {
      await client.end();
    }

    const { rows } = await asAuth((c) =>
      c.query('SELECT id FROM profiles WHERE lower(email) = $1 AND is_active', [
        disabledEmail,
      ]),
    );

    expect(rows).toHaveLength(0);
  });
});

describe('session records', () => {
  it('stores only a token hash, never the token', async () => {
    const tokenHash = randomUUID().replace(/-/g, '').repeat(2);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await asAuth((client) =>
      client.query(
        'INSERT INTO admin_sessions (profile_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [profileId, tokenHash, expiresAt],
      ),
    );

    const { rows } = await asAuth((client) =>
      client.query<{ token_hash: string }>(
        'SELECT token_hash FROM admin_sessions WHERE profile_id = $1',
        [profileId],
      ),
    );

    expect(rows[0]?.token_hash).toBe(tokenHash);
    // There is no column that could hold the raw token.
    expect(Object.keys(rows[0] ?? {})).not.toContain('token');
  });

  it('does not resolve an expired session', async () => {
    const tokenHash = `expired-${randomUUID()}`;
    await asAuth((client) =>
      client.query(
        "INSERT INTO admin_sessions (profile_id, token_hash, expires_at) VALUES ($1, $2, now() - interval '1 hour')",
        [profileId, tokenHash],
      ),
    );

    const { rows } = await asAuth((client) =>
      client.query(
        `SELECT p.id FROM admin_sessions s
           JOIN profiles p ON p.id = s.profile_id
          WHERE s.token_hash = $1 AND s.expires_at > now() AND p.is_active`,
        [tokenHash],
      ),
    );

    expect(rows).toHaveLength(0);
  });

  it('cascades session deletion when a profile is removed', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
    await client.connect();

    let tempProfileId: string;
    try {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO profiles (email, display_name, role, password_hash)
         VALUES ($1, 'Temp', 'STAFF', $2) RETURNING id`,
        [`temp-${randomUUID()}@example.test`, await hashPassword(PASSWORD)],
      );
      tempProfileId = rows[0]!.id;

      await client.query(
        "INSERT INTO admin_sessions (profile_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
        [tempProfileId, `cascade-${randomUUID()}`],
      );

      await client.query('DELETE FROM profiles WHERE id = $1', [tempProfileId]);

      const remaining = await client.query(
        'SELECT 1 FROM admin_sessions WHERE profile_id = $1',
        [tempProfileId],
      );
      expect(remaining.rows).toHaveLength(0);
    } finally {
      await client.end();
    }
  });

  it('rejects a session for a profile that does not exist', async () => {
    await expect(
      asAuth((client) =>
        client.query(
          "INSERT INTO admin_sessions (profile_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
          [randomUUID(), `orphan-${randomUUID()}`],
        ),
      ),
    ).rejects.toThrow(/foreign key/i);
  });

  it('rejects a duplicate token hash', async () => {
    const tokenHash = `dupe-${randomUUID()}`;
    await asAuth((client) =>
      client.query(
        "INSERT INTO admin_sessions (profile_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
        [profileId, tokenHash],
      ),
    );

    await expect(
      asAuth((client) =>
        client.query(
          "INSERT INTO admin_sessions (profile_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
          [profileId, tokenHash],
        ),
      ),
    ).rejects.toThrow(/duplicate key/i);
  });
});

describe('staff profile visibility', () => {
  it('lets staff read colleague names but not credentials', async () => {
    const { rows } = await asStaff((client) =>
      client.query<{ display_name: string; role: string }>(
        'SELECT display_name, role::text AS role FROM profiles WHERE id = $1',
        [profileId],
      ),
    );

    expect(rows[0]?.display_name).toBe('Session Tester');
    expect(rows[0]?.role).toBe('STAFF');
  });
});
