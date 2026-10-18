import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui/callout';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What information this site collects, why, how it is stored, and how to ask for it to be removed.',
  alternates: { canonical: '/privacy' },
};

/**
 * Privacy policy.
 *
 * This describes what the application actually does — the data it collects, the
 * storage it uses, and the access controls around it — which is verifiable from
 * the code. It is NOT legal advice and has not been reviewed by a lawyer for
 * any particular jurisdiction. Statutory rights language, the governing law and
 * the retention period are flagged as outstanding rather than guessed at.
 */
export default function PrivacyPage() {
  return (
    <div className="section-y">
      <div className="container-content">
        <div className="max-w-prose">
          <h1 className="text-4xl">Privacy policy</h1>
          <p className="mt-3 text-sm text-ink-500">
            This policy describes how this website handles the information you send it.
          </p>

          <div className="mt-8">
            <Callout tone="pending" title="Pending legal review">
              This policy accurately describes what the software does, but it has not been
              reviewed by a legal adviser and does not yet state the governing law,
              statutory rights or the retention period for your jurisdiction. Those are
              being confirmed. Do not treat this as a final legal document.
            </Callout>
          </div>

          <div className="mt-10 space-y-9 text-base leading-relaxed text-ink-700">
            <section>
              <h2 className="text-2xl">What we collect</h2>
              <p className="mt-3">
                We collect only what you type into a form. There are no third-party
                analytics or advertising trackers on this site, so we do not build a
                profile of your browsing.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-ink-900">
                Inquiry and contact forms
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Your name, email address and, if you give it, your phone number</li>
                <li>Your business name, where the form asks for it</li>
                <li>The service or option you selected</li>
                <li>The message or requirements you wrote</li>
                <li>Which page you submitted from</li>
                <li>The date and time you gave consent</li>
              </ul>

              <h3 className="mt-5 text-lg font-semibold text-ink-900">
                Startup applications
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Everything listed above</li>
                <li>Your startup or idea name, title and summary</li>
                <li>The problem you are solving and your target customers</li>
                <li>The presentation file you upload</li>
                <li>The pitch video link you provide</li>
              </ul>

              <h3 className="mt-5 text-lg font-semibold text-ink-900">
                Technical information
              </h3>
              <p className="mt-2">
                To limit automated abuse we count submissions per network address. The
                address itself is not stored — only a one-way hash of it, which cannot be
                reversed to identify you, alongside a counter.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Why we collect it</h2>
              <p className="mt-3">
                To read your request, assess it, and reply to you. We also send you a
                confirmation email so you have a record and a reference number. That is
                the whole purpose. We do not use your details for marketing unrelated to
                your request, and we do not sell or rent them to anyone.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Who can see it</h2>
              <p className="mt-3">
                Only staff who have been given an account can read submissions. Access is
                checked on the server for every request, and the database itself restricts
                which operations an unauthenticated visitor can perform — a visitor can
                create a submission but cannot read any.
              </p>
              <p className="mt-3">
                Uploaded presentations are kept in private storage that is not reachable
                from the public internet. When a staff member opens one, the system issues
                a single link that expires within minutes.
              </p>
              <p className="mt-3">
                Internal review notes are visible only to staff and are never included in
                any email we send you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">How long we keep it</h2>
              <p className="mt-3">
                {siteConfig.legal.dataRetentionPeriod ? (
                  <>Submissions are kept for {siteConfig.legal.dataRetentionPeriod}.</>
                ) : (
                  <>
                    Our retention period has not been finalised. Until it is published
                    here, submissions are kept for as long as needed to handle your
                    request, and you can ask us to delete yours at any time.
                  </>
                )}
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Asking for your data or its removal</h2>
              <p className="mt-3">
                You can ask what we hold about you and ask us to correct or delete it.
                Quote the reference number from your confirmation email so we can find the
                right record.
              </p>
              <p className="mt-3">
                {siteConfig.legal.privacyContactEmail ? (
                  <>
                    Write to{' '}
                    <a
                      href={`mailto:${siteConfig.legal.privacyContactEmail}`}
                      className="font-medium text-navy-900 underline underline-offset-2"
                    >
                      {siteConfig.legal.privacyContactEmail}
                    </a>
                    .
                  </>
                ) : (
                  <>
                    A dedicated privacy contact address has not been published yet. In the
                    meantime, use the{' '}
                    <Link
                      href="/contact"
                      className="font-medium text-navy-900 underline underline-offset-2"
                    >
                      contact form
                    </Link>{' '}
                    and mark your message as a data request.
                  </>
                )}
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Cookies</h2>
              <p className="mt-3">
                The public site sets no cookies at all. One cookie is set when a staff
                member signs in to the admin area; it holds a session identifier, is
                marked <code className="font-mono text-sm">httpOnly</code> so scripts
                cannot read it, and is deleted on sign-out. There are no advertising or
                analytics cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl">Changes to this policy</h2>
              <p className="mt-3">
                When this policy is finalised after legal review, this page will be
                updated and the pending-review notice above will be removed.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-ink-200 pt-6">
            <Link
              href="/terms"
              className="text-sm font-medium text-navy-900 underline underline-offset-2"
            >
              Read our terms of service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
