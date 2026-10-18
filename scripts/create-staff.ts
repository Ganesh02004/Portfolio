/**
 * Provisions a staff account.
 *
 * Staff accounts exist only because an administrator ran this script. There is
 * no self-signup and no way to change your own role through the application,
 * which is why role escalation is not reachable from the web surface.
 *
 *   npx tsx scripts/create-staff.ts --email a@b.com --name "A B" [--role ADMIN]
 *
 * The password is read from the STAFF_PASSWORD environment variable, never a
 * command-line argument, so it does not end up in shell history or `ps` output.
 * If STAFF_PASSWORD is unset a strong password is generated and printed once.
 */

import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { hashPassword } from '../src/lib/auth/password';

interface Args {
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    console.info(
      [
        'Usage: npx tsx scripts/create-staff.ts --email <email> --name <name> [--role ADMIN|STAFF]',
        '',
        'Set STAFF_PASSWORD to choose the password; otherwise one is generated.',
        'Re-running for an existing email updates that account’s password and role.',
      ].join('\n'),
    );
    process.exit(0);
  }

  function valueOf(flag: string): string | undefined {
    const index = argv.indexOf(flag);
    return index !== -1 ? argv[index + 1] : undefined;
  }

  const email = valueOf('--email');
  const name = valueOf('--name');
  const role = (valueOf('--role') ?? 'STAFF').toUpperCase();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('[staff] --email must be a valid email address');
    process.exit(1);
  }
  if (!name || name.trim().length < 1) {
    console.error('[staff] --name is required');
    process.exit(1);
  }
  if (role !== 'ADMIN' && role !== 'STAFF') {
    console.error('[staff] --role must be ADMIN or STAFF');
    process.exit(1);
  }

  return { email: email.trim().toLowerCase(), name: name.trim(), role };
}

function generatePassword(): string {
  return randomBytes(18).toString('base64url');
}

async function main(): Promise<void> {
  const args = parseArgs();

  const connectionString = process.env.DATABASE_ADMIN_URL;
  if (!connectionString) {
    console.error('[staff] DATABASE_ADMIN_URL is required');
    process.exit(1);
  }

  const providedPassword = process.env.STAFF_PASSWORD;
  const password = providedPassword || generatePassword();

  if (password.length < 12) {
    console.error('[staff] STAFF_PASSWORD must be at least 12 characters');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const client = new Client({ connectionString, application_name: 'bsp-create-staff' });
  await client.connect();

  try {
    const { rows } = await client.query<{ id: string; created: boolean }>(
      `INSERT INTO profiles (email, display_name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lower(email)) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             role = EXCLUDED.role,
             password_hash = EXCLUDED.password_hash,
             is_active = TRUE
       RETURNING id, (xmax = 0) AS created`,
      [args.email, args.name, args.role, passwordHash],
    );

    const record = rows[0];
    if (!record) throw new Error('No row returned');

    console.info(
      `[staff] ${record.created ? 'created' : 'updated'} ${args.role} account for ${args.email}`,
    );

    if (!providedPassword) {
      console.info('');
      console.info('  Generated password (shown once, store it in a password manager):');
      console.info(`  ${password}`);
      console.info('');
    }

    console.info('[staff] sign in at /admin/login');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('[staff] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
