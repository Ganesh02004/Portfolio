import { NextResponse } from 'next/server';
import { asPublic } from '@/lib/db/client';

/**
 * Health endpoint used by the container healthcheck and by deployment smoke
 * tests. It reports dependency reachability but never configuration values,
 * version numbers or error details, so it is safe to leave unauthenticated.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  // The database is the only stateful dependency: uploaded presentations live
  // in it too, so there is nothing else to probe.
  const database = await asPublic(async (client) => {
    await client.query('SELECT 1');
    return true;
  }).catch(() => false);

  return NextResponse.json(
    {
      status: database ? 'ok' : 'degraded',
      checks: { database },
    },
    { status: database ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
