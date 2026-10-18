import Link from 'next/link';
import { ServiceIcon } from '@/components/ui/service-icon';
import type { ServiceDefinition } from '@/config/services';

/**
 * Service card.
 *
 * The whole card is one link, with the heading providing the accessible name,
 * so there is a single tab stop per card rather than several overlapping ones.
 */
export function ServiceCard({ service }: { service: ServiceDefinition }) {
  return (
    <li className="group relative flex">
      <div className="flex flex-col rounded-card border border-ink-200 bg-white p-6 shadow-card transition-shadow group-hover:shadow-raised">
        <span className="inline-flex size-11 items-center justify-center rounded-lg bg-navy-50 text-navy-900">
          <ServiceIcon name={service.icon} />
        </span>

        <h3 className="mt-4 text-xl">
          <Link href={service.href} className="before:absolute before:inset-0">
            {service.title}
          </Link>
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-ink-600">{service.summary}</p>

        <ul className="mt-4 space-y-1.5">
          {service.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2 text-sm text-ink-700">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="mt-1 size-3.5 shrink-0 fill-teal-600"
              >
                <path d="M6.2 11.6 3 8.4l1.1-1.1 2.1 2.1 5.7-5.7L13 4.8l-6.8 6.8Z" />
              </svg>
              {highlight}
            </li>
          ))}
        </ul>

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900">
          {service.ctaLabel}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5 fill-current transition-transform group-hover:translate-x-0.5"
          >
            <path d="m9 3 5 5-5 5-1.06-1.06L11.38 8.75H2v-1.5h9.38L7.94 4.06 9 3Z" />
          </svg>
        </span>
      </div>
    </li>
  );
}
