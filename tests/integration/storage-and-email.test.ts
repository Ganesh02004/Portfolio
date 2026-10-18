import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { asPublic, asStaff } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/mailer';
import { serverEnv } from '@/lib/env';
import { checkRateLimit } from '@/lib/rate-limit';
import { createDownloadToken, verifyDownloadToken } from '@/lib/storage/download-token';
import {
  createPresentationDownloadLink,
  readPresentation,
} from '@/lib/storage/presentation-store';
import { createStartupApplication } from '@/lib/db/submissions';

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3,
]);

function startupInput(content: Uint8Array = PDF_BYTES) {
  return {
    applicantName: 'Asha Kumar',
    email: `asha-${randomUUID()}@example.test`,
    startupName: 'Fieldnote',
    ideaTitle: 'Offline-first field data collection',
    ideaSummary:
      'A mobile tool for surveyors working without connectivity, syncing when a connection returns.',
    pitchVideoUrl: 'https://example.test/pitch',
    presentationContent: content,
    presentationFilename: 'pitch.pdf',
    presentationSizeBytes: content.byteLength,
    presentationMimeType: 'application/pdf',
    consentAt: new Date(),
  };
}

describe('presentation storage', () => {
  it('stores the bytes and reads them back unchanged', async () => {
    const created = await createStartupApplication(startupInput());

    const stored = await readPresentation(created.id);
    expect(stored).not.toBeNull();
    expect(new Uint8Array(stored!.content)).toEqual(PDF_BYTES);
    expect(stored!.filename).toBe('pitch.pdf');
    expect(stored!.mimeType).toBe('application/pdf');
    expect(stored!.sizeBytes).toBe(PDF_BYTES.byteLength);
  });

  it('handles a larger file without truncation', async () => {
    // A realistic size, to prove bytea is not silently clipping anything.
    const large = new Uint8Array(2 * 1024 * 1024);
    large.set(PDF_BYTES, 0);
    for (let i = PDF_BYTES.length; i < large.length; i += 1) large[i] = i % 251;

    const created = await createStartupApplication(startupInput(large));
    const stored = await readPresentation(created.id);

    expect(stored!.content.byteLength).toBe(large.byteLength);
    expect(new Uint8Array(stored!.content)).toEqual(large);
  });

  it('returns null for an application that does not exist', async () => {
    expect(await readPresentation(randomUUID())).toBeNull();
  });

  /**
   * The point of storing bytes in the database: there is no window in which an
   * application exists without its presentation, or the reverse.
   */
  it('never leaves an application without its presentation', async () => {
    const created = await createStartupApplication(startupInput());

    const { rows } = await asStaff((client) =>
      client.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM startup_applications a
           LEFT JOIN startup_presentations p ON p.application_id = a.id
          WHERE p.application_id IS NULL`,
      ),
    );

    expect(created.id).toBeTruthy();
    expect(rows[0]?.count).toBe('0');
  });

  it('removes the presentation when the application is deleted', async () => {
    const created = await createStartupApplication(startupInput());

    // Deleting requires the owner connection; staff cannot delete records.
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
    await client.connect();
    try {
      await client.query('DELETE FROM startup_applications WHERE id = $1', [created.id]);
      const { rows } = await client.query(
        'SELECT 1 FROM startup_presentations WHERE application_id = $1',
        [created.id],
      );
      expect(rows).toHaveLength(0);
    } finally {
      await client.end();
    }
  });

  it('rejects empty content at the database level', async () => {
    await expect(
      asPublic((client) =>
        client.query(
          'INSERT INTO startup_presentations (application_id, content) VALUES ($1, $2)',
          [randomUUID(), Buffer.alloc(0)],
        ),
      ),
    ).rejects.toThrow();
  });
});

describe('presentation access control', () => {
  it('app_public cannot read a stored presentation', async () => {
    await createStartupApplication(startupInput());

    await expect(
      asPublic((client) => client.query('SELECT content FROM startup_presentations')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_staff cannot alter or delete a stored presentation', async () => {
    await expect(
      asStaff((client) => client.query('DELETE FROM startup_presentations')),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asStaff((client) =>
        client.query("UPDATE startup_presentations SET content = 'x'::bytea"),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe('signed download links', () => {
  it('issues a link that names the application only inside the token', async () => {
    const created = await createStartupApplication(startupInput());

    const { url, expiresInSeconds } = createPresentationDownloadLink(
      created.id,
      'pitch.pdf',
    );

    expect(expiresInSeconds).toBeGreaterThanOrEqual(30);
    expect(expiresInSeconds).toBeLessThanOrEqual(3600);
    expect(url).toContain('/api/admin/presentations?token=');
    // The raw id must not be readable from the URL.
    expect(url).not.toContain(created.id);
  });

  it('verifies a token the server issued', () => {
    const secret = serverEnv().SESSION_COOKIE_SECRET;
    const applicationId = randomUUID();
    const token = createDownloadToken(
      {
        key: applicationId,
        filename: 'pitch.pdf',
        expiresAt: Math.floor(Date.now() / 1000) + 300,
      },
      secret,
    );

    const result = verifyDownloadToken(token, secret);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.key).toBe(applicationId);
  });

  // The guarantee that makes the link safe to issue at all.
  it('rejects a token whose payload was swapped for another application', () => {
    const secret = serverEnv().SESSION_COOKIE_SECRET;
    const token = createDownloadToken(
      {
        key: randomUUID(),
        filename: 'pitch.pdf',
        expiresAt: Math.floor(Date.now() / 1000) + 300,
      },
      secret,
    );

    const signature = token.slice(token.lastIndexOf('.') + 1);
    const forgedPayload = Buffer.from(
      JSON.stringify({
        key: randomUUID(),
        filename: 'pitch.pdf',
        expiresAt: Math.floor(Date.now() / 1000) + 300,
      }),
      'utf8',
    ).toString('base64url');

    expect(verifyDownloadToken(`${forgedPayload}.${signature}`, secret)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });
  });

  it('rejects a token signed with a different secret', () => {
    const token = createDownloadToken(
      {
        key: randomUUID(),
        filename: 'pitch.pdf',
        expiresAt: Math.floor(Date.now() / 1000) + 300,
      },
      'a-completely-different-secret-value-here',
    );

    expect(verifyDownloadToken(token, serverEnv().SESSION_COOKIE_SECRET)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });
  });

  it('rejects an expired token', () => {
    const secret = serverEnv().SESSION_COOKIE_SECRET;
    const token = createDownloadToken(
      {
        key: randomUUID(),
        filename: 'pitch.pdf',
        expiresAt: Math.floor(Date.now() / 1000) - 1,
      },
      secret,
    );

    expect(verifyDownloadToken(token, secret)).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('rejects a token that expires exactly now', () => {
    const secret = serverEnv().SESSION_COOKIE_SECRET;
    const now = new Date();
    const token = createDownloadToken(
      {
        key: randomUUID(),
        filename: 'p.pdf',
        expiresAt: Math.floor(now.getTime() / 1000),
      },
      secret,
    );

    expect(verifyDownloadToken(token, secret, now).ok).toBe(false);
  });

  it.each(['', 'no-separator', '.', 'a.', 'not-base64!!.signature'])(
    'rejects malformed token %j',
    (token) => {
      expect(verifyDownloadToken(token, serverEnv().SESSION_COOKIE_SECRET).ok).toBe(
        false,
      );
    },
  );
});

describe('email delivery', () => {
  it('delivers to the test SMTP sink and records the outcome', async () => {
    const result = await sendEmail({
      to: `recipient-${randomUUID()}@example.test`,
      subject: 'Integration test message',
      text: 'Body text',
      html: '<p>Body text</p>',
      template: 'integration_probe',
    });

    expect(result.delivered).toBe(true);

    const { rows } = await asStaff((client) =>
      client.query<{ status: string; recipient_hint: string }>(
        `SELECT status::text AS status, recipient_hint
           FROM email_delivery_logs
          WHERE template = 'integration_probe'
          ORDER BY created_at DESC LIMIT 1`,
      ),
    );

    expect(rows[0]?.status).toBe('SENT');
    // Only a masked address is retained.
    expect(rows[0]?.recipient_hint).toMatch(/\*\*\*/);
    expect(rows[0]?.recipient_hint).not.toContain('recipient-');
  });

  it('records a failure and does not throw when the server is unreachable', async () => {
    const originalHost = process.env.SMTP_HOST;
    const originalPort = process.env.SMTP_PORT;

    // Point at a closed port so the connection is refused quickly.
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '1';

    const { resetServerEnvCache } = await import('@/lib/env');
    const { resetMailer } = await import('@/lib/email/mailer');
    resetServerEnvCache();
    resetMailer();

    try {
      const result = await sendEmail({
        to: 'unreachable@example.test',
        subject: 'Should fail',
        text: 'Body',
        html: '<p>Body</p>',
        template: 'integration_failure_probe',
      });

      // The key behaviour: a delivery failure is reported, not thrown.
      expect(result.delivered).toBe(false);
      expect(result.error).toBeTruthy();
    } finally {
      process.env.SMTP_HOST = originalHost;
      process.env.SMTP_PORT = originalPort;
      resetServerEnvCache();
      resetMailer();
    }

    const { rows } = await asStaff((client) =>
      client.query<{ status: string; error_message: string | null }>(
        `SELECT status::text AS status, error_message
           FROM email_delivery_logs
          WHERE template = 'integration_failure_probe'
          ORDER BY created_at DESC LIMIT 1`,
      ),
    );

    expect(rows[0]?.status).toBe('FAILED');
    expect(rows[0]?.error_message).toBeTruthy();
  }, 30_000);
});

describe('rate limiting', () => {
  it('allows requests up to the limit and blocks beyond it', async () => {
    const identifier = `ip-${randomUUID()}`;
    const options = {
      scope: 'integration-probe',
      identifier,
      limit: 3,
      windowSeconds: 3600,
    };

    const outcomes = [];
    for (let i = 0; i < 5; i += 1) {
      outcomes.push(await checkRateLimit(options));
    }

    expect(outcomes.slice(0, 3).every((o) => o.allowed)).toBe(true);
    expect(outcomes.slice(3).every((o) => !o.allowed)).toBe(true);
    expect(outcomes[2]?.remaining).toBe(0);
    expect(outcomes[4]?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps separate counters per caller', async () => {
    const options = { scope: 'integration-isolation', limit: 1, windowSeconds: 3600 };

    const first = await checkRateLimit({ ...options, identifier: `a-${randomUUID()}` });
    const second = await checkRateLimit({ ...options, identifier: `b-${randomUUID()}` });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it('keeps separate counters per scope', async () => {
    const identifier = `shared-${randomUUID()}`;

    const one = await checkRateLimit({
      scope: 'scope-one',
      identifier,
      limit: 1,
      windowSeconds: 3600,
    });
    const two = await checkRateLimit({
      scope: 'scope-two',
      identifier,
      limit: 1,
      windowSeconds: 3600,
    });

    expect(one.allowed).toBe(true);
    expect(two.allowed).toBe(true);
  });

  it('stores only a hash, never the raw identifier', async () => {
    const identifier = `203.0.113.${Math.floor(Math.random() * 255)}`;
    await checkRateLimit({
      scope: 'integration-hash',
      identifier,
      limit: 5,
      windowSeconds: 3600,
    });

    // rate_limit_hits is readable by the role that writes it, not by staff.
    const { rows } = await asPublic((client) =>
      client.query<{ bucket_key: string }>(
        "SELECT bucket_key FROM rate_limit_hits WHERE bucket_key LIKE 'integration-hash:%'",
      ),
    );

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.bucket_key).not.toContain(identifier);
    }
  });
});
