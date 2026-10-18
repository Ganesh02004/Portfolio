import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetServerEnvCache, serverEnv } from '@/lib/env';

/**
 * Environment validation must fail loudly and name the offending variable, so
 * a misconfigured deployment is diagnosable from the startup log alone.
 */

const VALID_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://app_user:pw@db:5432/business_services_test',
  SESSION_COOKIE_SECRET: 'a'.repeat(32),
  SMTP_HOST: 'mail',
  FROM_EMAIL: 'no-reply@example.test',
  NOTIFICATION_EMAIL: 'team@example.test',
};

/** Variables that must be absent so the defaults are what gets tested. */
const CLEARED_KEYS = [
  'SESSION_TTL_HOURS',
  'DOWNLOAD_LINK_TTL_SECONDS',
  'SMTP_SECURE',
  'SMTP_PORT',
  'DATABASE_SSL_MODE',
  'RATE_LIMIT_SUBMISSIONS_PER_HOUR',
  'RATE_LIMIT_LOGIN_ATTEMPTS_PER_15_MIN',
];

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  for (const key of [...Object.keys(VALID_ENV), ...CLEARED_KEYS]) {
    delete process.env[key];
  }
  Object.assign(process.env, VALID_ENV);
  resetServerEnvCache();
});

afterEach(() => {
  process.env = originalEnv;
  resetServerEnvCache();
});

describe('serverEnv', () => {
  it('parses a valid environment', () => {
    const env = serverEnv();
    expect(env.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL);
    expect(env.NOTIFICATION_EMAIL).toBe('team@example.test');
  });

  it('applies documented defaults', () => {
    const env = serverEnv();
    expect(env.SESSION_TTL_HOURS).toBe(12);
    expect(env.DOWNLOAD_LINK_TTL_SECONDS).toBe(300);
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.DATABASE_SSL_MODE).toBe('disable');
    expect(env.RATE_LIMIT_SUBMISSIONS_PER_HOUR).toBe(8);
    expect(env.RATE_LIMIT_LOGIN_ATTEMPTS_PER_15_MIN).toBe(10);
  });

  it('caches, so repeated reads are consistent', () => {
    const first = serverEnv();
    process.env.SMTP_HOST = 'changed-after-first-read';
    expect(serverEnv()).toBe(first);
  });

  it('names the missing variable in the error', () => {
    delete process.env.DATABASE_URL;
    resetServerEnvCache();
    expect(() => serverEnv()).toThrow(/DATABASE_URL/);
  });

  it('rejects a session secret that is too short to be useful', () => {
    process.env.SESSION_COOKIE_SECRET = 'too-short';
    resetServerEnvCache();
    expect(() => serverEnv()).toThrow(/SESSION_COOKIE_SECRET/);
  });

  it('rejects an invalid notification address', () => {
    process.env.NOTIFICATION_EMAIL = 'not-an-email';
    resetServerEnvCache();
    expect(() => serverEnv()).toThrow(/NOTIFICATION_EMAIL/);
  });

  it('rejects an invalid sender address', () => {
    process.env.FROM_EMAIL = 'nobody';
    resetServerEnvCache();
    expect(() => serverEnv()).toThrow(/FROM_EMAIL/);
  });

  it('coerces numeric strings', () => {
    process.env.SESSION_TTL_HOURS = '24';
    process.env.DOWNLOAD_LINK_TTL_SECONDS = '600';
    resetServerEnvCache();

    const env = serverEnv();
    expect(env.SESSION_TTL_HOURS).toBe(24);
    expect(env.DOWNLOAD_LINK_TTL_SECONDS).toBe(600);
  });

  it('rejects a download-link lifetime outside the safe range', () => {
    process.env.DOWNLOAD_LINK_TTL_SECONDS = '86400';
    resetServerEnvCache();
    expect(() => serverEnv()).toThrow(/DOWNLOAD_LINK_TTL_SECONDS/);
  });

  it('rejects an unrecognised database SSL mode', () => {
    process.env.DATABASE_SSL_MODE = 'maybe';
    resetServerEnvCache();
    expect(() => serverEnv()).toThrow(/DATABASE_SSL_MODE/);
  });

  it('requires no storage configuration at all', () => {
    // Presentations live in the database, so there is nothing else to point at.
    expect(() => serverEnv()).not.toThrow();
  });
});
