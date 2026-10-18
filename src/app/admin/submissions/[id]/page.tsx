import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateSubmissionAction } from '@/app/admin/actions';
import { AdminShell } from '@/components/admin/admin-shell';
import { HistoryList } from '@/components/admin/history-list';
import { TriagePanel } from '@/components/admin/triage-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { requireStaffPage } from '@/lib/auth/require-staff';
import { getServiceSubmission, listSubmissionEvents } from '@/lib/db/submissions';
import { formatDateTime } from '@/lib/utils';
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUSES,
  SUBMISSION_TYPE_LABELS,
} from '@/types/domain';

export const dynamic = 'force-dynamic';

const statusOptions = SUBMISSION_STATUSES.map((status) => ({
  value: status,
  label: SUBMISSION_STATUS_LABELS[status],
}));

/** A UUID is required; anything else is a 404 rather than a database error. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-ink-800">{children}</dd>
    </div>
  );
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await requireStaffPage(`/admin/submissions/${id}`);

  if (!UUID_PATTERN.test(id)) notFound();

  const submission = await getServiceSubmission(id);
  if (!submission) notFound();

  const events = await listSubmissionEvents('service_submissions', id);

  return (
    <AdminShell staff={staff}>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-ink-500">
          <li>
            <Link href="/admin" className="hover:text-navy-900 hover:underline">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/admin/submissions"
              className="hover:text-navy-900 hover:underline"
            >
              Inquiries
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-mono text-xs font-medium text-ink-700" aria-current="page">
            {submission.referenceCode}
          </li>
        </ol>
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{submission.fullName}</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            {SUBMISSION_TYPE_LABELS[submission.submissionType]} inquiry ·{' '}
            <span className="font-mono text-xs">{submission.referenceCode}</span>
          </p>
        </div>
        <StatusBadge status={submission.status} className="mt-1.5" />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="details-heading"
            className="rounded-card border border-ink-200 bg-white p-5"
          >
            <h2 id="details-heading" className="text-lg font-semibold text-ink-900">
              Submitted details
            </h2>

            <dl className="mt-3 divide-y divide-ink-200">
              <DetailRow label="Email">
                <a
                  href={`mailto:${submission.email}`}
                  className="text-navy-900 underline underline-offset-2"
                >
                  {submission.email}
                </a>
              </DetailRow>

              {submission.phone ? (
                <DetailRow label="Phone">
                  <a
                    href={`tel:${submission.phone.replace(/\s/g, '')}`}
                    className="text-navy-900 underline underline-offset-2"
                  >
                    {submission.phone}
                  </a>
                </DetailRow>
              ) : null}

              {submission.businessName ? (
                <DetailRow label="Business">{submission.businessName}</DetailRow>
              ) : null}

              {submission.selectedOption ? (
                <DetailRow label="Selected option">{submission.selectedOption}</DetailRow>
              ) : null}

              {submission.message ? (
                <DetailRow label="Message">
                  {/* Rendered as text, never as HTML. */}
                  <p className="whitespace-pre-wrap">{submission.message}</p>
                </DetailRow>
              ) : null}

              {submission.sourcePage ? (
                <DetailRow label="Submitted from">{submission.sourcePage}</DetailRow>
              ) : null}

              <DetailRow label="Consent given">
                {formatDateTime(submission.consentAt)}
              </DetailRow>

              <DetailRow label="Received">
                {formatDateTime(submission.createdAt)}
              </DetailRow>

              <DetailRow label="Last updated">
                {formatDateTime(submission.updatedAt)}
              </DetailRow>
            </dl>
          </section>

          <HistoryList events={events} />
        </div>

        <div className="flex flex-col gap-6">
          <TriagePanel
            recordId={submission.id}
            currentStatus={submission.status}
            currentNotes={submission.internalNotes}
            statusOptions={statusOptions}
            action={updateSubmissionAction}
          />
        </div>
      </div>
    </AdminShell>
  );
}
