'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { siteConfig } from '@/config/site';
import type { SubmitState } from '@/components/forms/use-inquiry-submit';

/**
 * Consistent chrome for every public form: heading, consent copy, error
 * region and submit control.
 *
 * The error region is a live region placed above the submit button, so a
 * screen reader announces a failed submission without the user having to hunt
 * for it, and a sighted user sees it next to the control they just pressed.
 */

export interface FormShellProps {
  id: string;
  title: string;
  description: string;
  state: SubmitState;
  isSubmitting: boolean;
  submitLabel: string;
  children: ReactNode;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}

export function FormShell({
  id,
  title,
  description,
  state,
  isSubmitting,
  submitLabel,
  children,
  onSubmit,
}: FormShellProps) {
  return (
    <section id={id} className="scroll-mt-20" aria-labelledby={`${id}-heading`}>
      <div className="rounded-card border border-ink-200 bg-white p-6 shadow-card sm:p-8">
        <h2 id={`${id}-heading`} className="text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{description}</p>

        <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-5">
          {children}

          <div aria-live="polite" aria-atomic="true">
            {state.status === 'error' ? (
              <Callout tone="danger" title="Not submitted">
                {state.message}
              </Callout>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" disabled={isSubmitting} className="sm:w-auto">
              {isSubmitting ? (
                <>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="size-4 animate-spin fill-none stroke-current stroke-2"
                  >
                    <circle cx="8" cy="8" r="6" className="opacity-25" />
                    <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
                  </svg>
                  Sending…
                </>
              ) : (
                submitLabel
              )}
            </Button>
            <p className="text-xs leading-relaxed text-ink-500">
              We use your details only to respond to this request. See our{' '}
              <a
                href="/privacy"
                className="font-medium text-navy-900 underline underline-offset-2"
              >
                privacy policy
              </a>
              .
            </p>
          </div>
        </form>
      </div>

      {siteConfig.hasUnconfirmedContent ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Submitting this form starts a conversation. It does not create a contract, and
          no pricing shown on this site is final until we confirm it with you in writing.
        </p>
      ) : null}
    </section>
  );
}
