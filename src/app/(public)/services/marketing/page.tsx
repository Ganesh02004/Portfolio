import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketingInquiryForm } from '@/components/forms/marketing-inquiry-form';
import { MarketingPlanCard } from '@/components/services/marketing-plan-card';
import {
  PendingConfirmationList,
  ServicePageHeader,
} from '@/components/services/service-page-header';
import { Callout } from '@/components/ui/callout';
import { findService } from '@/config/services';
import { listActiveMarketingPlans } from '@/lib/db/marketing-plans';

export const metadata: Metadata = {
  title: 'Marketing Support',
  description:
    'One-time and duration-based marketing engagements. Scope and pricing are confirmed in writing before any work begins.',
  alternates: { canonical: '/services/marketing' },
};

// Plans are editable content, so the page reads them on each request rather
// than baking them into the build.
export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const service = findService('marketing');
  if (!service) notFound();

  let plans: Awaited<ReturnType<typeof listActiveMarketingPlans>> = [];
  let plansUnavailable = false;

  try {
    plans = await listActiveMarketingPlans();
  } catch {
    // The page is still useful without the plan list — the inquiry form is the
    // real call to action — so a read failure degrades rather than 500s.
    plansUnavailable = true;
  }

  const planOptions = plans.map((plan) => ({ value: plan.slug, label: plan.name }));
  const hasUnconfirmedPricing = plans.some((plan) => !plan.isPricingConfirmed);

  return (
    <>
      <ServicePageHeader service={service} />

      <section className="section-y" aria-labelledby="plans-heading">
        <div className="container-content">
          <div className="max-w-2xl">
            <h2 id="plans-heading" className="text-3xl">
              Engagement options
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-600">
              Marketing works better as a sustained effort than as a single campaign,
              which is why most options run over a fixed term. We agree the scope with you
              before anything starts.
            </p>
          </div>

          {plansUnavailable ? (
            <div className="mt-8 max-w-prose">
              <Callout tone="danger" title="Plan details are temporarily unavailable">
                We could not load the current engagement options. Please send an inquiry
                below and we will reply with them directly.
              </Callout>
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-8 max-w-prose">
              <Callout tone="pending" title="Options are being finalised">
                Engagement durations, deliverables and pricing are being confirmed and are
                not published yet. Tell us what you need below and we will send you the
                current options.
              </Callout>
            </div>
          ) : (
            <>
              <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {plans.map((plan) => (
                  <MarketingPlanCard key={plan.id} plan={plan} />
                ))}
              </ul>

              {hasUnconfirmedPricing ? (
                <p className="mt-6 max-w-prose text-sm leading-relaxed text-ink-500">
                  Prices for some options are still being confirmed. Where no figure is
                  shown, we quote you before any work begins — there is no obligation in
                  asking.
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-50 section-y">
        <div className="container-content">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div className="flex flex-col gap-4">
              <Callout tone="info" title="How we quote">
                We look at what you are promoting, who you are trying to reach, and what
                you have already tried. You get a written scope and price before we start.
              </Callout>
              <PendingConfirmationList service={service} />
            </div>
            <MarketingInquiryForm planOptions={planOptions} />
          </div>
        </div>
      </section>
    </>
  );
}
