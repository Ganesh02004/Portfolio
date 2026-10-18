import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { isValidReferenceCode } from '@/lib/reference-code';

export const metadata: Metadata = {
  title: 'Thank you',
  description: 'Your submission has been received.',
  // A confirmation page has no value in search results and should not be
  // indexed with a reference code in the URL.
  robots: { index: false, follow: true },
};

const KIND_COPY: Record<string, { heading: string; body: string }> = {
  contact: {
    heading: 'Your message has been sent',
    body: 'A member of our team will read it and reply to the email address you gave us.',
  },
  training: {
    heading: 'Your training inquiry has been received',
    body: 'We will come back to you with the current programme details for the option you selected.',
  },
  marketing: {
    heading: 'Your consultation request has been received',
    body: 'We will review what you told us and reply with the options that fit, along with a scope and a price.',
  },
  digitalization: {
    heading: 'Your inquiry has been received',
    body: 'We will look at your category and come back to you about what the process involves.',
  },
  startup: {
    heading: 'Your application has been received',
    body: 'Your presentation has been stored privately. Our team reviews every application against internal criteria and will contact you about the outcome.',
  },
};

const DEFAULT_COPY = {
  heading: 'Your submission has been received',
  body: 'A member of our team will review it and get back to you.',
};

/**
 * Submission confirmation.
 *
 * Deliberately shows only the reference code — never the submitted details,
 * a status, or anything about another applicant. The code is validated against
 * its format before display so the URL cannot be used to inject arbitrary text
 * into the page.
 */
export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const kindParam = typeof params.kind === 'string' ? params.kind : '';
  const copy = KIND_COPY[kindParam] ?? DEFAULT_COPY;

  const refParam = typeof params.ref === 'string' ? params.ref : '';
  const referenceCode = isValidReferenceCode(refParam) ? refParam : null;

  return (
    <div className="section-y">
      <div className="container-content">
        <div className="max-w-prose">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-50 text-success-700">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-current">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.78 7.7-5.6 5.6a1 1 0 0 1-1.42 0l-2.54-2.54 1.42-1.42 1.83 1.83 4.89-4.89 1.42 1.42Z" />
            </svg>
          </span>

          <h1 className="mt-5 text-4xl text-balance">{copy.heading}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">{copy.body}</p>

          {referenceCode ? (
            <div className="mt-7 rounded-card border border-ink-200 bg-ink-50 p-5">
              <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                Your reference
              </p>
              <p className="mt-1.5 font-mono text-xl font-semibold text-ink-900">
                {referenceCode}
              </p>
              <p className="mt-2 text-sm text-ink-600">
                Keep this if you need to follow up. We have also emailed it to you.
              </p>
            </div>
          ) : null}

          <div className="mt-8">
            <Callout tone="info" title="If the email does not arrive">
              Check your spam folder first. If it is not there, contact us and quote your
              reference — your submission is saved regardless of whether the email reached
              you.
            </Callout>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/" size="lg">
              Back to the homepage
            </ButtonLink>
            <ButtonLink href="/services" variant="secondary" size="lg">
              Browse our services
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
