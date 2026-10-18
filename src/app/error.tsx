'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';

/**
 * Global error boundary.
 *
 * Visitors see a plain, actionable message. The error `digest` is shown
 * because it is the only identifier support can correlate with the server log;
 * the message and stack stay server-side.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] unhandled error boundary', { digest: error.digest });
  }, [error.digest]);

  return (
    <div className="container-content flex flex-1 items-center py-20 lg:py-28">
      <div className="max-w-prose">
        <p className="text-sm font-semibold tracking-wide text-danger-700 uppercase">
          Something went wrong
        </p>
        <h1 className="mt-3 text-4xl">We hit an unexpected problem</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          The page could not be displayed. Trying again often resolves it. If you were
          part-way through a form, your details were not submitted — please resend them.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary" size="lg">
            Go to the homepage
          </ButtonLink>
        </div>

        {error.digest ? (
          <p className="mt-8 text-xs text-ink-500">
            Reference for support:{' '}
            <code className="font-mono text-ink-700">{error.digest}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
