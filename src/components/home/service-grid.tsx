import { ServiceCard } from '@/components/services/service-card';
import { services } from '@/config/services';

export function ServiceGrid({
  heading = 'What we do',
  description,
}: {
  heading?: string;
  description?: string;
}) {
  return (
    <section className="section-y" aria-labelledby="services-heading">
      <div className="container-content">
        <div className="max-w-2xl">
          <h2 id="services-heading" className="text-3xl">
            {heading}
          </h2>
          {description ? (
            <p className="mt-3 text-base leading-relaxed text-ink-600">{description}</p>
          ) : null}
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:gap-6">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </ul>
      </div>
    </section>
  );
}
