import 'server-only';

import { randomUUID } from 'node:crypto';
import { asPublic, asStaff, type TaskClient } from '@/lib/db/client';
import { insertPresentation } from '@/lib/storage/presentation-store';
import { generateReferenceCode, type ReferencePrefix } from '@/lib/reference-code';
import type {
  ServiceSubmission,
  StartupApplication,
  SubmissionEvent,
  SubmissionStatus,
  SubmissionType,
  StartupStatus,
} from '@/types/domain';

/**
 * Submission persistence.
 *
 * Public writes run as `app_public`, which can insert but cannot read back any
 * row beyond the id and reference code it just created. Staff reads run as
 * `app_staff`. Nothing here accepts a raw SQL fragment from a caller; filters
 * are built from closed unions and bound as parameters.
 */

const PREFIX_BY_TYPE: Record<SubmissionType, ReferencePrefix> = {
  TRAINING: 'TRN',
  MARKETING: 'MKT',
  DIGITALIZATION: 'DIG',
  CONTACT: 'GEN',
};

/**
 * True for a unique-constraint violation, optionally narrowed to one
 * constraint. Postgres reports these as SQLSTATE 23505.
 */
function isUniqueViolation(error: unknown, constraintContains?: string): boolean {
  if (!(error instanceof Error) || !('code' in error) || error.code !== '23505') {
    return false;
  }
  if (!constraintContains) return true;
  const constraint = 'constraint' in error ? String(error.constraint) : '';
  return constraint.includes(constraintContains);
}

export interface CreateServiceSubmissionInput {
  submissionType: SubmissionType;
  fullName: string;
  email: string;
  phone?: string | undefined;
  businessName?: string | undefined;
  selectedOption?: string | undefined;
  message?: string | undefined;
  sourcePage?: string | undefined;
  consentAt: Date;
}

export interface CreatedRecord {
  id: string;
  referenceCode: string;
}

/**
 * Inserts a service submission.
 *
 * The id and reference code are generated here rather than read back with
 * `INSERT ... RETURNING`. Under row level security a RETURNING clause is
 * evaluated against a SELECT policy, so using one would mean granting
 * app_public the ability to read submission rows back — exactly what the
 * design forbids. Generating both values up front keeps the public role
 * insert-only.
 *
 * A reference-code collision is vanishingly unlikely (32^6 per prefix per
 * month) but would surface as a unique-constraint violation, so the insert is
 * retried with a fresh code rather than failing a genuine inquiry.
 */
export async function createServiceSubmission(
  input: CreateServiceSubmissionInput,
): Promise<CreatedRecord> {
  const prefix = PREFIX_BY_TYPE[input.submissionType];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = randomUUID();
    const referenceCode = generateReferenceCode(prefix);

    try {
      await asPublic(async (client) => {
        await client.query(
          `INSERT INTO service_submissions
             (id, reference_code, submission_type, full_name, email, phone,
              business_name, selected_option, message, source_page, consent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id,
            referenceCode,
            input.submissionType,
            input.fullName,
            input.email,
            input.phone ?? null,
            input.businessName ?? null,
            input.selectedOption ?? null,
            input.message ?? null,
            input.sourcePage ?? null,
            input.consentAt,
          ],
        );
      });

      return { id, referenceCode };
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 2) throw error;
    }
  }

  throw new Error('Could not allocate a unique reference code');
}

export interface CreateStartupApplicationInput {
  applicantName: string;
  email: string;
  phone?: string | undefined;
  startupName: string;
  ideaTitle: string;
  ideaSummary: string;
  problemStatement?: string | undefined;
  targetCustomer?: string | undefined;
  referralSource?: string | undefined;
  pitchVideoUrl: string;
  /** Raw file bytes, written in the same transaction as the application. */
  presentationContent: Uint8Array;
  presentationFilename: string;
  presentationSizeBytes: number;
  presentationMimeType: string;
  consentAt: Date;
}

export async function createStartupApplication(
  input: CreateStartupApplicationInput,
): Promise<CreatedRecord> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = randomUUID();
    const referenceCode = generateReferenceCode('STU');

    try {
      await asPublic(async (client) => {
        await client.query(
          `INSERT INTO startup_applications
             (id, reference_code, applicant_name, email, phone, startup_name,
              idea_title, idea_summary, problem_statement, target_customer,
              referral_source, pitch_video_url, presentation_filename,
              presentation_size_bytes, presentation_mime_type, consent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            id,
            referenceCode,
            input.applicantName,
            input.email,
            input.phone ?? null,
            input.startupName,
            input.ideaTitle,
            input.ideaSummary,
            input.problemStatement ?? null,
            input.targetCustomer ?? null,
            input.referralSource ?? null,
            input.pitchVideoUrl,
            input.presentationFilename,
            input.presentationSizeBytes,
            input.presentationMimeType,
            input.consentAt,
          ],
        );

        // Same transaction as the row above: a presentation can never exist
        // without its application, and an application can never reference a
        // presentation that was not written.
        await insertPresentation(client, id, input.presentationContent);
      });

      return { id, referenceCode };
    } catch (error) {
      if (!isUniqueViolation(error, 'reference_code') || attempt === 2) throw error;
    }
  }

  throw new Error('Could not allocate a unique reference code');
}

