import { ButtonLink } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section
      className="border-t border-ink-200 bg-navy-900"
      aria-labelledby="cta-heading"
    >
      <div className="container-content py-14 lg:py-20">
        <div className="max-w-2xl">
          <h2 id="cta-heading" className="text-3xl text-white">
            Not sure which service fits?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-navy-100">
            Describe what you are trying to do and we will point you to the right place —
            or tell you plainly if we are not the right fit.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/contact"
              size="lg"
              className="bg-white text-navy-900 hover:bg-navy-50"
            >
              Send us a message
            </ButtonLink>
            <ButtonLink
              href="/services"
              size="lg"
              variant="ghost"
              className="border border-navy-400 text-white hover:bg-navy-800"
            >
              Compare all services
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
