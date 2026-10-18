import Link from 'next/link';
import { footerNav } from '@/config/navigation';
import { confirmedContactChannels, siteConfig } from '@/config/site';
import { Logo } from '@/components/layout/logo';

export function SiteFooter() {
  const contactChannels = confirmedContactChannels();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-ink-200 bg-ink-50">
      <div className="container-content py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="size-8" />
              <span className="text-[0.9375rem] font-semibold tracking-tight text-navy-900">
                {siteConfig.name}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
              {siteConfig.tagline}.
            </p>

            {contactChannels.length > 0 ? (
              <dl className="mt-5 space-y-1.5 text-sm">
                {contactChannels.map((channel) => (
                  <div key={channel.label} className="flex gap-2">
                    <dt className="font-medium text-ink-700">{channel.label}:</dt>
                    <dd className="text-ink-600">{channel.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-5 text-sm text-ink-500">
                Contact details are published once the organization confirms them. Use the{' '}
                <Link
                  href="/contact"
                  className="font-medium text-navy-900 underline underline-offset-2"
                >
                  contact form
                </Link>{' '}
                to reach us in the meantime.
              </p>
            )}
          </div>

          <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
            {footerNav.map((group) => (
              <div key={group.heading}>
                <h2 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                  {group.heading}
                </h2>
                <ul className="mt-3 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-700 underline-offset-2 hover:text-navy-900 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            &copy; {year} {siteConfig.legal.entityName ?? siteConfig.name}. All rights
            reserved.
          </p>
          <p className="text-xs text-ink-500">
            We do not guarantee employment, funding, or marketplace approval.
          </p>
        </div>
      </div>
    </footer>
  );
}
