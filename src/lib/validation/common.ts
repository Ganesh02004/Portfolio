import { z } from 'zod';

/**
 * Shared validation primitives.
 *
 * These schemas are the single source of truth for both the browser form and
 * the server handler. The browser copy exists for usability only — the server
 * re-validates every field, because client validation is not a security
 * boundary.
 */

/** Collapses whitespace and trims, so " John   Doe " stores as "John Doe". */
const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;

/** Trims but preserves internal line breaks, for multi-line fields. */
const normalizeMultiline = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : value;

export const fullNameSchema = z.preprocess(
  normalizeText,
  z
    .string()
    .min(2, 'Enter your full name')
    .max(120, 'Name must be 120 characters or fewer'),
);

export const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z
    .string()
    .min(1, 'Enter your email address')
    .max(254, 'Email address is too long')
    .email('Enter a valid email address'),
);

/**
 * Phone numbers are accepted in whatever format the visitor uses. The site
 * serves more than one country, so imposing a national format would reject
 * valid numbers; staff read these by hand.
 */
export const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z
    .string()
    .min(6, 'Enter a valid phone number')
    .max(32, 'Phone number is too long')
    .regex(/^[+()\-.\s\d]+$/, 'Phone number may contain only digits and + ( ) - .')
    .optional(),
);

export function optionalText(max: number, label = 'This field') {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = normalizeMultiline(value);
      return typeof trimmed === 'string' && trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(max, `${label} must be ${max} characters or fewer`).optional(),
  );
}

export function requiredText(min: number, max: number, label: string) {
  return z.preprocess(
    normalizeMultiline,
    z
      .string()
      .min(min, `${label} must be at least ${min} characters`)
      .max(max, `${label} must be ${max} characters or fewer`),
  );
}

/**
 * Consent must be explicitly true. A missing or false value is a validation
 * error, never a silently assumed agreement.
 */
export const consentSchema = z
  .union([z.boolean(), z.literal('true'), z.literal('on')])
  .transform((value) => value === true || value === 'true' || value === 'on')
  .refine((value) => value, {
    message: 'You must agree before submitting',
  });

/**
 * URL validation with an explicit protocol allow-list.
 *
 * `new URL()` happily accepts `javascript:` and `data:`, so the protocol is
 * checked separately. Credentials embedded in the URL are rejected because
 * they are almost always a mistake and would be stored in plain text.
 */
export const httpUrlSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .string()
    .min(1, 'Enter a link')
    .max(2048, 'Link is too long')
    .superRefine((value, ctx) => {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a complete link including https://',
        });
        return;
      }

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Links must start with http:// or https://',
        });
        return;
      }

      if (parsed.username || parsed.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Links must not contain a username or password',
        });
      }
    }),
);

/**
 * Honeypot field. Real visitors never see it, so any value means a bot filled
 * the form. Kept as a schema rather than ad-hoc checks so every form handles
 * it identically.
 */
export const honeypotSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .string()
    .max(0, 'Submission rejected')
    .optional()
    .or(z.literal('').transform(() => undefined)),
);

/** Flattens a Zod error into a field → message map for form rendering. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
