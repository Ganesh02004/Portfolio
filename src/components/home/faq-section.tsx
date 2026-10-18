import { faqs } from '@/config/services';

/**
 * FAQ built on native <details>/<summary>.
 *
 * Disclosure behaviour, keyboard operation and the expanded state are all
 * provided by the browser, so there is no JavaScript to get wrong and nothing
 * breaks if the bundle fails to load.
 */
export function FaqSection() {
  return (
    <section className="section-y" aria-labelledby="faq-heading">
      <div className="container-content">
        <div className="max-w-2xl">
          <h2 id="faq-heading" className="text-3xl">
            Common questions
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            Answers to what people ask most often. Anything that depends on pricing or
            policy is confirmed with you directly before work begins.
          </p>
        </div>

        <div className="mt-8 max-w-prose divide-y divide-ink-200 border-y border-ink-200">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                {faq.question}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="mt-1 size-4 shrink-0 fill-ink-400 transition-transform group-open:rotate-45"
                >
                  <path d="M7.25 2.75h1.5v4.5h4.5v1.5h-4.5v4.5h-1.5v-4.5h-4.5v-1.5h4.5v-4.5Z" />
                </svg>
              </summary>
              <p className="mt-2.5 pr-8 text-sm leading-relaxed text-ink-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
