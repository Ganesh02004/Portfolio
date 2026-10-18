import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { asStaff } from '@/lib/db/client';
import {
  createServiceSubmission,
  createStartupApplication,
  getDashboardCounts,
  getServiceSubmission,
  getStartupApplication,
  listServiceSubmissions,
  listStartupApplications,
  listSubmissionEvents,
  updateServiceSubmission,
  updateStartupApplication,
} from '@/lib/db/submissions';
import { hashPassword } from '@/lib/auth/password';

/**
 * Persistence and triage behaviour against a real database.
 *
 * A staff profile is created directly with the owner connection, because
 * provisioning staff is an administrative action outside the web surface.
 */

let staffId: string;

beforeAll(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
  await client.connect();
  try {
    const passwordHash = await hashPassword('integration-test-password');
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO profiles (email, display_name, role, password_hash)
       VALUES ($1, 'Integration Tester', 'ADMIN', $2)
       ON CONFLICT (lower(email)) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      [`tester-${randomUUID()}@example.test`, passwordHash],
    );
    staffId = rows[0]!.id;
  } finally {
    await client.end();
  }
});

function startupInput() {
  return {
    applicantName: 'Asha Kumar',
    email: `asha-${randomUUID()}@example.test`,
    startupName: 'Fieldnote',
    ideaTitle: 'Offline-first field data collection',
    ideaSummary:
      'A mobile tool for surveyors working without connectivity, syncing when a connection returns.',
    pitchVideoUrl: 'https://example.test/pitch',
    presentationContent: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    presentationFilename: 'pitch.pdf',
    presentationSizeBytes: 5,
    presentationMimeType: 'application/pdf',
    consentAt: new Date(),
  };
}

describe('createServiceSubmission', () => {
  it('persists every supplied field', async () => {
    const email = `persist-${randomUUID()}@example.test`;
    const consentAt = new Date();

    const created = await createServiceSubmission({
      submissionType: 'DIGITALIZATION',
      fullName: 'Asha Kumar',
      email,
      phone: '+91 98765 43210',
      businessName: 'Kumar Traders',
      selectedOption: 'ECOMMERCE_LISTING',
      message: 'We sell handmade textiles and want to list online.',
      sourcePage: '/services/digitalization',
      consentAt,
    });

    const stored = await getServiceSubmission(created.id);
    expect(stored).not.toBeNull();
    expect(stored).toMatchObject({
      referenceCode: created.referenceCode,
      submissionType: 'DIGITALIZATION',
      status: 'RECEIVED',
      fullName: 'Asha Kumar',
      email,
      phone: '+91 98765 43210',
      businessName: 'Kumar Traders',
      selectedOption: 'ECOMMERCE_LISTING',
      sourcePage: '/services/digitalization',
    });
    expect(stored?.internalNotes).toBeNull();
    expect(stored?.assignedTo).toBeNull();
  });

  it('starts every submission in RECEIVED', async () => {
    const created = await createServiceSubmission({
      submissionType: 'CONTACT',
      fullName: 'Status Check',
      email: `status-${randomUUID()}@example.test`,
      consentAt: new Date(),
    });

    expect((await getServiceSubmission(created.id))?.status).toBe('RECEIVED');
  });

  it('allocates a distinct reference code per submission', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        createServiceSubmission({
          submissionType: 'TRAINING',
          fullName: 'Concurrent Caller',
          email: `concurrent-${randomUUID()}@example.test`,
          consentAt: new Date(),
        }),
      ),
    );

    expect(new Set(results.map((r) => r.referenceCode)).size).toBe(10);
  });

  it('uses the documented prefix per service', async () => {
    const cases = [
      ['TRAINING', 'TRN'],
      ['MARKETING', 'MKT'],
      ['DIGITALIZATION', 'DIG'],
      ['CONTACT', 'GEN'],
    ] as const;

    for (const [type, prefix] of cases) {
      const created = await createServiceSubmission({
        submissionType: type,
        fullName: 'Prefix Check',
        email: `prefix-${randomUUID()}@example.test`,
        consentAt: new Date(),
      });
      expect(created.referenceCode.startsWith(`${prefix}-`)).toBe(true);
    }
  });
});