// ---------------------------------------------------------------------------
// Staff reads
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

function toServiceSubmission(row: Row): ServiceSubmission {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    submissionType: row.submission_type,
    status: row.status,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    businessName: row.business_name,
    selectedOption: row.selected_option,
    message: row.message,
    sourcePage: row.source_page,
    consentAt: row.consent_at,
    assignedTo: row.assigned_to,
    internalNotes: row.internal_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStartupApplication(row: Row): StartupApplication {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    status: row.status,
    applicantName: row.applicant_name,
    email: row.email,
    phone: row.phone,
    startupName: row.startup_name,
    ideaTitle: row.idea_title,
    ideaSummary: row.idea_summary,
    problemStatement: row.problem_statement,
    targetCustomer: row.target_customer,
    referralSource: row.referral_source,
    pitchVideoUrl: row.pitch_video_url,
    presentationFilename: row.presentation_filename,
    presentationSizeBytes: Number(row.presentation_size_bytes),
    presentationMimeType: row.presentation_mime_type,
    consentAt: row.consent_at,
    internalNotes: row.internal_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SubmissionFilters {
  type?: SubmissionType;
  status?: SubmissionStatus;
  /** Matches name, email or reference code. */
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listServiceSubmissions(
  filters: SubmissionFilters = {},
): Promise<PagedResult<ServiceSubmission>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  return asStaff(async (client) => {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.type) {
      values.push(filters.type);
      conditions.push(`submission_type = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search.trim().toLowerCase()}%`);
      const placeholder = `$${values.length}`;
      conditions.push(
        `(lower(full_name) LIKE ${placeholder} OR lower(email) LIKE ${placeholder} OR lower(reference_code) LIKE ${placeholder})`,
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM service_submissions ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const listResult = await client.query<Row>(
      `SELECT * FROM service_submissions ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );

    return {
      items: listResult.rows.map(toServiceSubmission),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  });
}

export async function getServiceSubmission(
  id: string,
): Promise<ServiceSubmission | null> {
  return asStaff(async (client) => {
    const { rows } = await client.query<Row>(
      'SELECT * FROM service_submissions WHERE id = $1 LIMIT 1',
      [id],
    );
    const row = rows[0];
    return row ? toServiceSubmission(row) : null;
  });
}

export interface StartupFilters {
  status?: StartupStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listStartupApplications(
  filters: StartupFilters = {},
): Promise<PagedResult<StartupApplication>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  return asStaff(async (client) => {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search.trim().toLowerCase()}%`);
      const placeholder = `$${values.length}`;
      conditions.push(
        `(lower(applicant_name) LIKE ${placeholder} OR lower(email) LIKE ${placeholder} OR lower(startup_name) LIKE ${placeholder} OR lower(reference_code) LIKE ${placeholder})`,
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM startup_applications ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const listResult = await client.query<Row>(
      `SELECT * FROM startup_applications ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );

    return {
      items: listResult.rows.map(toStartupApplication),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  });
}

export async function getStartupApplication(
  id: string,
): Promise<StartupApplication | null> {
  return asStaff(async (client) => {
    const { rows } = await client.query<Row>(
      'SELECT * FROM startup_applications WHERE id = $1 LIMIT 1',
      [id],
    );
    const row = rows[0];
    return row ? toStartupApplication(row) : null;
  });
}

// ---------------------------------------------------------------------------
// Staff writes
// ---------------------------------------------------------------------------

async function recordEvent(
  client: TaskClient,
  event: {
    subjectTable: 'service_submissions' | 'startup_applications';
    subjectId: string;
    actorProfileId: string;
    eventType: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    detail?: string | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO submission_events
       (subject_table, subject_id, actor_profile_id, event_type, from_status, to_status, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      event.subjectTable,
      event.subjectId,
      event.actorProfileId,
      event.eventType,
      event.fromStatus ?? null,
      event.toStatus ?? null,
      event.detail ?? null,
    ],
  );
}

/**
 * Updates status and/or internal notes and writes the audit trail in the same
 * transaction, so the history can never disagree with the record.
 */
export async function updateServiceSubmission(input: {
  id: string;
  actorProfileId: string;
  status?: SubmissionStatus;
  internalNotes?: string | null;
}): Promise<ServiceSubmission | null> {
  return asStaff(async (client) => {
    const existing = await client.query<Row>(
      'SELECT status, internal_notes FROM service_submissions WHERE id = $1 FOR UPDATE',
      [input.id],
    );
    const current = existing.rows[0];
    if (!current) return null;

    const assignments: string[] = [];
    const values: unknown[] = [];

    if (input.status && input.status !== current.status) {
      values.push(input.status);
      assignments.push(`status = $${values.length}`);
    }
    if (input.internalNotes !== undefined) {
      values.push(input.internalNotes);
      assignments.push(`internal_notes = $${values.length}`);
    }

    if (assignments.length > 0) {
      values.push(input.id);
      await client.query(
        `UPDATE service_submissions SET ${assignments.join(', ')} WHERE id = $${values.length}`,
        values,
      );
    }

    if (input.status && input.status !== current.status) {
      await recordEvent(client, {
        subjectTable: 'service_submissions',
        subjectId: input.id,
        actorProfileId: input.actorProfileId,
        eventType: 'STATUS_CHANGED',
        fromStatus: current.status,
        toStatus: input.status,
      });
    }

    if (
      input.internalNotes !== undefined &&
      input.internalNotes !== current.internal_notes
    ) {
      await recordEvent(client, {
        subjectTable: 'service_submissions',
        subjectId: input.id,
        actorProfileId: input.actorProfileId,
        eventType: 'NOTES_UPDATED',
      });
    }

    const refreshed = await client.query<Row>(
      'SELECT * FROM service_submissions WHERE id = $1',
      [input.id],
    );
    const row = refreshed.rows[0];
    return row ? toServiceSubmission(row) : null;
  });
}

export async function updateStartupApplication(input: {
  id: string;
  actorProfileId: string;
  status?: StartupStatus;
  internalNotes?: string | null;
}): Promise<StartupApplication | null> {
  return asStaff(async (client) => {
    const existing = await client.query<Row>(
      'SELECT status, internal_notes FROM startup_applications WHERE id = $1 FOR UPDATE',
      [input.id],
    );
    const current = existing.rows[0];
    if (!current) return null;

    const assignments: string[] = [];
    const values: unknown[] = [];

    if (input.status && input.status !== current.status) {
      values.push(input.status);
      assignments.push(`status = $${values.length}`);
      values.push(input.actorProfileId);
      assignments.push(`reviewed_by = $${values.length}`);
      assignments.push('reviewed_at = now()');
    }
    if (input.internalNotes !== undefined) {
      values.push(input.internalNotes);
      assignments.push(`internal_notes = $${values.length}`);
    }

    if (assignments.length > 0) {
      values.push(input.id);
      await client.query(
        `UPDATE startup_applications SET ${assignments.join(', ')} WHERE id = $${values.length}`,
        values,
      );
    }

    if (input.status && input.status !== current.status) {
      await recordEvent(client, {
        subjectTable: 'startup_applications',
        subjectId: input.id,
        actorProfileId: input.actorProfileId,
        eventType: 'STATUS_CHANGED',
        fromStatus: current.status,
        toStatus: input.status,
      });
    }

    if (
      input.internalNotes !== undefined &&
      input.internalNotes !== current.internal_notes
    ) {
      await recordEvent(client, {
        subjectTable: 'startup_applications',
        subjectId: input.id,
        actorProfileId: input.actorProfileId,
        eventType: 'NOTES_UPDATED',
      });
    }

    const refreshed = await client.query<Row>(
      'SELECT * FROM startup_applications WHERE id = $1',
      [input.id],
    );
    const row = refreshed.rows[0];
    return row ? toStartupApplication(row) : null;
  });
}

export async function listSubmissionEvents(
  subjectTable: 'service_submissions' | 'startup_applications',
  subjectId: string,
): Promise<SubmissionEvent[]> {
  return asStaff(async (client) => {
    const { rows } = await client.query<Row>(
      `SELECT e.*, p.display_name AS actor_name
         FROM submission_events e
         LEFT JOIN profiles p ON p.id = e.actor_profile_id
        WHERE e.subject_table = $1 AND e.subject_id = $2
        ORDER BY e.created_at DESC
        LIMIT 100`,
      [subjectTable, subjectId],
    );

    return rows.map((row) => ({
      id: row.id,
      subjectTable: row.subject_table,
      subjectId: row.subject_id,
      actorProfileId: row.actor_profile_id,
      actorName: row.actor_name,
      eventType: row.event_type,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      detail: row.detail,
      createdAt: row.created_at,
    }));
  });
}

export interface DashboardCounts {
  submissionsByStatus: Record<string, number>;
  startupsByStatus: Record<string, number>;
  submissionsByType: Record<string, number>;
  totalSubmissions: number;
  totalStartups: number;
  failedEmailsLast7Days: number;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  return asStaff(async (client) => {
    const [byStatus, byType, startupStatus, failedEmails] = await Promise.all([
      client.query<{ status: string; count: string }>(
        'SELECT status::text AS status, count(*)::text AS count FROM service_submissions GROUP BY status',
      ),
      client.query<{ submission_type: string; count: string }>(
        'SELECT submission_type::text AS submission_type, count(*)::text AS count FROM service_submissions GROUP BY submission_type',
      ),
      client.query<{ status: string; count: string }>(
        'SELECT status::text AS status, count(*)::text AS count FROM startup_applications GROUP BY status',
      ),
      client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM email_delivery_logs
          WHERE status = 'FAILED' AND created_at > now() - interval '7 days'`,
      ),
    ]);

    const submissionsByStatus: Record<string, number> = {};
    let totalSubmissions = 0;
    for (const row of byStatus.rows) {
      submissionsByStatus[row.status] = Number(row.count);
      totalSubmissions += Number(row.count);
    }

    const submissionsByType: Record<string, number> = {};
    for (const row of byType.rows) {
      submissionsByType[row.submission_type] = Number(row.count);
    }

    const startupsByStatus: Record<string, number> = {};
    let totalStartups = 0;
    for (const row of startupStatus.rows) {
      startupsByStatus[row.status] = Number(row.count);
      totalStartups += Number(row.count);
    }

    return {
      submissionsByStatus,
      submissionsByType,
      startupsByStatus,
      totalSubmissions,
      totalStartups,
      failedEmailsLast7Days: Number(failedEmails.rows[0]?.count ?? 0),
    };
  });
}
