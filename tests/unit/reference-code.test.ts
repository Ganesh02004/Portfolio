import { describe, expect, it } from 'vitest';
import { generateReferenceCode, isValidReferenceCode } from '@/lib/reference-code';
import { formatFileSize, formatMoney } from '@/lib/utils';
import { maskEmail } from '@/lib/email/mailer';

describe('generateReferenceCode', () => {
  const fixedDate = new Date('2026-10-18T00:00:00Z');

  it('uses the documented format', () => {
    expect(generateReferenceCode('TRN', fixedDate)).toMatch(/^TRN-2610-[A-Z2-9]{6}$/);
  });

  it('round-trips through the validator', () => {
    for (const prefix of ['TRN', 'MKT', 'DIG', 'GEN', 'STU'] as const) {
      expect(isValidReferenceCode(generateReferenceCode(prefix, fixedDate))).toBe(true);
    }
  });

  it('omits visually ambiguous characters', () => {
    const codes = Array.from({ length: 300 }, () =>
      generateReferenceCode('STU', fixedDate),
    ).join('');
    // The random segment must contain no I, O, 0 or 1.
    const randomSegments = codes.replace(/STU-2610-/g, '');
    expect(randomSegments).not.toMatch(/[IO01]/);
  });

  it('does not repeat within a reasonable sample', () => {
    const codes = new Set(
      Array.from({ length: 2000 }, () => generateReferenceCode('GEN', fixedDate)),
    );
    expect(codes.size).toBe(2000);
  });
});

describe('isValidReferenceCode', () => {
  it.each(['TRN-2610-K7M4QB', 'STU-2601-ZZZZZZ'])('accepts %s', (code) => {
    expect(isValidReferenceCode(code)).toBe(true);
  });

  it.each([
    '',
    'TRN-2610-K7M4Q',
    'TRN-2610-K7M4QBB',
    'XXX-2610-K7M4QB',
    'TRN-261-K7M4QB',
    'TRN-2610-K7M4Q0',
    '<script>alert(1)</script>',
    'TRN-2610-k7m4qb',
  ])('rejects %j', (code) => {
    expect(isValidReferenceCode(code)).toBe(false);
  });
});

describe('formatMoney', () => {
  it('renders minor units as a currency amount', () => {
    // 1,500,000 paise = ₹15,000
    expect(formatMoney(1_500_000, 'INR')).toContain('15,000');
  });

  it('does not introduce floating point error', () => {
    expect(formatMoney(999_99, 'INR')).toContain('1,000');
  });
});

describe('formatFileSize', () => {
  it.each([
    [512, '512 B'],
    [2048, '2 KB'],
    [1024 * 1024 * 3.5, '3.5 MB'],
  ])('formats %i bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe('maskEmail', () => {
  it('keeps only the first and last character of the local part', () => {
    expect(maskEmail('alice@example.com')).toBe('a***e@example.com');
  });

  it('handles a very short local part', () => {
    expect(maskEmail('ab@example.com')).toBe('a***@example.com');
  });

  it('does not leak anything for a malformed address', () => {
    expect(maskEmail('not-an-email')).toBe('***');
  });
});
