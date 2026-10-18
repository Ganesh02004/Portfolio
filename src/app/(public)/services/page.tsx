import type { Metadata } from 'next';
import { CtaSection } from '@/components/home/cta-section';
import { HowItWorks } from '@/components/home/how-it-works';
import { ServiceCard } from '@/components/services/service-card';
import { services } from '@/config/services';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Four services: IT training and placement support, startup support, marketing support, and business digitalization and e-commerce.',
  alternates: { canonical: '/services' },
};

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-navy-50 to-white">
        <div className="container-content py-12 lg:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl text-balance">Our services</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">
              Each service has its own process and its own form. Read what is included,
              then send us the details — a member of our team reviews every submission.
            </p>
          </div>
        </div>
      </section>

      <section className="section-y" aria-labelledby="service-list-heading">
        <div className="container-content">
          <h2 id="service-list-heading" className="sr-only">
            All services
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </ul>
        </div>
      </section>

      <HowItWorks />
      <CtaSection />
    </>
  );
}
