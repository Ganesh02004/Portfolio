import { randomInt } from 'node:crypto';

/**
 * Public reference codes.
 *
 * Applicants quote these when they follow up, so they must be short, easy to
 * read aloud, and impossible to enumerate. The random segment uses a
 * cryptographic source and an alphabet with no visually ambiguous characters
 * (no I, O, 0, 1), which keeps transcription over the phone reliable.
 *
 * Format: PREFIX-YYMM-XXXXXX   e.g. TRN-2610-K7M4QB
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RANDOM_LENGTH = 6;

export type ReferencePrefix = 'TRN' | 'MKT' | 'DIG' | 'GEN' | 'STU';

export function generateReferenceCode(
  prefix: ReferencePrefix,
  now: Date = new Date(),
): string {
  const year = String(now.getUTCFullYear()).slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  let random = '';
  for (let index = 0; index < RANDOM_LENGTH; index += 1) {
    random += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `${prefix}-${year}${month}-${random}`;
}

const REFERENCE_CODE_PATTERN = new RegExp(
  `^(TRN|MKT|DIG|GEN|STU)-\\d{4}-[${ALPHABET}]{${RANDOM_LENGTH}}$`,
);

export function isValidReferenceCode(value: string): boolean {
  return REFERENCE_CODE_PATTERN.test(value);
}
