import type { Metadata } from 'next';
import { CtaSection } from '@/components/home/cta-section';
import { Callout } from '@/components/ui/callout';
import { services } from '@/config/services';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'What this organization does, how it works, and what it will not claim. Team and company details are published once confirmed.',
  alternates: { canonical: '/about' },
};

const principles = [
  {
    title: 'We say what we can actually deliver',
    body: 'Training, review, marketing execution and build work are things we control. Hiring decisions, funding decisions and marketplace approvals are not. We draw that line clearly rather than blurring it in marketing copy.',
  },
  {
    title: 'Scope and price before work',
    body: 'You get the scope and the cost in writing before anything starts. Nothing on this site is an offer until we have confirmed it with you directly.',
  },
  {
    title: 'Your information stays yours',
    body: 'We collect only what we need to answer your request. Presentations go into private storage, not a public bucket, and internal review notes are never shown outside the team.',
  },
  {
    title: 'A real person reads every submission',
    body: 'Forms are not a filter that discards most of what arrives. Every inquiry and application is read, and every applicant hears the outcome.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-navy-50 to-white">
        <div className="container-content py-12 lg:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl text-balance">About us</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">
              We work with two kinds of people: individuals building a career in IT, and
              business owners trying to start, promote or digitalize what they do.
            </p>
          </div>
        </div>
      </section>

      <section className="section-y" aria-labelledby="what-we-do-heading">
        <div className="container-content">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div className="max-w-prose">
              <h2 id="what-we-do-heading" className="text-3xl">
                What we do
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-600">
                {siteConfig.description}
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink-600">
                Those needs look different on the surface but share a shape: someone has a
                goal, is missing a specific capability, and needs a structured process
                rather than general advice. We provide the process.
              </p>

              <ul className="mt-6 space-y-2">
                {services.map((service) => (
                  <li key={service.slug} className="flex gap-2.5 text-base text-ink-700">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="mt-1.5 size-3.5 shrink-0 fill-teal-600"
                    >
                      <path d="M6.2 11.6 3 8.4l1.1-1.1 2.1 2.1 5.7-5.7L13 4.8l-6.8 6.8Z" />
                    </svg>
                    <span>
                      <span className="font-medium text-ink-900">{service.name}</span> —{' '}
                      {service.summary}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-3xl">How we work</h2>
              <div className="mt-6 space-y-5">
                {principles.map((principle) => (
                  <div key={principle.title} className="border-l-2 border-teal-300 pl-5">
                    <h3 className="text-base font-semibold text-ink-900">
                      {principle.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                      {principle.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-50 section-y">
        <div className="container-content max-w-prose">
          <h2 className="text-2xl">Company details</h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            We publish verifiable facts about the organization here rather than claims we
            cannot support.
          </p>

          <div className="mt-6 space-y-4">
            {siteConfig.legal.entityName ? (
              <dl className="space-y-3 rounded-card border border-ink-200 bg-white p-5">
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    Registered name
                  </dt>
                  <dd className="mt-0.5 text-base text-ink-800">
                    {siteConfig.legal.entityName}
                  </dd>
                </div>
                {siteConfig.legal.registrationNumber ? (
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                      Registration number
                    </dt>
                    <dd className="mt-0.5 text-base text-ink-800">
                      {siteConfig.legal.registrationNumber}
                    </dd>
                  </div>
                ) : null}
                {siteConfig.legal.jurisdiction ? (
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                      Jurisdiction
                    </dt>
                    <dd className="mt-0.5 text-base text-ink-800">
                      {siteConfig.legal.jurisdiction}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <Callout tone="pending" title="Not published yet">
                Our registered business name, registration number and jurisdiction are not
                shown because they have not been confirmed for publication. We will add
                them here, and to the privacy policy and terms, once they are.
              </Callout>
            )}

            <Callout tone="info" title="Team">
              We do not list team members, credentials or client names on this site
              because none have been supplied for publication. We would rather show
              nothing than show something unverified.
            </Callout>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
