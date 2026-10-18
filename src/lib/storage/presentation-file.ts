/**
 * Content-signature verification for uploaded presentations.
 *
 * The browser-supplied MIME type and the filename extension are both
 * attacker-controlled, so neither is sufficient. This module inspects the
 * leading bytes of the file and confirms they match a format we accept.
 *
 *   PDF   "%PDF-"
 *   PPTX  ZIP local file header ("PK\x03\x04"), since OOXML is a ZIP container
 *   PPT   OLE2 compound file header (legacy binary PowerPoint)
 *
 * This is a format check, not malware scanning. A real antivirus pass belongs
 * in front of production storage — see docs/SECURITY.md.
 */

export type PresentationFormat = 'pdf' | 'pptx' | 'ppt';

const SIGNATURES: ReadonlyArray<{
  format: PresentationFormat;
  bytes: readonly number[];
  mimeType: string;
}> = [
  {
    format: 'pdf',
    bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
    mimeType: 'application/pdf',
  },
  {
    format: 'pptx',
    bytes: [0x50, 0x4b, 0x03, 0x04], // PK..
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  {
    format: 'ppt',
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE2
    mimeType: 'application/vnd.ms-powerpoint',
  },
];

/** Longest signature we need to see before deciding. */
export const SIGNATURE_PROBE_BYTES = 8;

export interface DetectedFormat {
  format: PresentationFormat;
  /** Canonical MIME type, derived from content rather than the browser. */
  mimeType: string;
}

/**
 * Returns the detected format, or null when the content does not match any
 * accepted format.
 *
 * A ZIP header alone cannot distinguish .pptx from .docx or .zip. The
 * extension supplied by the caller disambiguates, which is safe because the
 * extension has already been restricted to the accepted list.
 */
export function detectPresentationFormat(
  head: Uint8Array,
  extension: string,
): DetectedFormat | null {
  const normalizedExtension = extension.toLowerCase();

  for (const signature of SIGNATURES) {
    if (head.length < signature.bytes.length) continue;

    const matches = signature.bytes.every((byte, index) => head[index] === byte);
    if (!matches) continue;

    // A ZIP container is only accepted when it is presented as .pptx.
    if (signature.format === 'pptx' && normalizedExtension !== '.pptx') return null;
    if (signature.format === 'ppt' && normalizedExtension !== '.ppt') return null;
    if (signature.format === 'pdf' && normalizedExtension !== '.pdf') return null;

    return { format: signature.format, mimeType: signature.mimeType };
  }

  return null;
}

/**
 * Produces a safe stored filename.
 *
 * The original name is only ever shown back to staff, never used as a storage
 * key or a filesystem path. Directory separators, control characters and
 * leading dots are removed so the value cannot escape a display context.
 */
export function sanitizeFilename(filename: string): string {
  const withoutPath = filename.split(/[\\/]/).pop() ?? 'presentation';
  const cleaned = withoutPath
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/^\.+/, '')
    .trim();

  const safe = cleaned.length > 0 ? cleaned : 'presentation';
  return safe.length > 120 ? safe.slice(safe.length - 120) : safe;
}
