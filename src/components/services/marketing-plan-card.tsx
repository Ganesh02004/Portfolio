import { formatMoney } from '@/lib/utils';
import type { MarketingPlan } from '@/types/domain';

/**
 * Marketing plan card.
 *
 * A price is rendered only when `isPricingConfirmed` is true. An unconfirmed
 * plan shows "Price on confirmation" rather than a number, so the site cannot
 * accidentally publish a figure the business has not approved.
 */
export function MarketingPlanCard({ plan }: { plan: MarketingPlan }) {
  const cadence =
    plan.billingModel === 'ONE_TIME'
      ? 'One-time engagement'
      : plan.durationMonths
        ? `${plan.durationMonths}-month engagement`
        : 'Ongoing engagement';

  return (
    <li className="flex">
      <article className="flex w-full flex-col rounded-card border border-ink-200 bg-white p-6 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
          {cadence}
        </p>
        <h3 className="mt-2 text-xl">{plan.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{plan.summary}</p>

        <p className="mt-5 border-y border-ink-200 py-4">
          {plan.isPricingConfirmed && plan.priceMinorUnits !== null ? (
            <>
              <span className="text-2xl font-semibold text-ink-900">
                {formatMoney(plan.priceMinorUnits, plan.currency)}
              </span>
              {plan.billingModel === 'RECURRING' ? (
                <span className="ml-1.5 text-sm text-ink-500">per month</span>
              ) : null}
            </>
          ) : (
            <span className="text-sm font-medium text-ink-600">
              Price confirmed with you before work starts
            </span>
          )}
        </p>

        {plan.deliverables.length > 0 ? (
          <>
            <h4 className="mt-5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
              Included
            </h4>
            <ul className="mt-2.5 space-y-1.5">
              {plan.deliverables.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-ink-700">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="mt-1 size-3.5 shrink-0 fill-teal-600"
                  >
                    <path d="M6.2 11.6 3 8.4l1.1-1.1 2.1 2.1 5.7-5.7L13 4.8l-6.8 6.8Z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {plan.exclusions.length > 0 ? (
          <>
            <h4 className="mt-5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
              Not included
            </h4>
            <ul className="mt-2.5 space-y-1.5">
              {plan.exclusions.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-ink-500">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="mt-1 size-3.5 shrink-0 fill-ink-400"
                  >
                    <path d="M4 7.25h8v1.5H4v-1.5Z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {plan.targetBusiness ? (
          <p className="mt-5 border-t border-ink-200 pt-4 text-sm text-ink-500">
            Best suited to: {plan.targetBusiness}
          </p>
        ) : null}
      </article>
    </li>
  );
}
