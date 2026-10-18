'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/require-staff';
import { signIn, signOut } from '@/lib/auth/session';
import {
  getStartupApplication,
  updateServiceSubmission,
  updateStartupApplication,
} from '@/lib/db/submissions';
import { serverEnv } from '@/lib/env';
import { checkRateLimit } from '@/lib/rate-limit';
import { createPresentationDownloadLink } from '@/lib/storage/presentation-store';
import { STARTUP_STATUSES, SUBMISSION_STATUSES } from '@/types/domain';
import { headers } from 'next/headers';
import { clientIdentifier } from '@/lib/rate-limit';

/**
 * Admin server actions.
 *
 * Every action re-authorizes. None of them trusts the page that rendered the
 * form — a stale tab, a replayed request or a hand-crafted POST all hit the
 * same `requireStaff` check before any data is touched.
 */

export interface ActionResult {
  ok: boolean;
  message?: string;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  next: z.string().optional(),
});

export async function signInAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });

  if (!parsed.success) {
    return { ok: false, message: 'Enter your email address and password.' };
  }

  const env = serverEnv();
  const requestHeaders = await headers();

  const limit = await checkRateLimit({
    scope: 'login',
    identifier: clientIdentifier(requestHeaders),
    limit: env.RATE_LIMIT_LOGIN_ATTEMPTS_PER_15_MIN,
    windowSeconds: 15 * 60,
    role: 'auth',
  });

  if (!limit.allowed) {
    return {
      ok: false,
      message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
    };
  }

  const result = await signIn(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    // One message for every failure mode, so the response cannot be used to
    // discover which email addresses have accounts.
    return { ok: false, message: 'Those credentials were not recognised.' };
  }

  // Only same-origin relative paths are accepted, so `next` cannot be used as
  // an open redirect.
  const requested = parsed.data.next ?? '';
  const destination =
    requested.startsWith('/admin') && !requested.startsWith('//') ? requested : '/admin';

  redirect(destination);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect('/admin/login');
}

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

const updateSubmissionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(SUBMISSION_STATUSES).optional(),
  internalNotes: z
    .string()
    .max(8000, 'Notes must be 8000 characters or fewer')
    .optional(),
});

export async function updateSubmissionAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let staffId: string;
  try {
    const staff = await requireStaff();
    staffId = staff.id;
  } catch {
    return { ok: false, message: 'Your session has expired. Sign in again to continue.' };
  }

  const parsed = updateSubmissionSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status') || undefined,
    internalNotes: formData.get('internalNotes') ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: 'That update was not valid.' };
  }

  try {
    const updated = await updateServiceSubmission({
      id: parsed.data.id,
      actorProfileId: staffId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.internalNotes !== undefined
        ? { internalNotes: parsed.data.internalNotes || null }
        : {}),
    });

    if (!updated) return { ok: false, message: 'That submission no longer exists.' };
  } catch (error) {
    console.error('[admin] submission update failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, message: 'The update could not be saved. Try again.' };
  }

  revalidatePath(`/admin/submissions/${parsed.data.id}`);
  revalidatePath('/admin/submissions');
  revalidatePath('/admin');
  return { ok: true, message: 'Saved.' };
}

const updateStartupSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STARTUP_STATUSES).optional(),
  internalNotes: z
    .string()
    .max(8000, 'Notes must be 8000 characters or fewer')
    .optional(),
});

export async function updateStartupAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let staffId: string;
  try {
    const staff = await requireStaff();
    staffId = staff.id;
  } catch {
    return { ok: false, message: 'Your session has expired. Sign in again to continue.' };
  }

  const parsed = updateStartupSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status') || undefined,
    internalNotes: formData.get('internalNotes') ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: 'That update was not valid.' };
  }

  try {
    const updated = await updateStartupApplication({
      id: parsed.data.id,
      actorProfileId: staffId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.internalNotes !== undefined
        ? { internalNotes: parsed.data.internalNotes || null }
        : {}),
    });

    if (!updated) return { ok: false, message: 'That application no longer exists.' };
  } catch (error) {
    console.error('[admin] startup update failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, message: 'The update could not be saved. Try again.' };
  }

  revalidatePath(`/admin/startup-applications/${parsed.data.id}`);
  revalidatePath('/admin/startup-applications');
  revalidatePath('/admin');
  return { ok: true, message: 'Saved.' };
}

// ---------------------------------------------------------------------------
// Private file access
// ---------------------------------------------------------------------------

export interface DownloadLinkResult {
  ok: boolean;
  url?: string;
  expiresInSeconds?: number;
  message?: string;
}

/**
 * Issues a short-lived download link for a startup presentation.
 *
 * The link is built from the application id only after that application has
 * been loaded, so a caller cannot name a record that does not exist, and the
 * signed token means the id in the URL cannot be swapped for another one.
 */
export async function requestPresentationLinkAction(
  _previous: DownloadLinkResult | null,
  formData: FormData,
): Promise<DownloadLinkResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, message: 'Your session has expired. Sign in again to continue.' };
  }

  const applicationId = z.string().uuid().safeParse(formData.get('applicationId'));
  if (!applicationId.success) {
    return { ok: false, message: 'That application reference was not valid.' };
  }

  const application = await getStartupApplication(applicationId.data);
  if (!application) {
    return { ok: false, message: 'That application no longer exists.' };
  }

  const { url, expiresInSeconds } = createPresentationDownloadLink(
    application.id,
    application.presentationFilename,
  );

  return { ok: true, url, expiresInSeconds };
}
