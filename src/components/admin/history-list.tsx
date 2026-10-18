import { formatDateTime } from '@/lib/utils';
import type { SubmissionEvent } from '@/types/domain';

const EVENT_LABELS: Record<string, string> = {
  STATUS_CHANGED: 'Status changed',
  NOTES_UPDATED: 'Internal notes updated',
};

/** Audit trail for one record. Read-only; events are never edited or removed. */
export function HistoryList({ events }: { events: SubmissionEvent[] }) {
  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-lg font-semibold text-ink-900">
        History
      </h2>

      {events.length === 0 ? (
        <p className="mt-3 rounded-card border border-ink-200 bg-white px-4 py-6 text-sm text-ink-500">
          No changes recorded yet.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
          {events.map((event) => (
            <li key={event.id} className="px-4 py-3">
              <p className="text-sm font-medium text-ink-900">
                {EVENT_LABELS[event.eventType] ?? event.eventType}
                {event.fromStatus && event.toStatus ? (
                  <span className="font-normal text-ink-600">
                    {' '}
                    — {event.fromStatus} to {event.toStatus}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {event.actorName ?? 'Removed account'} · {formatDateTime(event.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
