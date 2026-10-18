import { ButtonLink } from '@/components/ui/button';
import { siteConfig } from '@/config/site';

/**
 * Homepage hero.
 *
 * Deliberately restrained: one headline, one supporting paragraph, two clearly
 * differentiated calls to action. No statistics, client counts or outcome
 * claims appear, because none have been substantiated.
 */
export function HeroSection() {
  return (
    <section className="border-b border-ink-200 bg-gradient-to-b from-navy-50 to-white">
      <div className="container-content py-16 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-wide text-teal-700 uppercase">
            Four services, one team
          </p>

          <h1 className="mt-4 text-4xl text-balance lg:text-5xl">
            Practical support for careers, ideas and growing businesses
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
            {siteConfig.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/services" size="lg">
              Explore our services
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Talk to our team
            </ButtonLink>
          </div>

          <p className="mt-6 text-sm text-ink-500">
            No account needed. Every inquiry is read by a member of our team.
          </p>
        </div>
      </div>
    </section>
  );
}
