import { z } from 'zod';

/**
 * Environment validation.
 *
 * Server configuration is parsed lazily on first access so that importing a
 * module does not crash a build that has no runtime secrets available. When a
 * required variable is missing the process fails with a clear message naming
 * the variable, rather than throwing an opaque error deep inside a request.
 *
 * Nothing in this module is safe to import from client components. Values
 * intended for the browser live in `publicEnv` and come only from
 * NEXT_PUBLIC_* variables, which Next.js inlines at build time.
 */

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_ADMIN_URL: z.string().min(1).optional(),
  DATABASE_SSL_MODE: z.enum(['disable', 'require']).default('disable'),

  SESSION_COOKIE_SECRET: z
    .string()
    .min(32, 'SESSION_COOKIE_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(720).default(12),

  /**
   * Lifetime of a staff presentation-download link, in seconds. The link is
   * only usable by a signed-in staff member; this bounds how long it stays
   * usable at all.
   */
  DOWNLOAD_LINK_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: booleanish.default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  FROM_EMAIL: z.string().email('FROM_EMAIL must be a valid address'),
  NOTIFICATION_EMAIL: z.string().email('NOTIFICATION_EMAIL must be a valid address'),

  RATE_LIMIT_SUBMISSIONS_PER_HOUR: z.coerce.number().int().positive().default(8),
  RATE_LIMIT_LOGIN_ATTEMPTS_PER_15_MIN: z.coerce.number().int().positive().default(10),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Browser-visible configuration. Only NEXT_PUBLIC_* values may appear here;
 * anything else would be inlined into the client bundle.
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',

  /**
   * Largest presentation the site will accept, in megabytes.
   *
   * Public because the browser needs it to reject an oversized file before
   * spending the upload, and the server needs the same number so the two
   * cannot disagree.
   *
   * The default is 4 MB rather than something more generous because serverless
   * platforms cap the request body — Vercel's limit is 4.5 MB — and a file
   * rejected by the platform never reaches the application, so the visitor
   * would see a bare network error instead of a useful message. Self-hosted
   * deployments behind their own proxy can raise this.
   */
  maxPresentationMb: clampMaxPresentationMb(process.env.NEXT_PUBLIC_MAX_PRESENTATION_MB),
} as const;

/**
 * Parses the configured upload cap, falling back to the default for anything
 * missing or nonsensical. This runs in the browser bundle too, so it must not
 * throw — a bad value degrades to the safe default rather than breaking the
 * page.
 */
function clampMaxPresentationMb(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 64) return 4;
  return Math.floor(parsed);
}

let cachedServerEnv: ServerEnv | null = null;

/** Parses and caches server configuration. Throws on the first invalid value. */
export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid server environment configuration:\n${problems}\n\n` +
        'See .env.example for the full variable reference.',
    );
  }

  cachedServerEnv = parsed.data;

  // Not fatal — terminating TLS at a proxy and serving the app over plain HTTP
  // on an internal network is legitimate — but it does mean session cookies
  // cannot be marked Secure, so it should never be a surprise.
  if (
    parsed.data.NODE_ENV === 'production' &&
    !publicEnv.siteUrl.startsWith('https://')
  ) {
    console.warn(
      '[env] NEXT_PUBLIC_SITE_URL is not https. Session cookies will be set ' +
        'without the Secure attribute and without the __Host- prefix. Set it to ' +
        "the site's real https URL before exposing this deployment publicly.",
    );
  }

  return cachedServerEnv;
}

/** Test-only hook so suites can swap configuration without leaking state. */
export function resetServerEnvCache(): void {
  cachedServerEnv = null;
}

export function isProduction(): boolean {
  return serverEnv().NODE_ENV === 'production';
}
