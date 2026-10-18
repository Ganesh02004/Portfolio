import { after, NextResponse, type NextRequest } from 'next/server';
import { createServiceSubmission } from '@/lib/db/submissions';
import { sendEmail } from '@/lib/email/mailer';
import { staffNotification, submissionAcknowledgement } from '@/lib/email/templates';
import { serverEnv, publicEnv } from '@/lib/env';
import { checkRateLimit, clientIdentifier } from '@/lib/rate-limit';
import { toFieldErrors } from '@/lib/validation/common';
import { serviceSubmissionSchema } from '@/lib/validation/submission-schema';
import { SUBMISSION_TYPE_LABELS } from '@/types/domain';

/**
 * Public submission endpoint for the contact, training, marketing and
 * digitalization forms.
 *
 * Order of operations matters and is deliberate:
 *   1. Rate limit, before any parsing work is done for an abusive caller.
 *   2. Validate with Zod — the browser's validation is not trusted.
 *   3. Reject honeypot hits with a generic success-shaped failure, so a bot
 *      learns nothing from the response.
 *   4. Persist. Only after the row is committed is email attempted.
 *   5. Send email. A delivery failure is logged and the request still
 *      succeeds, because the inquiry is safely stored.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'We could not save your inquiry. Please try again in a moment.';

export async function POST(request: NextRequest): Promise<Response> {
  const env = serverEnv();

  const limit = await checkRateLimit({
    scope: 'submission',
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = serviceSubmissionSchema.safeParse(payload);
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

  // Honeypot: a filled hidden field means an automated client. Answer with a
  // plain 400 that reveals nothing about why.
  if (input.website) {
    return NextResponse.json({ error: 'Submission rejected' }, { status: 400 });
  }

  const consentAt = new Date();

  let created: { id: string; referenceCode: string };
  try {
    created = await createServiceSubmission({
      submissionType: input.submissionType,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      businessName: 'businessName' in input ? input.businessName : undefined,
      selectedOption:
        'selectedOption' in input
          ? input.selectedOption
          : 'subject' in input
            ? input.subject
            : undefined,
      message: buildMessage(input),
      sourcePage: input.sourcePage,
      consentAt,
    });
  } catch (error) {
    // Diagnostics stay server-side; the visitor gets a retry-friendly message.
    console.error('[submissions] insert failed', {
      submissionType: input.submissionType,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  // The submission is safe from here on. Email failures are logged, not fatal.
  const adminUrl = new URL(
    `/admin/submissions/${created.id}`,
    publicEnv.siteUrl,
  ).toString();

  // Sent after the response. A visitor should not wait on an email provider to
  // learn that their inquiry was saved — and if SMTP is slow or unreachable,
  // blocking here would add tens of seconds to every submission and could
  // exceed a serverless platform's function timeout. The record is already
  // committed; delivery outcomes are logged to email_delivery_logs.
  // Sent after the response. A visitor should not wait on an email provider to
  // learn that their inquiry was saved — and if SMTP is slow or unreachable,
  // blocking here would add tens of seconds to every submission and could
  // exceed a serverless platform's function timeout. The record is already
  // committed, and delivery outcomes are recorded in email_delivery_logs.
  after(async () => {
    await Promise.allSettled([
      sendEmail(
        submissionAcknowledgement({
          to: input.email,
          fullName: input.fullName,
          referenceCode: created.referenceCode,
          submissionType: input.submissionType,
          submissionId: created.id,
        }),
      ),
      sendEmail(
        staffNotification({
          to: env.NOTIFICATION_EMAIL,
          referenceCode: created.referenceCode,
          kind: 'submission',
          serviceLabel: SUBMISSION_TYPE_LABELS[input.submissionType],
          contactName: input.fullName,
          contactEmail: input.email,
          adminUrl,
        }),
      ),
    ]);
  });

  return NextResponse.json({ referenceCode: created.referenceCode }, { status: 201 });
}

/**
 * Builds the stored message from the form's free-text fields.
 *
 * Form-specific extras (area of interest, product counts, current presence)
 * are folded into the message rather than given their own columns, keeping the
 * shared table narrow. Labels are added so staff can read the result.
 */
function buildMessage(
  input: ReturnType<typeof serviceSubmissionSchema.parse>,
): string | undefined {
  const parts: string[] = [];

  if (input.submissionType === 'TRAINING' && input.areaOfInterest) {
    parts.push(`Area of interest: ${input.areaOfInterest}`);
  }

  if (input.submissionType === 'DIGITALIZATION') {
    if (input.productCategory) parts.push(`Category: ${input.productCategory}`);
    if (input.currentPresence) parts.push(`Current presence: ${input.currentPresence}`);
    if (input.approximateProductCount !== undefined) {
      parts.push(`Approximate products: ${input.approximateProductCount}`);
    }
  }

  if (input.message) {
    if (parts.length > 0) parts.push('');
    parts.push(input.message);
  }

  return parts.length > 0 ? parts.join('\n') : undefined;
}
