import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { ServiceIcon } from '@/components/ui/service-icon';
import type { ServiceDefinition } from '@/config/services';

/**
 * Shared hero for the four service pages, including the breadcrumb trail so a
 * visitor arriving from search knows where they are in the site.
 */
export function ServicePageHeader({ service }: { service: ServiceDefinition }) {
  return (
    <section className="border-b border-ink-200 bg-gradient-to-b from-navy-50 to-white">
      <div className="container-content py-12 lg:py-16">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
            <li>
              <Link href="/" className="hover:text-navy-900 hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/services" className="hover:text-navy-900 hover:underline">
                Services
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-ink-700" aria-current="page">
              {service.name}
            </li>
          </ol>
        </nav>

        <div className="mt-6 max-w-3xl">
          <span className="inline-flex size-12 items-center justify-center rounded-lg bg-navy-900 text-white">
            <ServiceIcon name={service.icon} className="size-6" />
          </span>

          <h1 className="mt-5 text-4xl text-balance">{service.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
            {service.summary}
          </p>

          <div className="mt-7">
            <ButtonLink href={service.ctaHref} size="lg">
              {service.ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the outstanding business decisions for a service.
 *
 * Showing this is a deliberate honesty measure: rather than filling the page
 * with invented specifics, the site states plainly what has not been decided.
 * Remove a bullet from src/config/services.ts once the business confirms it.
 */
export function PendingConfirmationList({ service }: { service: ServiceDefinition }) {
  if (service.pendingConfirmation.length === 0) return null;

  return (
    <div className="rounded-card border border-warning-200 bg-warning-50 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-warning-900">
        Details we confirm with you directly
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-warning-900">
        These are not published yet because they are being finalised. Ask us and we will
        give you the current position in writing.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {service.pendingConfirmation.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-warning-900">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="mt-1 size-3 shrink-0 fill-warning-700"
            >
              <circle cx="8" cy="8" r="4" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
