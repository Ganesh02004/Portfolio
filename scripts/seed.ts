/**
 * Seeds reference content.
 *
 * Only marketing plans are seeded, because they are the one piece of public
 * content the plan requires to live in the database rather than in code.
 * Submissions and staff accounts are never seeded — the first is real user
 * data, the second is provisioned deliberately via scripts/create-staff.ts.
 *
 * Upserts by slug, so re-running updates existing plans instead of duplicating
 * them, and never deactivates a plan that an operator has turned off by hand.
 *
 *   npx tsx scripts/seed.ts
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  billing_model: z.enum(['ONE_TIME', 'RECURRING']),
  duration_months: z.number().int().positive().nullable(),
  price_minor_units: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3),
  summary: z.string().min(1),
  target_business: z.string().nullable().optional(),
  cta_label: z.string().min(1),
  deliverables: z.array(z.string()),
  exclusions: z.array(z.string()),
  is_active: z.boolean(),
  is_pricing_confirmed: z.boolean(),
  display_order: z.number().int(),
});

const seedSchema = z.object({
  _comment: z.unknown().optional(),
  plans: z.array(planSchema),
});

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_ADMIN_URL;
  if (!connectionString) {
    console.error('[seed] DATABASE_ADMIN_URL is required');
    process.exit(1);
  }

  const raw = await readFile(
    path.join(process.cwd(), 'db', 'seed', 'marketing-plans.json'),
    'utf8',
  );

  const parsed = seedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error('[seed] marketing-plans.json is not valid:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const client = new Client({ connectionString, application_name: 'bsp-seed' });
  await client.connect();

  try {
    for (const plan of parsed.data.plans) {
      // A confirmed price with no figure would be a content error that the
      // database constraint would reject anyway; catch it with a clear message.
      if (plan.is_pricing_confirmed && plan.price_minor_units === null) {
        console.error(
          `[seed] plan "${plan.slug}" is marked as confirmed pricing but has no price`,
        );
        process.exit(1);
      }

      await client.query(
        `INSERT INTO marketing_plans
           (name, slug, billing_model, duration_months, price_minor_units, currency,
            summary, target_business, cta_label, deliverables, exclusions,
            is_active, is_pricing_confirmed, display_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               billing_model = EXCLUDED.billing_model,
               duration_months = EXCLUDED.duration_months,
               price_minor_units = EXCLUDED.price_minor_units,
               currency = EXCLUDED.currency,
               summary = EXCLUDED.summary,
               target_business = EXCLUDED.target_business,
               cta_label = EXCLUDED.cta_label,
               deliverables = EXCLUDED.deliverables,
               exclusions = EXCLUDED.exclusions,
               is_pricing_confirmed = EXCLUDED.is_pricing_confirmed,
               display_order = EXCLUDED.display_order`,
        [
          plan.name,
          plan.slug,
          plan.billing_model,
          plan.duration_months,
          plan.price_minor_units,
          plan.currency,
          plan.summary,
          plan.target_business ?? null,
          plan.cta_label,
          JSON.stringify(plan.deliverables),
          JSON.stringify(plan.exclusions),
          plan.is_active,
          plan.is_pricing_confirmed,
          plan.display_order,
        ],
      );
    }

    console.info(`[seed] upserted ${parsed.data.plans.length} marketing plan(s)`);

    const unconfirmed = parsed.data.plans.filter((plan) => !plan.is_pricing_confirmed);
    if (unconfirmed.length > 0) {
      console.warn(
        `[seed] ${unconfirmed.length} plan(s) have unconfirmed pricing and will not ` +
          'display a price. See docs/CONTENT_PLACEHOLDERS.md.',
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
