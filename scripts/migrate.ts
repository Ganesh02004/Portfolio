/**
 * Migration runner.
 *
 * Applies every .sql file in db/migrations in filename order, inside one
 * transaction per file, recording what has run in `schema_migrations`. A file
 * that has already been applied is skipped, so the script is idempotent and
 * safe to run on every container start.
 *
 * It connects as the schema owner (DATABASE_ADMIN_URL), because migrations
 * create roles and grant privileges. It also provisions the application login
 * role from APP_DB_USER / APP_DB_PASSWORD, which keeps that password out of
 * the SQL files and out of version control.
 *
 *   npx tsx scripts/migrate.ts           apply pending migrations
 *   npx tsx scripts/migrate.ts --reset   DROP the schema first (dev only)
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[migrate] ${name} is required`);
    process.exit(1);
  }
  return value;
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

/**
 * Drops and recreates the public schema. Guarded so it can never run against
 * a production database by accident.
 */
async function resetSchema(client: Client): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('[migrate] --reset is refused when NODE_ENV=production');
    process.exit(1);
  }

  console.info('[migrate] resetting schema');
  await client.query('DROP SCHEMA IF EXISTS public CASCADE');
  await client.query('CREATE SCHEMA public');
  await client.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
}

/**
 * Creates or updates the application login role.
 *
 * NOINHERIT is the point of this function. The role is a member of the three
 * task roles, but because it does not inherit their privileges it can do
 * nothing until the connection issues `SET LOCAL ROLE`. A code path that
 * forgets to pick a role therefore fails closed with a permission error
 * instead of running with the union of all three.
 *
 * See db/migrations/0002_roles_and_policies.sql and src/lib/db/client.ts.
 */
async function provisionAppRole(client: Client): Promise<void> {
  const user = required('APP_DB_USER');
  const password = required('APP_DB_PASSWORD');

  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(user)) {
    console.error('[migrate] APP_DB_USER must be a plain lowercase identifier');
    process.exit(1);
  }

  const { rows } = await client.query<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists',
    [user],
  );

  // The role name is validated above; the password is passed as a literal
  // because CREATE/ALTER ROLE does not accept bind parameters. pg's
  // escapeLiteral handles quoting.
  const quotedPassword = client.escapeLiteral(password);

  if (rows[0]?.exists) {
    await client.query(
      `ALTER ROLE "${user}" WITH LOGIN NOINHERIT PASSWORD ${quotedPassword}`,
    );
  } else {
    await client.query(
      `CREATE ROLE "${user}" WITH LOGIN NOINHERIT PASSWORD ${quotedPassword}`,
    );
  }

  await client.query(`GRANT app_public, app_auth, app_staff TO "${user}"`);
  await client.query(
    `GRANT CONNECT ON DATABASE ${client.escapeIdentifier(
      new URL(required('DATABASE_ADMIN_URL')).pathname.slice(1),
    )} TO "${user}"`,
  );

  console.info(`[migrate] provisioned login role ${user}`);
}

async function main(): Promise<void> {
  const shouldReset = process.argv.includes('--reset');
  const connectionString = required('DATABASE_ADMIN_URL');

  const client = new Client({ connectionString, application_name: 'bsp-migrate' });
  await client.connect();

  try {
    if (shouldReset) await resetSchema(client);

    await ensureMigrationsTable(client);

    const applied = await client.query<{ filename: string; checksum: string }>(
      'SELECT filename, checksum FROM schema_migrations',
    );
    const appliedByName = new Map(
      applied.rows.map((row) => [row.filename, row.checksum]),
    );

    const filenames = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    if (filenames.length === 0) {
      console.warn('[migrate] no migration files found');
      return;
    }

    let appliedCount = 0;

    for (const filename of filenames) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previousChecksum = appliedByName.get(filename);

      if (previousChecksum) {
        if (previousChecksum !== checksum) {
          // An applied migration that has been edited means the database and
          // the repository disagree. Stop rather than guess.
          console.error(
            `[migrate] ${filename} has changed since it was applied.\n` +
              '          Add a new migration instead of editing an applied one.',
          );
          process.exit(1);
        }
        continue;
      }

      process.stdout.write(`[migrate] applying ${filename} … `);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum],
        );
        await client.query('COMMIT');
        appliedCount += 1;
        console.info('done');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('failed');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }

    console.info(
      appliedCount === 0
        ? '[migrate] database already up to date'
        : `[migrate] applied ${appliedCount} migration(s)`,
    );

    await provisionAppRole(client);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('[migrate] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
