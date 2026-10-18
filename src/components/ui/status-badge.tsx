import { cn } from '@/lib/utils';
import {
  STARTUP_STATUS_LABELS,
  SUBMISSION_STATUS_LABELS,
  type StartupStatus,
  type SubmissionStatus,
} from '@/types/domain';

/**
 * Status badge.
 *
 * Each status renders its own label text, so the state is readable without
 * relying on the colour. Colour reinforces the grouping; it never carries the
 * meaning on its own.
 */

type AnyStatus = SubmissionStatus | StartupStatus;

const palette: Record<AnyStatus, string> = {
  RECEIVED: 'border-navy-200 bg-navy-50 text-navy-900',
  UNDER_REVIEW: 'border-warning-200 bg-warning-50 text-warning-900',
  NEEDS_INFORMATION: 'border-warning-200 bg-warning-50 text-warning-900',
  SHORTLISTED: 'border-success-200 bg-success-50 text-success-900',
  CONTACTED: 'border-teal-200 bg-teal-50 text-teal-900',
  NOT_SELECTED: 'border-ink-300 bg-ink-100 text-ink-700',
  CLOSED: 'border-ink-300 bg-ink-100 text-ink-700',
};

function labelFor(status: AnyStatus): string {
  if (status in SUBMISSION_STATUS_LABELS) {
    return SUBMISSION_STATUS_LABELS[status as SubmissionStatus];
  }
  return STARTUP_STATUS_LABELS[status as StartupStatus];
}

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        palette[status],
        className,
      )}
    >
      {labelFor(status)}
    </span>
  );
}
