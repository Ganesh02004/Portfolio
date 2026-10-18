import 'server-only';

import { asPublic } from '@/lib/db/client';
import type { MarketingPlan } from '@/types/domain';

/**
 * Marketing plan reads.
 *
 * Plans are content, stored in the database rather than hard-coded in JSX, so
 * the business can change durations, deliverables and pricing without a code
 * deployment. `is_pricing_confirmed` gates whether a price may be rendered at
 * all — an unconfirmed price is never shown, even if a number is present.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPlan(row: Record<string, any>): MarketingPlan {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    billingModel: row.billing_model,
    durationMonths: row.duration_months,
    priceMinorUnits:
      row.price_minor_units === null ? null : Number(row.price_minor_units),
    currency: row.currency,
    summary: row.summary,
    targetBusiness: row.target_business,
    ctaLabel: row.cta_label,
    deliverables: Array.isArray(row.deliverables) ? row.deliverables : [],
    exclusions: Array.isArray(row.exclusions) ? row.exclusions : [],
    isActive: row.is_active,
    isPricingConfirmed: row.is_pricing_confirmed,
    displayOrder: row.display_order,
  };
}

/**
 * Active plans for the public marketing page.
 *
 * Row level security already restricts `app_public` to active rows; the
 * explicit predicate documents the intent at the call site and keeps the query
 * correct if the policy is ever relaxed.
 */
export async function listActiveMarketingPlans(): Promise<MarketingPlan[]> {
  return asPublic(async (client) => {
    const { rows } = await client.query(
      `SELECT id, name, slug, billing_model, duration_months, price_minor_units,
              currency, summary, target_business, cta_label, deliverables,
              exclusions, is_active, is_pricing_confirmed, display_order
         FROM marketing_plans
        WHERE is_active
        ORDER BY display_order ASC, name ASC`,
    );
    return rows.map(toPlan);
  });
}
