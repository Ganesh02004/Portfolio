import { Client } from 'pg';
import { afterAll, beforeAll } from 'vitest';
import { closePool } from '@/lib/db/client';

/**
 * Integration test setup.
 *
 * Asserts that the suite is pointed at a real, disposable test database rather
 * than a development or production one, then truncates the submission tables
 * so each run starts from a known state.
 *
 * The guard is deliberate: these tests delete data, and the cost of being
 * wrong about which database is connected is unrecoverable.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set for integration tests`);
  return value;
}

beforeAll(async () => {
  const adminUrl = requireEnv('DATABASE_ADMIN_URL');
  requireEnv('DATABASE_URL');

  const databaseName = new URL(adminUrl).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against "${databaseName}". ` +
        'The database name must end with "_test".',
    );
  }

  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(
      `TRUNCATE service_submissions, startup_applications, submission_events,
                email_delivery_logs, rate_limit_hits, admin_sessions
       RESTART IDENTITY CASCADE`,
    );
  } finally {
    await client.end();
  }
});

afterAll(async () => {
  await closePool();
});