describe('createStartupApplication', () => {
  it('stores the presentation metadata alongside the application', async () => {
    const created = await createStartupApplication(startupInput());

    const stored = await getStartupApplication(created.id);
    expect(stored?.presentationFilename).toBe('pitch.pdf');
    expect(stored?.presentationMimeType).toBe('application/pdf');
    expect(stored?.presentationSizeBytes).toBe(5);
  });

  it('starts in RECEIVED with no reviewer', async () => {
    const created = await createStartupApplication(startupInput());
    const stored = await getStartupApplication(created.id);

    expect(stored?.status).toBe('RECEIVED');
    expect(stored?.reviewedBy).toBeNull();
    expect(stored?.reviewedAt).toBeNull();
    expect(stored?.internalNotes).toBeNull();
  });

  it('allows two applications to upload byte-identical presentations', async () => {
    // Nothing about the content is unique, so an identical file from a
    // different applicant must not collide.
    const first = await createStartupApplication(startupInput());
    const second = await createStartupApplication(startupInput());

    expect(first.id).not.toBe(second.id);
    expect(first.referenceCode).not.toBe(second.referenceCode);
  });
});

describe('listing and filtering', () => {
  it('filters by submission type', async () => {
    const email = `filter-type-${randomUUID()}@example.test`;
    await createServiceSubmission({
      submissionType: 'MARKETING',
      fullName: 'Filter Target',
      email,
      consentAt: new Date(),
    });

    const result = await listServiceSubmissions({ type: 'MARKETING' });
    expect(result.items.every((item) => item.submissionType === 'MARKETING')).toBe(true);
    expect(result.items.some((item) => item.email === email)).toBe(true);
  });

  it('filters by status', async () => {
    const result = await listServiceSubmissions({ status: 'CLOSED' });
    expect(result.items.every((item) => item.status === 'CLOSED')).toBe(true);
  });

  it('searches by email, name and reference code', async () => {
    const unique = randomUUID().slice(0, 8);
    const created = await createServiceSubmission({
      submissionType: 'CONTACT',
      fullName: `Searchable ${unique}`,
      email: `search-${unique}@example.test`,
      consentAt: new Date(),
    });

    const byName = await listServiceSubmissions({ search: unique });
    expect(byName.items.some((item) => item.id === created.id)).toBe(true);

    const byEmail = await listServiceSubmissions({ search: `search-${unique}` });
    expect(byEmail.items.some((item) => item.id === created.id)).toBe(true);

    const byRef = await listServiceSubmissions({ search: created.referenceCode });
    expect(byRef.items.some((item) => item.id === created.id)).toBe(true);
  });

  it('treats a search term containing SQL metacharacters as literal text', async () => {
    const result = await listServiceSubmissions({ search: "'; DROP TABLE profiles; --" });
    expect(result.items).toHaveLength(0);

    // The table is still there.
    const { rows } = await asStaff((client) =>
      client.query<{ count: string }>('SELECT count(*)::text AS count FROM profiles'),
    );
    expect(Number(rows[0]?.count ?? 0)).toBeGreaterThan(0);
  });

  it('paginates and reports totals', async () => {
    const page = await listServiceSubmissions({ page: 1, pageSize: 5 });
    expect(page.items.length).toBeLessThanOrEqual(5);
    expect(page.pageSize).toBe(5);
    expect(page.totalPages).toBe(Math.max(1, Math.ceil(page.total / 5)));
  });

  it('clamps an absurd page size rather than trusting the caller', async () => {
    const result = await listServiceSubmissions({ pageSize: 100_000 });
    expect(result.pageSize).toBe(100);
  });

  it('returns results newest first', async () => {
    const result = await listServiceSubmissions({ pageSize: 20 });
    const timestamps = result.items.map((item) => new Date(item.createdAt).getTime());
    const sorted = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sorted);
  });

  it('returns null for an id that does not exist', async () => {
    expect(await getServiceSubmission(randomUUID())).toBeNull();
    expect(await getStartupApplication(randomUUID())).toBeNull();
  });
});

