import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed download tokens for the filesystem driver.
 *
 * A token is `<base64url payload>.<hmac>`. The payload names the object key,
 * the filename to serve it as, and an absolute expiry. Because the HMAC covers
 * the whole payload, a caller cannot change the key to reach a different
 * object, extend the expiry, or alter the filename.
 *
 * This mirrors what an S3 pre-signed URL gives you, without the dependency.
 */

export interface DownloadTokenPayload {
  key: string;
  filename: string;
  /** Unix seconds. */
  expiresAt: number;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createDownloadToken(
  payload: DownloadTokenPayload,
  secret: string,
): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

export type TokenRejection =
  'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' | 'INVALID_PAYLOAD';

export type TokenVerification =
  { ok: true; payload: DownloadTokenPayload } | { ok: false; reason: TokenRejection };

/**
 * Verifies a token. The signature is checked before the payload is parsed, so
 * untrusted JSON is never deserialised on the strength of an unverified claim.
 */
export function verifyDownloadToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): TokenVerification {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return { ok: false, reason: 'MALFORMED' };

  const encoded = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = sign(encoded, secret);

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length) return { ok: false, reason: 'BAD_SIGNATURE' };
  if (!timingSafeEqual(provided, expected)) return { ok: false, reason: 'BAD_SIGNATURE' };

  let payload: DownloadTokenPayload;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    );
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as DownloadTokenPayload).key !== 'string' ||
      typeof (parsed as DownloadTokenPayload).filename !== 'string' ||
      typeof (parsed as DownloadTokenPayload).expiresAt !== 'number'
    ) {
      return { ok: false, reason: 'INVALID_PAYLOAD' };
    }
    payload = parsed as DownloadTokenPayload;
  } catch {
    return { ok: false, reason: 'INVALID_PAYLOAD' };
  }

  if (payload.expiresAt * 1000 <= now.getTime()) {
    return { ok: false, reason: 'EXPIRED' };
  }

  return { ok: true, payload };
}
