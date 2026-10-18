import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentStaff } from '@/lib/auth/session';
import type { StaffProfile, StaffRole } from '@/types/domain';

/**
 * Server-side authorization.
 *
 * Every protected page and every admin data operation calls one of these
 * guards. Hiding a link in the UI is never treated as access control; the
 * check happens where the data is read or written.
 */

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * For page components: redirects an unauthenticated visitor to sign-in,
 * preserving where they were heading.
 */
export async function requireStaffPage(returnTo?: string): Promise<StaffProfile> {
  const staff = await getCurrentStaff();
  if (!staff) {
    const target = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
    redirect(`/admin/login${target}`);
  }
  return staff;
}

/**
 * For route handlers and server actions: throws instead of redirecting, so the
 * caller can answer with a status code.
 */
export async function requireStaff(
  minimumRole: StaffRole = 'STAFF',
): Promise<StaffProfile> {
  const staff = await getCurrentStaff();
  if (!staff) throw new UnauthorizedError();

  if (minimumRole === 'ADMIN' && staff.role !== 'ADMIN') {
    throw new ForbiddenError();
  }

  return staff;
}

/** Maps a guard failure to a response without leaking why it failed. */
export function authErrorResponse(error: unknown): Response | null {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return null;
}
