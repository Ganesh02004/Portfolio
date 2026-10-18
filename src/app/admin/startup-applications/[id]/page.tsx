import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateStartupAction } from '@/app/admin/actions';
import { AdminShell } from '@/components/admin/admin-shell';
import { HistoryList } from '@/components/admin/history-list';
import { PresentationDownload } from '@/components/admin/presentation-download';
import { TriagePanel } from '@/components/admin/triage-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { requireStaffPage } from '@/lib/auth/require-staff';
import { getStartupApplication, listSubmissionEvents } from '@/lib/db/submissions';
import { formatDateTime } from '@/lib/utils';
import { STARTUP_STATUS_LABELS, STARTUP_STATUSES } from '@/types/domain';

export const dynamic = 'force-dynamic';

const statusOptions = STARTUP_STATUSES.map((status) => ({
  value: status,
  label: STARTUP_STATUS_LABELS[status],
}));

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-ink-800">{children}</dd>
    </div>
  );
}

export default async function StartupApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await requireStaffPage(`/admin/startup-applications/${id}`);

  if (!UUID_PATTERN.test(id)) notFound();

  const application = await getStartupApplication(id);
  if (!application) notFound();

  const events = await listSubmissionEvents('startup_applications', id);

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
              href="/admin/startup-applications"
              className="hover:text-navy-900 hover:underline"
            >
              Applications
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-mono text-xs font-medium text-ink-700" aria-current="page">
            {application.referenceCode}
          </li>
        </ol>
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{application.startupName}</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            {application.ideaTitle} ·{' '}
            <span className="font-mono text-xs">{application.referenceCode}</span>
          </p>
        </div>
        <StatusBadge status={application.status} className="mt-1.5" />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="applicant-heading"
            className="rounded-card border border-ink-200 bg-white p-5"
          >
            <h2 id="applicant-heading" className="text-lg font-semibold text-ink-900">
              Applicant
            </h2>
            <dl className="mt-3 divide-y divide-ink-200">
              <DetailRow label="Name">{application.applicantName}</DetailRow>
              <DetailRow label="Email">
                <a
                  href={`mailto:${application.email}`}
                  className="text-navy-900 underline underline-offset-2"
                >
                  {application.email}
                </a>
              </DetailRow>
              {application.phone ? (
                <DetailRow label="Phone">
                  <a
                    href={`tel:${application.phone.replace(/\s/g, '')}`}
                    className="text-navy-900 underline underline-offset-2"
                  >
                    {application.phone}
                  </a>
                </DetailRow>
              ) : null}
              {application.referralSource ? (
                <DetailRow label="Heard about us via">
                  {application.referralSource}
                </DetailRow>
              ) : null}
            </dl>
          </section>

          <section
            aria-labelledby="idea-heading"
            className="rounded-card border border-ink-200 bg-white p-5"
          >
            <h2 id="idea-heading" className="text-lg font-semibold text-ink-900">
              The idea
            </h2>
            <dl className="mt-3 divide-y divide-ink-200">
              <DetailRow label="Summary">
                <p className="whitespace-pre-wrap">{application.ideaSummary}</p>
              </DetailRow>
              {application.problemStatement ? (
                <DetailRow label="Problem solved">
                  <p className="whitespace-pre-wrap">{application.problemStatement}</p>
                </DetailRow>
              ) : null}
              {application.targetCustomer ? (
                <DetailRow label="Target customers">
                  <p className="whitespace-pre-wrap">{application.targetCustomer}</p>
                </DetailRow>
              ) : null}
              <DetailRow label="Pitch video">
                {/*
                  Protocol was validated on submit, but noopener/noreferrer is
                  still applied so an external page cannot reach back into the
                  admin tab or learn the admin URL from the referrer.
                */}
                <a
                  href={application.pitchVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="break-all text-navy-900 underline underline-offset-2"
                >
                  {application.pitchVideoUrl}
                </a>
                <p className="mt-1 text-xs text-ink-500">
                  Opens an external site submitted by the applicant.
                </p>
              </DetailRow>
            </dl>
          </section>

          <section
            aria-labelledby="record-heading"
            className="rounded-card border border-ink-200 bg-white p-5"
          >
            <h2 id="record-heading" className="text-lg font-semibold text-ink-900">
              Record
            </h2>
            <dl className="mt-3 divide-y divide-ink-200">
              <DetailRow label="Consent given">
                {formatDateTime(application.consentAt)}
              </DetailRow>
              <DetailRow label="Received">
                {formatDateTime(application.createdAt)}
              </DetailRow>
              {application.reviewedAt ? (
                <DetailRow label="Last reviewed">
                  {formatDateTime(application.reviewedAt)}
                </DetailRow>
              ) : null}
            </dl>
          </section>

          <HistoryList events={events} />
        </div>

        <div className="flex flex-col gap-6">
          <PresentationDownload
            applicationId={application.id}
            filename={application.presentationFilename}
            sizeBytes={application.presentationSizeBytes}
            mimeType={application.presentationMimeType}
          />

          <TriagePanel
            recordId={application.id}
            currentStatus={application.status}
            currentNotes={application.internalNotes}
            statusOptions={statusOptions}
            action={updateStartupAction}
          />
        </div>
      </div>
    </AdminShell>
  );
}
