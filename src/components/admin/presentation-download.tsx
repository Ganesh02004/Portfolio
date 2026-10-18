'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  requestPresentationLinkAction,
  type DownloadLinkResult,
} from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { formatFileSize } from '@/lib/utils';

/**
 * Private presentation download.
 *
 * No URL is rendered into the page until a staff member explicitly asks for
 * one, and the link that comes back expires within minutes. The object key is
 * never present in the markup — the action looks it up server-side from the
 * application id — so the bucket layout is not exposed to the browser.
 */

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? 'Preparing…' : 'Get download link'}
    </Button>
  );
}

export function PresentationDownload({
  applicationId,
  filename,
  sizeBytes,
  mimeType,
}: {
  applicationId: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}) {
  const [state, formAction] = useActionState<DownloadLinkResult | null, FormData>(
    requestPresentationLinkAction,
    null,
  );

  return (
    <section
      aria-labelledby="presentation-heading"
      className="rounded-card border border-ink-200 bg-white p-5"
    >
      <h2 id="presentation-heading" className="text-lg font-semibold text-ink-900">
        Presentation
      </h2>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="text-ink-500">File:</dt>
          <dd className="min-w-0 break-all text-ink-800">{filename}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-500">Size:</dt>
          <dd className="text-ink-800">{formatFileSize(sizeBytes)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-500">Type:</dt>
          <dd className="min-w-0 break-all text-ink-800">{mimeType}</dd>
        </div>
      </dl>

      <form action={formAction} className="mt-4">
        <input type="hidden" name="applicationId" value={applicationId} />
        <RequestButton />
      </form>

      <div aria-live="polite" aria-atomic="true" className="mt-3">
        {state?.ok && state.url ? (
          <Callout tone="success" title="Link ready">
            <a
              href={state.url}
              className="font-semibold text-success-900 underline underline-offset-2"
              rel="noopener noreferrer"
            >
              Download {filename}
            </a>
            <p className="mt-1.5 text-success-900">
              This link expires in{' '}
              {state.expiresInSeconds ? Math.round(state.expiresInSeconds / 60) : 5}{' '}
              minutes and should not be forwarded.
            </p>
          </Callout>
        ) : null}

        {state && !state.ok ? (
          <Callout tone="danger" title="Could not create a link">
            {state.message}
          </Callout>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        Files are stored privately and are not reachable without a signed link. Treat the
        contents as confidential to the review team.
      </p>
    </section>
  );
}
