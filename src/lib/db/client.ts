import 'server-only';

import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { serverEnv } from '@/lib/env';

/**
 * Database access.
 *
 * The application connects as a login role that holds no table privileges of
 * its own (see db/migrations/0002_roles_and_policies.sql). Every query runs
 * inside a transaction that first issues `SET LOCAL ROLE` to the narrowest
 * task role for the work at hand:
 *
 *   public  creating submissions, reading active marketing plans
 *   auth    verifying credentials, managing sessions
 *   staff   reading and triaging submissions
 *
 * A code path that forgets to pick a role therefore fails closed with a
 * permission error instead of running with full access. Row level security
 * applies on top of that, because none of these roles owns the tables.
 */

export type TaskRole = 'app_public' | 'app_auth' | 'app_staff';

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const env = serverEnv();
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL_MODE === 'require' ? { rejectUnauthorized: true } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'business-services-platform',
  });

  // An idle client error must not take the process down.
  pool.on('error', (error) => {
    console.error('[db] idle client error', { message: error.message });
  });

  return pool;
}

/** Closes the pool. Used by test teardown and graceful shutdown. */
export async function closePool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}

export interface TaskClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
}

/**
 * Runs `work` in a transaction scoped to `role`. The transaction commits when
 * `work` resolves and rolls back if it throws, so a partial write is never
 * left behind.
 */
export async function withRole<T>(
  role: TaskRole,
  work: (client: TaskClient) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await getPool().connect();

  try {
    await client.query('BEGIN');
    // Role names are a closed union, never user input, so this interpolation
    // cannot carry untrusted data. SET ROLE does not accept a bind parameter.
    await client.query(`SET LOCAL ROLE ${role}`);
    // Keep a slow query from holding a connection open indefinitely.
    await client.query("SET LOCAL statement_timeout = '15s'");

    const taskClient: TaskClient = {
      async query(text, values) {
        const result = await client.query(text, values ? [...values] : undefined);
        return { rows: result.rows, rowCount: result.rowCount ?? 0 };
      },
    };

    const outcome = await work(taskClient);
    await client.query('COMMIT');
    return outcome;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[db] rollback failed', {
        message: rollbackError instanceof Error ? rollbackError.message : 'unknown',
      });
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Convenience wrappers so call sites read as the role they need. */
export const asPublic = <T>(work: (client: TaskClient) => Promise<T>) =>
  withRole('app_public', work);

export const asAuth = <T>(work: (client: TaskClient) => Promise<T>) =>
  withRole('app_auth', work);

export const asStaff = <T>(work: (client: TaskClient) => Promise<T>) =>
  withRole('app_staff', work);
