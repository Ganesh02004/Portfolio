import { describe, expect, it } from 'vitest';
import { publicEnv } from '@/lib/env';
import {
  maxPresentationBytes,
  validatePresentationMetadata,
} from '@/lib/validation/startup-schema';

/**
 * The upload cap is configurable because serverless platforms impose their own
 * request-body limit, and a file the platform rejects never reaches the
 * application — the visitor would get a bare network error instead of a useful
 * message. These assert the default is conservative and the limit is applied.
 */

describe('presentation size limit', () => {
  it('defaults to a size that fits inside a serverless request body', () => {
    // Vercel's limit is 4.5 MB; the default must sit under it.
    expect(publicEnv.maxPresentationMb).toBeLessThanOrEqual(4);
    expect(maxPresentationBytes()).toBe(publicEnv.maxPresentationMb * 1024 * 1024);
  });

  it('is applied to oversized files', () => {
    const result = validatePresentationMetadata({
      filename: 'pitch.pdf',
      sizeBytes: maxPresentationBytes() + 1,
      mimeType: 'application/pdf',
    });

    expect(result).toEqual({ kind: 'TOO_LARGE', maxBytes: maxPresentationBytes() });
  });

  it('accepts a file one byte under the limit', () => {
    expect(
      validatePresentationMetadata({
        filename: 'pitch.pdf',
        sizeBytes: maxPresentationBytes() - 1,
        mimeType: 'application/pdf',
      }),
    ).toBeNull();
  });

  it('reports the limit in megabytes in the error message', () => {
    const result = validatePresentationMetadata({
      filename: 'pitch.pdf',
      sizeBytes: maxPresentationBytes() * 2,
      mimeType: 'application/pdf',
    });

    expect(result?.kind).toBe('TOO_LARGE');
    if (result?.kind === 'TOO_LARGE') {
      expect(Math.floor(result.maxBytes / (1024 * 1024))).toBe(
        publicEnv.maxPresentationMb,
      );
    }
  });
});
