import { howItWorks } from '@/config/services';

/**
 * Process explainer. Rendered as an ordered list because the steps genuinely
 * happen in sequence — the numbering is content, not decoration.
 */
export function HowItWorks() {
  return (
    <section
      className="border-y border-ink-200 bg-ink-50 section-y"
      aria-labelledby="how-heading"
    >
      <div className="container-content">
        <div className="max-w-2xl">
          <h2 id="how-heading" className="text-3xl">
            How it works
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            The same four steps apply to every service, whether you are enquiring about
            training or submitting a startup idea.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((item) => (
            <li key={item.step} className="relative">
              <span
                className="inline-flex size-9 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white"
                aria-hidden="true"
              >
                {item.step}
              </span>
              <h3 className="mt-3 text-base font-semibold text-ink-900">
                <span className="sr-only">Step {item.step}: </span>
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
