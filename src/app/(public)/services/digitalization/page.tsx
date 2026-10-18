import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DigitalizationInquiryForm } from '@/components/forms/digitalization-inquiry-form';
import {
  PendingConfirmationList,
  ServicePageHeader,
} from '@/components/services/service-page-header';
import { Callout } from '@/components/ui/callout';
import { findService } from '@/config/services';
import { DIGITALIZATION_OPTION_LABELS } from '@/lib/validation/submission-schema';

export const metadata: Metadata = {
  title: 'Business Digitalization & E-commerce',
  description:
    'Get your business online: e-commerce listing support, quick-commerce listing support, or your own website. We do not guarantee marketplace approval.',
  alternates: { canonical: '/services/digitalization' },
};

const options = [
  {
    key: 'ECOMMERCE_LISTING',
    body: 'We help you prepare and submit what a marketplace needs — product information, images, categories and pricing structure — and guide you through its onboarding process.',
    suitedTo: 'Businesses with products ready to sell that want reach beyond their area',
    includes: [
      'Account and seller-profile setup guidance',
      'Product catalogue preparation',
      'Listing creation and category mapping',
      'Guidance on platform requirements',
    ],
  },
  {
    key: 'QUICK_COMMERCE_LISTING',
    body: 'The same support aimed at fast-delivery platforms, which usually have stricter requirements around stock, packaging and fulfilment speed.',
    suitedTo: 'Local businesses with stock on hand that can fulfil quickly',
    includes: [
      'Eligibility review for the platform',
      'Catalogue and packaging information prep',
      'Listing submission support',
      'Guidance on fulfilment expectations',
    ],
  },
  {
    key: 'OWN_WEBSITE',
    body: 'A website you own outright, rather than a presence on someone else’s platform. We cover discovery, design, build and launch.',
    suitedTo:
      'Businesses that want their own storefront and direct customer relationship',
    includes: [
      'Requirements discovery',
      'Design and build',
      'Launch and handover',
      'Optional ongoing maintenance',
    ],
  },
] as const;

export default function DigitalizationPage() {
  const service = findService('digitalization');
  if (!service) notFound();

  return (
    <>
      <ServicePageHeader service={service} />

      <section className="section-y" aria-labelledby="options-heading">
        <div className="container-content">
          <div className="max-w-2xl">
            <h2 id="options-heading" className="text-3xl">
              Three ways to get online
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-600">
              They are not alternatives to each other so much as different answers to
              different problems. We will tell you which one actually fits your business.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:gap-6">
            {options.map((option) => (
              <article
                key={option.key}
                className="rounded-card border border-ink-200 bg-white p-6 shadow-card sm:p-7"
              >
                <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
                  <div>
                    <h3 className="text-xl">
                      {DIGITALIZATION_OPTION_LABELS[option.key]}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">
                      {option.body}
                    </p>
                    <p className="mt-4 text-sm text-ink-500">
                      <span className="font-medium text-ink-700">Suited to:</span>{' '}
                      {option.suitedTo}
                    </p>
                  </div>

                  <div className="lg:border-l lg:border-ink-200 lg:pl-8">
                    <h4 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                      What we do
                    </h4>
                    <ul className="mt-2.5 space-y-1.5">
                      {option.includes.map((item) => (
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
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 max-w-prose">
            <Callout tone="pending" title="About marketplace approval">
              We are not affiliated with, endorsed by, or an agent of any marketplace or
              quick-commerce platform. Each platform decides which sellers and products it
              accepts, using its own eligibility rules. We support your application; we
              cannot approve it.
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
            <DigitalizationInquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
