import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StartupApplicationForm } from '@/components/forms/startup-application-form';
import {
  PendingConfirmationList,
  ServicePageHeader,
} from '@/components/services/service-page-header';
import { Callout } from '@/components/ui/callout';
import { findService } from '@/config/services';

export const metadata: Metadata = {
  title: 'Startup Support',
  description:
    'Submit your startup idea with a presentation and pitch video. Applications are reviewed against internal criteria; submission does not guarantee selection.',
  alternates: { canonical: '/services/startup-support' },
};

const processSteps = [
  {
    title: 'Read the terms',
    body: 'Check what this service does and does not offer before you share your idea.',
  },
  {
    title: 'Submit your application',
    body: 'Give us your contact details, your idea, a presentation file, and a link to your pitch video.',
  },
  {
    title: 'We review it',
    body: 'Our team assesses the submission against internal criteria. Only staff reviewing applications can see yours.',
  },
  {
    title: 'We tell you the outcome',
    body: 'We update the status and contact you — whether you are shortlisted or not.',
  },
  {
    title: 'Shortlisted applicants talk to us',
    body: 'If you are selected, we discuss what support could look like. Anything formal is put in writing separately.',
  },
] as const;

export default function StartupSupportPage() {
  const service = findService('startup-support');
  if (!service) notFound();

  return (
    <>
      <ServicePageHeader service={service} />

      <section className="section-y" aria-labelledby="process-heading">
        <div className="container-content">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div>
              <h2 id="process-heading" className="text-3xl">
                How the process works
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-600">
                Five steps, from submission to outcome. We tell every applicant where they
                stand.
              </p>

              <ol className="mt-8 space-y-6">
                {processSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-navy-200 bg-navy-50 text-sm font-semibold text-navy-900"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-ink-900">
                        <span className="sr-only">Step {index + 1}: </span>
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-4">
              <Callout tone="info" title="What you keep">
                Your idea remains yours. Submitting an application does not transfer any
                rights, equity or ownership, and does not create a partnership or
                investment arrangement.
              </Callout>

              <Callout tone="pending" title="What we cannot promise">
                We cannot promise selection, funding, introductions, or that your idea
                will succeed. Only some applications are shortlisted.
              </Callout>

              <Callout tone="success" title="How your submission is handled">
                Your presentation is stored in private storage that is not publicly
                reachable. Only staff reviewing applications can open it, through a
                short-lived link. We do not publish or share applications.
              </Callout>

              <PendingConfirmationList service={service} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-50 section-y">
        <div className="container-content max-w-3xl">
          <StartupApplicationForm />
        </div>
      </section>
    </>
  );
}
