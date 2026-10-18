import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/require-staff';
import { serverEnv } from '@/lib/env';
import { verifyDownloadToken } from '@/lib/storage/download-token';
import { readPresentation } from '@/lib/storage/presentation-store';

/**
 * Authenticated download endpoint for startup presentations.
 *
 * Three independent checks must all pass:
 *
 *   1. The caller holds a valid staff session. A link copied out of a browser
 *      is therefore useless to anyone who is not signed in.
 *   2. The token's HMAC verifies, so the application id, filename and expiry
 *      are exactly what the server issued.
 *   3. The token has not expired.
 *
 * The application id comes only from the signed token, never from a plain
 * query parameter, so a staff member cannot change one character of the URL to
 * fetch a different applicant's file.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireStaff();
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing download token' }, { status: 400 });
  }

  const verification = verifyDownloadToken(token, serverEnv().SESSION_COOKIE_SECRET);
  if (!verification.ok) {
    // Expiry is reported distinctly because it is actionable — request a new
    // link. Every other rejection gets one message, so probing the endpoint
    // reveals nothing about which part of the token was wrong.
    const expired = verification.reason === 'EXPIRED';
    return NextResponse.json(
      {
        error: expired
          ? 'This download link has expired. Request a new one.'
          : 'This download link is not valid.',
      },
      { status: expired ? 410 : 403 },
    );
  }

  if (!UUID_PATTERN.test(verification.payload.key)) {
    return NextResponse.json(
      { error: 'This download link is not valid.' },
      { status: 403 },
    );
  }

  const presentation = await readPresentation(verification.payload.key);
  if (!presentation) {
    return NextResponse.json(
      { error: 'That file is no longer available.' },
      { status: 404 },
    );
  }

  // Quotes and newlines are stripped so the filename cannot break out of the
  // Content-Disposition header.
  const safeFilename = presentation.filename.replace(/["\\\r\n]/g, '');

  return new Response(new Uint8Array(presentation.content), {
    status: 200,
    headers: {
      // Always a download, never rendered in the staff member's origin, so a
      // malicious PDF cannot execute as the admin site.
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${safeFilename}"`,
      'content-length': String(presentation.content.byteLength),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
