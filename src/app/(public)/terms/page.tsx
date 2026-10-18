import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui/callout';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The terms that apply to using this website and submitting an inquiry or application.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="section-y">
      <div className="container-content">
        <div className="max-w-prose">
          <h1 className="text-4xl">Terms of service</h1>
          <p className="mt-3 text-sm text-ink-500">
            These terms cover using this website and sending us an inquiry or application.
          </p>

          <div className="mt-8">
            <Callout tone="pending" title="Pending legal review">
              These terms have not been reviewed by a legal adviser and do not yet state
              the governing law, dispute process, or the full service terms for each
              offering. They are published so the site is not silent on the subject, not
              as a final agreement.
            </Callout>
          </div>

          <div className="mt-10 space-y-9 text-base leading-relaxed text-ink-700">
            <section>
              <h2 className="text-2xl">What this website is</h2>
              <p className="mt-3">
                This site describes services and lets you ask about them. The content here
                is informational. It is not an offer, and submitting a form does not
                create a contract between us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Pricing and scope</h2>
              <p className="mt-3">
                Where a price or duration appears on this site, treat it as indicative
                until we confirm it to you in writing. Where no price appears, it is
                because it has not been finalised. The scope of any engagement, what it
                costs, and what it excludes are agreed with you before work starts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">What we do not guarantee</h2>
              <p className="mt-3">
                We want this to be unambiguous, because this sector is full of claims that
                are not kept:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <span className="font-medium text-ink-900">Employment.</span> Training
                  and placement support help you prepare and apply. We do not guarantee a
                  job, an interview, or any salary. Employers decide who they hire.
                </li>
                <li>
                  <span className="font-medium text-ink-900">
                    Selection or funding for a startup.
                  </span>{' '}
                  Submitting an application does not guarantee that it will be shortlisted
                  or supported, and does not entitle you to funding or introductions.
                </li>
                <li>
                  <span className="font-medium text-ink-900">Marketing results.</span> We
                  deliver the agreed work. We do not guarantee sales, revenue, reach or
                  rankings.
                </li>
                <li>
                  <span className="font-medium text-ink-900">
                    Marketplace acceptance.
                  </span>{' '}
                  We support your listing application. Each platform applies its own
                  eligibility rules and makes its own decision. We are not affiliated with
                  or an agent of any platform.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl">Your idea and your content</h2>
              <p className="mt-3">
                Anything you submit stays yours. Sending us an application does not
                transfer ownership, intellectual property, equity or any share in your
                business, and it does not create a partnership or investment arrangement.
                If you need a confidentiality agreement in place before you share
                something, tell us before you submit.
              </p>
              <p className="mt-3">
                You are responsible for having the right to share what you send us —
                including any material in a presentation or pitch video that belongs to
                someone else.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Acceptable use</h2>
              <p className="mt-3">
                Do not use the forms to send unlawful, misleading or malicious content, to
                impersonate someone else, or to submit automated or bulk traffic. We apply
                rate limits and may decline to act on a submission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Availability</h2>
              <p className="mt-3">
                We aim to keep the site available but do not guarantee uninterrupted
                service. If a submission fails, you will see an error rather than a false
                confirmation — if you saw a confirmation and a reference number, your
                submission was saved.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Your data</h2>
              <p className="mt-3">
                How we handle what you send is described in our{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-navy-900 underline underline-offset-2"
                >
                  privacy policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Who you are contracting with</h2>
              <p className="mt-3">
                {siteConfig.legal.entityName ? (
                  <>
                    Services are provided by {siteConfig.legal.entityName}
                    {siteConfig.legal.jurisdiction
                      ? `, registered in ${siteConfig.legal.jurisdiction}`
                      : ''}
                    .
                  </>
                ) : (
                  <>
                    The registered business entity and governing jurisdiction have not
                    been published yet. They will be stated here, and any engagement
                    agreement will name the contracting entity explicitly.
                  </>
                )}
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-ink-200 pt-6">
            <Link
              href="/privacy"
              className="text-sm font-medium text-navy-900 underline underline-offset-2"
            >
              Read our privacy policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
