import { after, NextResponse, type NextRequest } from 'next/server';
import { createStartupApplication } from '@/lib/db/submissions';
import { sendEmail } from '@/lib/email/mailer';
import { staffNotification, startupAcknowledgement } from '@/lib/email/templates';
import { publicEnv, serverEnv } from '@/lib/env';
import { checkRateLimit, clientIdentifier } from '@/lib/rate-limit';
import {
  detectPresentationFormat,
  SIGNATURE_PROBE_BYTES,
  sanitizeFilename,
} from '@/lib/storage/presentation-file';
import { toFieldErrors } from '@/lib/validation/common';
import {
  presentationErrorMessage,
  startupApplicationFieldsSchema,
  validatePresentationMetadata,
} from '@/lib/validation/startup-schema';

/**
 * Startup application endpoint.
 *
 * File handling rules enforced here:
 *   - Metadata (size, extension, declared type) is checked before the body is
 *     read, so an oversized upload is rejected without buffering it.
 *   - The file's leading bytes are matched against an accepted format
 *     signature. A `.pdf` that is actually an executable is rejected.
 *   - The bytes are written in the same database transaction as the
 *     application row, so a partial write is impossible — there is no upload
 *     step that can succeed while the insert fails, and therefore no orphan to
 *     clean up.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Reading and storing a multi-megabyte upload takes longer than a page render.
// Platform ceilings still apply: Vercel's Hobby plan allows up to 60s.
export const maxDuration = 60;

const GENERIC_ERROR = 'We could not save your application. Please try again in a moment.';

export async function POST(request: NextRequest): Promise<Response> {
  const env = serverEnv();

  const limit = await checkRateLimit({
    scope: 'startup-application',
    identifier: clientIdentifier(request.headers),
    limit: env.RATE_LIMIT_SUBMISSIONS_PER_HOUR,
    windowSeconds: 3600,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    // A body larger than the platform accepts fails here, before any of our
    // own validation runs, so the message has to cover that case too.
    return NextResponse.json(
      {
        error:
          `We could not read your upload. Presentations must be ` +
          `${publicEnv.maxPresentationMb} MB or smaller.`,
      },
      { status: 413 },
    );
  }

  const fields = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => typeof value === 'string'),
  );

  const parsed = startupApplicationFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Please correct the highlighted fields.',
        fieldErrors: toFieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Honeypot: a filled hidden field means an automated client.
  if (input.website) {
    return NextResponse.json({ error: 'Submission rejected' }, { status: 400 });
  }

  const presentation = formData.get('presentation');
  if (!(presentation instanceof File)) {
    return NextResponse.json(
      {
        error: 'Attach your presentation',
        fieldErrors: { presentation: 'Attach your presentation' },
      },
      { status: 400 },
    );
  }

  const metadataProblem = validatePresentationMetadata({
    filename: presentation.name,
    sizeBytes: presentation.size,
    mimeType: presentation.type,
  });

  if (metadataProblem) {
    return NextResponse.json(
      {
        error: 'Your presentation was not accepted.',
        fieldErrors: { presentation: presentationErrorMessage(metadataProblem) },
      },
      { status: metadataProblem.kind === 'TOO_LARGE' ? 413 : 400 },
    );
  }

  const bytes = new Uint8Array(await presentation.arrayBuffer());
  const extension = presentation.name
    .slice(presentation.name.lastIndexOf('.'))
    .toLowerCase();
  const detected = detectPresentationFormat(
    bytes.subarray(0, SIGNATURE_PROBE_BYTES),
    extension,
  );

  if (!detected) {
    return NextResponse.json(
      {
        error: 'Your presentation was not accepted.',
        fieldErrors: {
          presentation:
            'This file does not look like a PDF or PowerPoint presentation. Re-export it and try again.',
        },
      },
      { status: 400 },
    );
  }

  let created: { id: string; referenceCode: string };
  try {
    created = await createStartupApplication({
      applicantName: input.applicantName,
      email: input.email,
      phone: input.phone,
      startupName: input.startupName,
      ideaTitle: input.ideaTitle,
      ideaSummary: input.ideaSummary,
      problemStatement: input.problemStatement,
      targetCustomer: input.targetCustomer,
      referralSource: input.referralSource,
      pitchVideoUrl: input.pitchVideoUrl,
      presentationContent: bytes,
      presentationFilename: sanitizeFilename(presentation.name),
      presentationSizeBytes: presentation.size,
      presentationMimeType: detected.mimeType,
      consentAt: new Date(),
    });
  } catch (error) {
    // Diagnostics stay server-side. Nothing partial was written: the row and
    // the file share one transaction, which has rolled back.
    console.error('[startup-applications] insert failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  const adminUrl = new URL(
    `/admin/startup-applications/${created.id}`,
    publicEnv.siteUrl,
  ).toString();

  // Sent after the response, for the reasons described in the submissions
  // route: the applicant should not wait on an email provider, and a slow
  // relay must not push the request past a platform function timeout.
  // Sent after the response, for the reasons described in the submissions
  // route: the applicant should not wait on an email provider, and a slow
  // relay must not push the request past a platform function timeout.
  after(async () => {
    await Promise.allSettled([
      sendEmail(
        startupAcknowledgement({
          to: input.email,
          applicantName: input.applicantName,
          referenceCode: created.referenceCode,
          applicationId: created.id,
        }),
      ),
      sendEmail(
        staffNotification({
          to: env.NOTIFICATION_EMAIL,
          referenceCode: created.referenceCode,
          kind: 'startup',
          serviceLabel: 'Startup support',
          contactName: input.applicantName,
          contactEmail: input.email,
          adminUrl,
        }),
      ),
    ]);
  });

  return NextResponse.json({ referenceCode: created.referenceCode }, { status: 201 });
}
