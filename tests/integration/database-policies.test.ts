import { describe, expect, it } from 'vitest';
import { asAuth, asPublic, asStaff, withRole } from '@/lib/db/client';
import { createServiceSubmission } from '@/lib/db/submissions';

/**
 * These tests verify the database security boundary itself, against a real
 * Postgres instance. They are the reason integration tests exist in this
 * project: a mocked client would happily confirm whatever the code believes,
 * while these confirm what the database will actually permit.
 *
 * The property under test: a public visitor can create a submission and can
 * read nothing else, even if an application bug issued the query.
 */

describe('role separation', () => {
  it('the login role holds no privileges of its own', async () => {
    // Deliberately bypasses withRole by issuing a query with no SET ROLE.
    // The pool's login role must not be able to read anything.
    await expect(
      withRole('app_public', async (client) => {
        await client.query('RESET ROLE');
        return client.query('SELECT count(*) FROM service_submissions');
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_public cannot read submissions it did not just create', async () => {
    await createServiceSubmission({
      submissionType: 'CONTACT',
      fullName: 'Policy Probe',
      email: 'probe@example.test',
      consentAt: new Date(),
    });

    await expect(
      asPublic((client) =>
        client.query('SELECT full_name, email, message FROM service_submissions'),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_public cannot read startup applications', async () => {
    await expect(
      asPublic((client) =>
        client.query('SELECT idea_summary, pitch_video_url FROM startup_applications'),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_public cannot read internal notes', async () => {
    await expect(
      asPublic((client) =>
        client.query('SELECT internal_notes FROM service_submissions'),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_public cannot read staff accounts or password hashes', async () => {
    await expect(
      asPublic((client) => client.query('SELECT email, password_hash FROM profiles')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_public cannot read sessions', async () => {
    await expect(
      asPublic((client) => client.query('SELECT token_hash FROM admin_sessions')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_public cannot update or delete a submission', async () => {
    await expect(
      asPublic((client) =>
        client.query("UPDATE service_submissions SET status = 'CLOSED'"),
      ),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asPublic((client) => client.query('DELETE FROM service_submissions')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_public cannot escalate a staff role', async () => {
    await expect(
      asPublic((client) => client.query("UPDATE profiles SET role = 'ADMIN'")),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_staff cannot change a role, so a compromised session cannot escalate', async () => {
    await expect(
      asStaff((client) => client.query("UPDATE profiles SET role = 'ADMIN'")),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_staff cannot read password hashes', async () => {
    await expect(
      asStaff((client) => client.query('SELECT password_hash FROM profiles')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_staff cannot delete submissions', async () => {
    await expect(
      asStaff((client) => client.query('DELETE FROM service_submissions')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('app_auth cannot read submissions', async () => {
    await expect(
      asAuth((client) => client.query('SELECT * FROM service_submissions')),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe('row level security on inserts', () => {
  it('rejects a public insert that pre-sets a staff-only status', async () => {
    await expect(
      asPublic((client) =>
        client.query(
          `INSERT INTO service_submissions
             (reference_code, submission_type, status, full_name, email, consent_at)
           VALUES ('GEN-2610-AAAAAA', 'CONTACT', 'CLOSED', 'Bypass', 'b@example.test', now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('rejects a public insert that pre-sets internal notes', async () => {
    await expect(
      asPublic((client) =>
        client.query(
          `INSERT INTO service_submissions
             (reference_code, submission_type, full_name, email, consent_at, internal_notes)
           VALUES ('GEN-2610-BBBBBB', 'CONTACT', 'Bypass', 'b@example.test', now(), 'injected')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('rejects a public startup insert that pre-sets a reviewer', async () => {
    await expect(
      asPublic((client) =>
        client.query(
          `INSERT INTO startup_applications
             (reference_code, applicant_name, email, startup_name, idea_title,
              idea_summary, pitch_video_url, presentation_filename,
              presentation_size_bytes, presentation_mime_type, consent_at, reviewed_at)
           VALUES ('STU-2610-CCCCCC', 'Bypass', 'b@example.test', 'S', 'T',
                   'Summary text that is long enough to pass the check constraint.',
                   'https://example.test/v', 'f.pdf', 100, 'application/pdf',
                   now(), now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('allows a correctly shaped public insert', async () => {
    const result = await createServiceSubmission({
      submissionType: 'MARKETING',
      fullName: 'Valid Caller',
      email: 'valid@example.test',
      consentAt: new Date(),
    });

    expect(result.referenceCode).toMatch(/^MKT-\d{4}-[A-Z2-9]{6}$/);
  });
});

describe('database constraints', () => {
  it('rejects a submission with no consent timestamp', async () => {
    await expect(
      asPublic((client) =>
        client.query(
          `INSERT INTO service_submissions
             (reference_code, submission_type, full_name, email, consent_at)
           VALUES ('GEN-2610-DDDDDD', 'CONTACT', 'No Consent', 'n@example.test', NULL)`,
        ),
      ),
    ).rejects.toThrow(/null value|not-null/i);
  });

  it('rejects an address with no @ even if validation were bypassed', async () => {
    await expect(
      asPublic((client) =>
        client.query(
          `INSERT INTO service_submissions
             (reference_code, submission_type, full_name, email, consent_at)
           VALUES ('GEN-2610-EEEEEE', 'CONTACT', 'Bad Email', 'not-an-email', now())`,
        ),
      ),
    ).rejects.toThrow(/check constraint/i);
  });

  it('rejects a duplicate reference code', async () => {
    await asPublic((client) =>
      client.query(
        `INSERT INTO service_submissions
           (reference_code, submission_type, full_name, email, consent_at)
         VALUES ('GEN-2610-FFFFFF', 'CONTACT', 'First', 'first@example.test', now())`,
      ),
    );

    await expect(
      asPublic((client) =>
        client.query(
          `INSERT INTO service_submissions
             (reference_code, submission_type, full_name, email, consent_at)
           VALUES ('GEN-2610-FFFFFF', 'CONTACT', 'Second', 'second@example.test', now())`,
        ),
      ),
    ).rejects.toThrow(/duplicate key/i);
  });

  it('rejects an unknown submission type at the type level', async () => {
    await expect(
      asPublic((client) =>
        client.query(
          `INSERT INTO service_submissions
             (reference_code, submission_type, full_name, email, consent_at)
           VALUES ('GEN-2610-GGGGGG', 'PAYMENT', 'Bad Type', 'b@example.test', now())`,
        ),
      ),
    ).rejects.toThrow(/invalid input value for enum/i);
  });
});

describe('transaction behaviour', () => {
  it('rolls back every statement when the callback throws', async () => {
    const probeEmail = `rollback-${Date.now()}@example.test`;

    await expect(
      asPublic(async (client) => {
        await client.query(
          `INSERT INTO service_submissions
             (reference_code, submission_type, full_name, email, consent_at)
           VALUES ('GEN-2610-HHHHHH', 'CONTACT', 'Rollback', $1, now())`,
          [probeEmail],
        );
        throw new Error('deliberate failure after insert');
      }),
    ).rejects.toThrow('deliberate failure after insert');

    const { rows } = await asStaff((client) =>
      client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM service_submissions WHERE email = $1',
        [probeEmail],
      ),
    );

    expect(rows[0]?.count).toBe('0');
  });
});
