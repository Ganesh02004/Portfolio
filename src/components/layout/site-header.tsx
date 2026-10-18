import Link from 'next/link';
import { primaryCta, primaryNav, serviceNav } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Logo } from '@/components/layout/logo';

/**
 * Site header.
 *
 * The desktop services menu is a CSS/details-free hover-and-focus group: the
 * trigger is a real link to /services, so the menu is never the only way to
 * reach a service page and keyboard users are not forced through a popup.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur-sm">
      <div className="container-content flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md"
          aria-label={`${siteConfig.name} — home`}
        >
          <Logo className="size-8 shrink-0" />
          <span className="text-[0.9375rem] leading-tight font-semibold tracking-tight text-navy-900">
            {siteConfig.name}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <div className="group relative">
            <Link
              href="/services"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-900"
            >
              Services
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-3.5 fill-current text-ink-400"
              >
                <path d="M8 11 3.5 6.5 4.56 5.44 8 8.88l3.44-3.44L12.5 6.5 8 11Z" />
              </svg>
            </Link>

            <div className="invisible absolute top-full left-0 w-80 pt-2 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <ul className="rounded-card border border-ink-200 bg-white p-2 shadow-raised">
                {serviceNav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-lg px-3 py-2.5 hover:bg-ink-50"
                    >
                      <span className="block text-sm font-semibold text-ink-900">
                        {link.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                        {link.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {primaryNav
            .filter((link) => link.label !== 'Services')
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-900"
              >
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={primaryCta.href}
            className="hidden rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 lg:inline-flex"
          >
            {primaryCta.label}
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
