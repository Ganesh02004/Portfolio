import type { Metadata } from 'next';
import { CtaSection } from '@/components/home/cta-section';
import { FaqSection } from '@/components/home/faq-section';
import { HeroSection } from '@/components/home/hero-section';
import { HowItWorks } from '@/components/home/how-it-works';
import { ServiceGrid } from '@/components/home/service-grid';
import { Callout } from '@/components/ui/callout';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <ServiceGrid description="Pick the service that matches what you need. Each page explains what is included, what we still need to confirm with you, and how to get in touch." />

      <HowItWorks />

      <section className="section-y" aria-labelledby="honesty-heading">
        <div className="container-content">
          <div className="max-w-prose">
            <h2 id="honesty-heading" className="text-3xl">
              What we will and will not promise
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-600">
              A lot of organizations in this space promise outcomes they cannot control.
              We would rather be specific about where our work ends.
            </p>

            <div className="mt-7 grid gap-4">
              <Callout tone="success" title="What we do">
                Deliver the training, review, marketing or build work we agree with you,
                and tell you honestly where you stand.
              </Callout>
              <Callout tone="pending" title="What we cannot control">
                Hiring decisions, investor decisions, and whether a marketplace approves a
                listing. We support the process; we do not decide the outcome.
              </Callout>
              <Callout tone="info" title="What is still being finalised">
                Pricing, programme durations and formal terms are being confirmed. Nothing
                on this site is an offer until we have put it in writing to you.
              </Callout>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
      <CtaSection />
    </>
  );
}