describe('triage', () => {
  it('updates status and records an audit event', async () => {
    const created = await createServiceSubmission({
      submissionType: 'TRAINING',
      fullName: 'Triage Target',
      email: `triage-${randomUUID()}@example.test`,
      consentAt: new Date(),
    });

    const updated = await updateServiceSubmission({
      id: created.id,
      actorProfileId: staffId,
      status: 'UNDER_REVIEW',
    });

    expect(updated?.status).toBe('UNDER_REVIEW');

    const events = await listSubmissionEvents('service_submissions', created.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'STATUS_CHANGED',
      fromStatus: 'RECEIVED',
      toStatus: 'UNDER_REVIEW',
      actorName: 'Integration Tester',
    });
  });

  it('records a separate event when notes change', async () => {
    const created = await createServiceSubmission({
      submissionType: 'CONTACT',
      fullName: 'Notes Target',
      email: `notes-${randomUUID()}@example.test`,
      consentAt: new Date(),
    });

    await updateServiceSubmission({
      id: created.id,
      actorProfileId: staffId,
      internalNotes: 'Called the applicant; awaiting documents.',
    });

    const stored = await getServiceSubmission(created.id);
    expect(stored?.internalNotes).toBe('Called the applicant; awaiting documents.');

    const events = await listSubmissionEvents('service_submissions', created.id);
    expect(events.map((e) => e.eventType)).toContain('NOTES_UPDATED');
  });

  it('does not record an event when the status is unchanged', async () => {
    const created = await createServiceSubmission({
      submissionType: 'CONTACT',
      fullName: 'No Change',
      email: `nochange-${randomUUID()}@example.test`,
      consentAt: new Date(),
    });

    await updateServiceSubmission({
      id: created.id,
      actorProfileId: staffId,
      status: 'RECEIVED',
    });

    expect(await listSubmissionEvents('service_submissions', created.id)).toHaveLength(0);
  });

  it('clears notes when an empty value is saved', async () => {
    const created = await createServiceSubmission({
      submissionType: 'CONTACT',
      fullName: 'Clear Notes',
      email: `clear-${randomUUID()}@example.test`,
      consentAt: new Date(),
    });

    await updateServiceSubmission({
      id: created.id,
      actorProfileId: staffId,
      internalNotes: 'temporary',
    });
    await updateServiceSubmission({
      id: created.id,
      actorProfileId: staffId,
      internalNotes: null,
    });

    expect((await getServiceSubmission(created.id))?.internalNotes).toBeNull();
  });

  it('returns null for an unknown record rather than creating one', async () => {
    const result = await updateServiceSubmission({
      id: randomUUID(),
      actorProfileId: staffId,
      status: 'CLOSED',
    });
    expect(result).toBeNull();
  });

  it('stamps the reviewer when a startup status changes', async () => {
    const created = await createStartupApplication(startupInput());

    const updated = await updateStartupApplication({
      id: created.id,
      actorProfileId: staffId,
      status: 'SHORTLISTED',
    });

    expect(updated?.status).toBe('SHORTLISTED');
    expect(updated?.reviewedBy).toBe(staffId);
    expect(updated?.reviewedAt).not.toBeNull();
  });

  it('orders history newest first', async () => {
    const created = await createServiceSubmission({
      submissionType: 'CONTACT',
      fullName: 'History Order',
      email: `history-${randomUUID()}@example.test`,
      consentAt: new Date(),
    });

    await updateServiceSubmission({
      id: created.id,
      actorProfileId: staffId,
      status: 'UNDER_REVIEW',
    });
    await updateServiceSubmission({
      id: created.id,
      actorProfileId: staffId,
      status: 'CONTACTED',
    });

    const events = await listSubmissionEvents('service_submissions', created.id);
    expect(events[0]?.toStatus).toBe('CONTACTED');
    expect(events[1]?.toStatus).toBe('UNDER_REVIEW');
  });
});

describe('dashboard counts', () => {
  it('reports totals consistent with the listings', async () => {
    const counts = await getDashboardCounts();
    const submissions = await listServiceSubmissions({ pageSize: 5 });
    const startups = await listStartupApplications({ pageSize: 5 });

    expect(counts.totalSubmissions).toBe(submissions.total);
    expect(counts.totalStartups).toBe(startups.total);

    const statusSum = Object.values(counts.submissionsByStatus).reduce(
      (a, b) => a + b,
      0,
    );
    expect(statusSum).toBe(counts.totalSubmissions);
  });
});
