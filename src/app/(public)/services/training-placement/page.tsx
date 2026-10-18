import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrainingInquiryForm } from '@/components/forms/training-inquiry-form';
import {
  PendingConfirmationList,
  ServicePageHeader,
} from '@/components/services/service-page-header';
import { Callout } from '@/components/ui/callout';
import { findService } from '@/config/services';
import {
  TRAINING_OPTION_LABELS,
  type TrainingOption,
} from '@/lib/validation/submission-schema';

export const metadata: Metadata = {
  title: 'IT Training & Placement Support',
  description:
    'Technology training with interview preparation, mock interviews, practical exercises and placement assistance. We do not guarantee employment.',
  alternates: { canonical: '/services/training-placement' },
};

/**
 * Descriptions of the two offering types.
 *
 * These describe the *shape* of each offering, which the source notes define.
 * Duration, fees, syllabus and eligibility are deliberately absent — they are
 * listed under pendingConfirmation instead of being invented.
 */
const offerings: ReadonlyArray<{
  key: TrainingOption;
  body: string;
  includes: readonly string[];
}> = [
  {
    key: 'GENERAL_TRAINING',
    body: 'Structured training in a technology domain, with practical exercises and assessments so you can demonstrate what you have learned.',
    includes: [
      'Domain or technology training sessions',
      'Practical, workplace-style exercises',
      'Progress assessment',
    ],
  },
  {
    key: 'GENERAL_TRAINING_WITH_SUPPORT',
    body: 'Everything in General Training, plus structured help getting interview-ready and applying for roles.',
    includes: [
      'Everything in General Training',
      'Interview preparation sessions',
      'Mock interviews with feedback',
      'Placement guidance and application support',
    ],
  },
];

export default function TrainingPlacementPage() {
  const service = findService('training-placement');
  if (!service) notFound();

  return (
    <>
      <ServicePageHeader service={service} />

      <section className="section-y" aria-labelledby="options-heading">
        <div className="container-content">
          <div className="max-w-2xl">
            <h2 id="options-heading" className="text-3xl">
              Two ways to train with us
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-600">
              Both options cover the same core training. The difference is whether you
              also want structured support getting into a role afterwards.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:gap-6">
            {offerings.map((offering) => (
              <article
                key={offering.key}
                className="flex flex-col rounded-card border border-ink-200 bg-white p-6 shadow-card sm:p-7"
              >
                <h3 className="text-xl">{TRAINING_OPTION_LABELS[offering.key]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {offering.body}
                </p>

                <h4 className="mt-5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                  What it includes
                </h4>
                <ul className="mt-2.5 space-y-1.5">
                  {offering.includes.map((item) => (
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

                <p className="mt-5 border-t border-ink-200 pt-4 text-sm text-ink-500">
                  Fees, duration and schedule are confirmed with you before you enrol.
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8">
            <Callout tone="pending" title="On placement support">
              Placement support means we help you prepare and apply: interview practice,
              feedback on your profile, and guidance through the process. Hiring decisions
              belong to employers. We do not guarantee a job, an interview, or a salary,
              and we are not an employment agency.
            </Callout>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-50 section-y">
        <div className="container-content">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div>
              <PendingConfirmationList service={service} />
            </div>
            <TrainingInquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
