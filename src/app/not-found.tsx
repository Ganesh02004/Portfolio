import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { services } from '@/config/services';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="container-content flex flex-1 items-center py-20 lg:py-28">
      <div className="max-w-prose">
        <p className="text-sm font-semibold tracking-wide text-teal-700 uppercase">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl">We could not find that page</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          The link may be out of date, or the page may have moved. Nothing you submitted
          has been lost.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            Go to the homepage
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary" size="lg">
            Contact us
          </ButtonLink>
        </div>

        <h2 className="mt-12 text-sm font-semibold tracking-wide text-ink-500 uppercase">
          Our services
        </h2>
        <ul className="mt-3 space-y-2">
          {services.map((service) => (
            <li key={service.slug}>
              <a
                href={service.href}
                className="text-base font-medium text-navy-900 underline underline-offset-2 hover:text-navy-700"
              >
                {service.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
