import { z } from 'zod';
import { publicEnv } from '@/lib/env';
import {
  consentSchema,
  emailSchema,
  fullNameSchema,
  honeypotSchema,
  httpUrlSchema,
  optionalPhoneSchema,
  optionalText,
  requiredText,
} from '@/lib/validation/common';

/**
 * Startup application validation, including presentation file rules.
 *
 * The pitch video is collected as a URL rather than an upload: video files are
 * large, expensive to store and awkward to scan, and applicants already host
 * pitches on a video platform. Direct video upload is a deliberate deferral,
 * recorded in docs/ARCHITECTURE.md.
 */

/**
 * Largest accepted presentation, derived from NEXT_PUBLIC_MAX_PRESENTATION_MB.
 *
 * A function rather than a constant so the browser and the server both read the
 * same configured value at call time, instead of baking in whatever was set
 * when this module was first imported.
 */
export function maxPresentationBytes(): number {
  return publicEnv.maxPresentationMb * 1024 * 1024;
}

/**
 * Accepted presentation formats. The browser-reported MIME type is never
 * trusted on its own — the server additionally verifies the file's magic bytes
 * (see src/lib/storage/presentation-file.ts).
 */
export const ACCEPTED_PRESENTATION_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
} as const;

export const ACCEPTED_PRESENTATION_EXTENSIONS = ['.pdf', '.pptx', '.ppt'] as const;

export const startupApplicationFieldsSchema = z.object({
  applicantName: fullNameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  startupName: requiredText(2, 150, 'Startup or idea name'),
  ideaTitle: requiredText(4, 200, 'Idea title'),
  ideaSummary: requiredText(40, 2000, 'Idea summary'),
  problemStatement: optionalText(2000, 'Problem being solved'),
  targetCustomer: optionalText(500, 'Target users or customers'),
  referralSource: optionalText(150, 'How you heard about us'),
  pitchVideoUrl: httpUrlSchema,
  consent: consentSchema,
  website: honeypotSchema,
});

export type StartupApplicationFields = z.infer<typeof startupApplicationFieldsSchema>;

export interface PresentationMetadata {
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

export type PresentationValidationError =
  | { kind: 'MISSING' }
  | { kind: 'TOO_LARGE'; maxBytes: number }
  | { kind: 'EMPTY' }
  | { kind: 'UNSUPPORTED_EXTENSION'; allowed: readonly string[] }
  | { kind: 'UNSUPPORTED_TYPE'; allowed: readonly string[] };

export function presentationErrorMessage(error: PresentationValidationError): string {
  switch (error.kind) {
    case 'MISSING':
      return 'Attach your presentation';
    case 'EMPTY':
      return 'The selected file is empty';
    case 'TOO_LARGE':
      return `Presentation must be ${Math.floor(error.maxBytes / (1024 * 1024))} MB or smaller`;
    case 'UNSUPPORTED_EXTENSION':
    case 'UNSUPPORTED_TYPE':
      return `Presentation must be one of: ${error.allowed.join(', ')}`;
  }
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

/**
 * Validates presentation metadata. This runs on both sides: the browser uses
 * it for immediate feedback, the server uses it as a gate before any bytes are
 * read into memory.
 */
export function validatePresentationMetadata(
  metadata: PresentationMetadata | null,
): PresentationValidationError | null {
  if (!metadata || !metadata.filename) return { kind: 'MISSING' };
  if (metadata.sizeBytes === 0) return { kind: 'EMPTY' };
  if (metadata.sizeBytes > maxPresentationBytes()) {
    return { kind: 'TOO_LARGE', maxBytes: maxPresentationBytes() };
  }

  const extension = extensionOf(metadata.filename);
  if (!(ACCEPTED_PRESENTATION_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      kind: 'UNSUPPORTED_EXTENSION',
      allowed: ACCEPTED_PRESENTATION_EXTENSIONS,
    };
  }

  // Some browsers send an empty or generic MIME type for .pptx. The extension
  // check above already constrains the file, and the server verifies the
  // content signature, so a generic type is tolerated here.
  const declaredType = metadata.mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
  const isKnownType = declaredType in ACCEPTED_PRESENTATION_TYPES;
  const isGenericType =
    declaredType === '' || declaredType === 'application/octet-stream';

  if (!isKnownType && !isGenericType) {
    return { kind: 'UNSUPPORTED_TYPE', allowed: ACCEPTED_PRESENTATION_EXTENSIONS };
  }

  return null;
}
