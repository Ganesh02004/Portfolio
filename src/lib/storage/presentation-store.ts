import 'server-only';

import { createDownloadToken } from '@/lib/storage/download-token';
import { serverEnv } from '@/lib/env';
import type { TaskClient } from '@/lib/db/client';
import { asStaff } from '@/lib/db/client';

/**
 * Presentation storage.
 *
 * Uploaded presentations are stored in PostgreSQL, in `startup_presentations`,
 * keyed to the application they belong to. There is no object store, no bucket
 * and no mounted volume — the only stateful resource the platform needs is the
 * database it already requires.
 *
 * Three things follow from that, and they are the reason for the choice:
 *
 *   1. **No orphans are possible.** The bytes and the application row are
 *      written in one transaction, so they commit or roll back together. The
 *      previous design had to upload first, insert second, and delete the
 *      object again if the insert failed — a sequence with a failure mode in
 *      the middle of it.
 *   2. **Nothing is publicly reachable.** There is no URL that serves these
 *      bytes. The only path to them is the authenticated route in
 *      src/app/api/admin/presentations, which requires a staff session *and* a
 *      signed, expiring token.
 *   3. **`app_public` can insert and can never read.** Enforced by grant and
 *      by policy in db/migrations/0003_presentations_in_database.sql.
 *
 * The trade-off is size: presentations consume database storage and count
 * against a managed provider's quota. That is why the accepted upload size is
 * capped and configurable — see `maxPresentationBytes()` in
 * src/lib/validation/startup-schema.ts.
 */

export interface StoredPresentation {
  content: Buffer;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Writes the presentation bytes.
 *
 * Takes the caller's transaction client rather than opening its own, so the
 * insert lands in the same transaction as the application row.
 */
export async function insertPresentation(
  client: TaskClient,
  applicationId: string,
  content: Uint8Array,
): Promise<void> {
  await client.query(
    'INSERT INTO startup_presentations (application_id, content) VALUES ($1, $2)',
    [applicationId, Buffer.from(content)],
  );
}

/**
 * Reads a presentation for download. Callers must have verified staff
 * authorization first.
 */
export async function readPresentation(
  applicationId: string,
): Promise<StoredPresentation | null> {
  return asStaff(async (client) => {
    const { rows } = await client.query<{
      content: Buffer;
      presentation_filename: string;
      presentation_mime_type: string;
      presentation_size_bytes: string;
    }>(
      `SELECT p.content,
              a.presentation_filename,
              a.presentation_mime_type,
              a.presentation_size_bytes
         FROM startup_presentations p
         JOIN startup_applications a ON a.id = p.application_id
        WHERE p.application_id = $1
        LIMIT 1`,
      [applicationId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      content: row.content,
      filename: row.presentation_filename,
      mimeType: row.presentation_mime_type,
      sizeBytes: Number(row.presentation_size_bytes),
    };
  });
}

export interface DownloadLink {
  url: string;
  expiresInSeconds: number;
}

/**
 * Issues a short-lived download link for a presentation.
 *
 * The token names the application and an absolute expiry, signed so neither can
 * be altered. It is not a bearer credential on its own: the download route
 * requires a valid staff session as well, so a link copied out of a browser is
 * useless to anyone else. Callers must authorize before issuing one.
 */
export function createPresentationDownloadLink(
  applicationId: string,
  downloadFilename: string,
): DownloadLink {
  const env = serverEnv();
  const expiresInSeconds = env.DOWNLOAD_LINK_TTL_SECONDS;

  const token = createDownloadToken(
    {
      key: applicationId,
      filename: downloadFilename,
      expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
    },
    env.SESSION_COOKIE_SECRET,
  );

  return {
    url: `/api/admin/presentations?token=${encodeURIComponent(token)}`,
    expiresInSeconds,
  };
}
