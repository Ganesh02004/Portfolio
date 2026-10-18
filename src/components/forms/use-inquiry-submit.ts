'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * Shared submit behaviour for the four inquiry forms.
 *
 * Responsibilities:
 *   - POST the payload and interpret the server response.
 *   - Surface server-side field errors back onto the form, so the server stays
 *     the authority on validation even though the client validated first.
 *   - Distinguish a rate-limited response from a genuine failure, because the
 *     two need different advice.
 *   - Navigate to /thank-you on success, carrying only the reference code —
 *     never the submitted details — in the URL.
 */

export type SubmitState =
  { status: 'idle' } | { status: 'submitting' } | { status: 'error'; message: string };

export interface SubmitOutcome {
  ok: boolean;
  /** Field-level errors returned by the server, keyed by field name. */
  fieldErrors?: Record<string, string>;
}

interface UseInquirySubmitOptions {
  endpoint: string;
  /** Appended to /thank-you so the confirmation can name the service. */
  thankYouKind: string;
}

export function useInquirySubmit({ endpoint, thankYouKind }: UseInquirySubmitOptions) {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ status: 'idle' });

  const submit = useCallback(
    async (payload: unknown): Promise<SubmitOutcome> => {
      setState({ status: 'submitting' });

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        setState({
          status: 'error',
          message:
            'We could not reach the server. Check your connection and try again — nothing was submitted.',
        });
        return { ok: false };
      }

      if (response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const referenceCode =
          body && typeof body === 'object' && 'referenceCode' in body
            ? String((body as { referenceCode: unknown }).referenceCode)
            : '';

        const params = new URLSearchParams({ kind: thankYouKind });
        if (referenceCode) params.set('ref', referenceCode);
        router.push(`/thank-you?${params.toString()}`);
        return { ok: true };
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') ?? '0');
        const minutes = retryAfter > 0 ? Math.ceil(retryAfter / 60) : null;
        setState({
          status: 'error',
          message: minutes
            ? `Too many submissions from your connection. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
            : 'Too many submissions from your connection. Please try again shortly.',
        });
        return { ok: false };
      }

      const body: unknown = await response.json().catch(() => null);

      if (response.status === 400 && body && typeof body === 'object') {
        const fieldErrors = (body as { fieldErrors?: Record<string, string> })
          .fieldErrors;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          setState({
            status: 'error',
            message: 'Please correct the highlighted fields and submit again.',
          });
          return { ok: false, fieldErrors };
        }
      }

      setState({
        status: 'error',
        message:
          'Something went wrong on our side and your details were not saved. Please try again in a moment.',
      });
      return { ok: false };
    },
    [endpoint, router, thankYouKind],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, submit, reset, isSubmitting: state.status === 'submitting' };
}
