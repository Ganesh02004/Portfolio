'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import type { ActionResult } from '@/app/admin/actions';

/**
 * Status and internal-notes editor.
 *
 * Built on a server action, so the authorization check happens on the server
 * for every save. The notes field is explicitly labelled as internal, because
 * the one thing that must never happen is a note intended for colleagues
 * reaching the applicant.
 */

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  );
}

export interface TriagePanelProps {
  recordId: string;
  currentStatus: string;
  currentNotes: string | null;
  statusOptions: ReadonlyArray<{ value: string; label: string }>;
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}

export function TriagePanel({
  recordId,
  currentStatus,
  currentNotes,
  statusOptions,
  action,
}: TriagePanelProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const handledState = useRef<ActionResult | null>(null);

  /**
   * Pull the record down again after a successful save, so the status badge
   * and the history list reflect the change without the reviewer having to
   * reload. The action already revalidates the server cache; this is what
   * makes the open page show the result.
   *
   * Guarded on the state object's identity so a re-render cannot trigger a
   * second refresh for the same save.
   */
  useEffect(() => {
    if (!state?.ok || handledState.current === state) return;
    handledState.current = state;
    router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="rounded-card border border-ink-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-ink-900">Triage</h2>
      <p className="mt-1 text-sm text-ink-600">
        Status changes and note edits are recorded in the history below.
      </p>

      <input type="hidden" name="id" value={recordId} />

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label
            htmlFor="triage-status"
            className="block text-sm font-medium text-ink-800"
          >
            Status
          </label>
          {/*
            Keyed on the server value. React leaves an uncontrolled control's
            DOM value alone when only `defaultValue` changes, so without this
            the select would still show the pre-save status after the record
            has been refreshed — telling the reviewer something untrue.
          */}
          <select
            key={currentStatus}
            id="triage-status"
            name="status"
            defaultValue={currentStatus}
            className="mt-1.5 w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm text-ink-900 hover:border-ink-400 focus:border-teal-600"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="triage-notes"
            className="block text-sm font-medium text-ink-800"
          >
            Internal notes
          </label>
          <p id="triage-notes-hint" className="mt-0.5 text-xs text-ink-500">
            Staff only. Never included in any email sent to the applicant.
          </p>
          <textarea
            key={currentNotes ?? ''}
            id="triage-notes"
            name="internalNotes"
            rows={7}
            defaultValue={currentNotes ?? ''}
            aria-describedby="triage-notes-hint"
            className="mt-1.5 w-full resize-y rounded-lg border border-ink-300 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 hover:border-ink-400 focus:border-teal-600"
            placeholder="What was assessed, what was agreed, what happens next…"
          />
        </div>

        <div aria-live="polite" aria-atomic="true">
          {state ? (
            <Callout
              tone={state.ok ? 'success' : 'danger'}
              title={state.ok ? 'Saved' : 'Not saved'}
            >
              {state.message}
            </Callout>
          ) : null}
        </div>

        <SaveButton />
      </div>
    </form>
  );
}
