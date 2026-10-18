import type { Metadata } from 'next';
import { ContactForm } from '@/components/forms/contact-form';
import { Callout } from '@/components/ui/callout';
import { confirmedContactChannels, siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Send us a message about training, startup support, marketing or digitalization. We reply to the email address you provide.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const channels = confirmedContactChannels();

  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-navy-50 to-white">
        <div className="container-content py-12 lg:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl text-balance">Get in touch</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">
              Tell us what you are trying to do. If we are not the right fit, we will say
              so rather than waste your time.
            </p>
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-content">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl">How to reach us</h2>
                {channels.length > 0 ? (
                  <dl className="mt-4 space-y-4">
                    {channels.map((channel) => (
                      <div key={channel.label}>
                        <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                          {channel.label}
                        </dt>
                        <dd className="mt-1 text-base text-ink-800">{channel.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <Callout
                    tone="pending"
                    title="Direct contact details pending"
                    className="mt-4"
                  >
                    Our phone number, email address and office details are not published
                    yet. The form is the fastest way to reach us and every message is read
                    by a member of the team.
                  </Callout>
                )}
              </div>

              <Callout tone="info" title="What happens next">
                We review your message and reply to the email address you give us. If your
                request relates to a specific service, it helps to say which one.
              </Callout>

              <Callout tone="success" title="Your details">
                We use what you send only to respond to this inquiry. We do not sell or
                share it.{' '}
                {siteConfig.legal.dataRetentionPeriod
                  ? `Submissions are kept for ${siteConfig.legal.dataRetentionPeriod}.`
                  : 'Our retention period is being finalised and will be published in the privacy policy.'}
              </Callout>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
