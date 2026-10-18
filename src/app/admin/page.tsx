import Link from 'next/link';
import { AdminShell } from '@/components/admin/admin-shell';
import { Callout } from '@/components/ui/callout';
import { StatusBadge } from '@/components/ui/status-badge';
import { requireStaffPage } from '@/lib/auth/require-staff';
import {
  getDashboardCounts,
  listServiceSubmissions,
  listStartupApplications,
} from '@/lib/db/submissions';
import { formatDateTime } from '@/lib/utils';
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
  STARTUP_STATUS_LABELS,
  type StartupStatus,
  type SubmissionStatus,
  type SubmissionType,
} from '@/types/domain';

export const dynamic = 'force-dynamic';

/** Statuses that represent work still needing attention. */
const OPEN_SUBMISSION_STATUSES: SubmissionStatus[] = [
  'RECEIVED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
];
const OPEN_STARTUP_STATUSES: StartupStatus[] = [
  'RECEIVED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
];

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-5">
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-ink-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const staff = await requireStaffPage('/admin');

  const [counts, recentSubmissions, recentStartups] = await Promise.all([
    getDashboardCounts(),
    listServiceSubmissions({ pageSize: 5 }),
    listStartupApplications({ pageSize: 5 }),
  ]);

  const openSubmissions = OPEN_SUBMISSION_STATUSES.reduce(
    (total, status) => total + (counts.submissionsByStatus[status] ?? 0),
    0,
  );
  const openStartups = OPEN_STARTUP_STATUSES.reduce(
    (total, status) => total + (counts.startupsByStatus[status] ?? 0),
    0,
  );

  return (
    <AdminShell staff={staff}>
      <h1 className="text-3xl">Dashboard</h1>
      <p className="mt-2 text-sm text-ink-600">
        Signed in as {staff.email}. Everything here is restricted to staff accounts.
      </p>

      {counts.failedEmailsLast7Days > 0 ? (
        <div className="mt-6">
          <Callout tone="danger" title="Email delivery failures">
            {counts.failedEmailsLast7Days} notification
            {counts.failedEmailsLast7Days === 1 ? '' : 's'} failed to send in the last 7
            days. The submissions themselves were saved — check the SMTP configuration,
            then follow up with those applicants directly.
          </Callout>
        </div>
      ) : null}

      <section className="mt-7" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Summary counts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Open inquiries"
            value={openSubmissions}
            hint="Received, under review or awaiting information"
          />
          <StatTile
            label="Open applications"
            value={openStartups}
            hint="Startup submissions not yet decided"
          />
          <StatTile label="Total inquiries" value={counts.totalSubmissions} />
          <StatTile label="Total applications" value={counts.totalStartups} />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="by-status-heading">
          <h2 id="by-status-heading" className="text-lg font-semibold text-ink-900">
            Inquiries by status
          </h2>
          <div className="mt-3 overflow-hidden rounded-card border border-ink-200 bg-white">
            <table className="w-full text-sm">
              <caption className="sr-only">Count of inquiries in each status</caption>
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left">
                  <th scope="col" className="px-4 py-2.5 font-semibold text-ink-700">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right font-semibold text-ink-700"
                  >
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {(Object.keys(SUBMISSION_STATUS_LABELS) as SubmissionStatus[]).map(
                  (status) => (
                    <tr key={status}>
                      <th scope="row" className="px-4 py-2.5 text-left font-normal">
                        <StatusBadge status={status} />
                      </th>
                      <td className="px-4 py-2.5 text-right text-ink-800 tabular-nums">
                        {counts.submissionsByStatus[status] ?? 0}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mt-6 text-lg font-semibold text-ink-900">
            Inquiries by service
          </h2>
          <div className="mt-3 overflow-hidden rounded-card border border-ink-200 bg-white">
            <table className="w-full text-sm">
              <caption className="sr-only">Count of inquiries per service</caption>
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left">
                  <th scope="col" className="px-4 py-2.5 font-semibold text-ink-700">
                    Service
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right font-semibold text-ink-700"
                  >
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {(Object.keys(SUBMISSION_TYPE_LABELS) as SubmissionType[]).map((type) => (
                  <tr key={type}>
                    <th
                      scope="row"
                      className="px-4 py-2.5 text-left font-normal text-ink-800"
                    >
                      {SUBMISSION_TYPE_LABELS[type]}
                    </th>
                    <td className="px-4 py-2.5 text-right text-ink-800 tabular-nums">
                      {counts.submissionsByType[type] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="startup-status-heading">
          <h2 id="startup-status-heading" className="text-lg font-semibold text-ink-900">
            Startup applications by status
          </h2>
          <div className="mt-3 overflow-hidden rounded-card border border-ink-200 bg-white">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Count of startup applications in each status
              </caption>
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left">
                  <th scope="col" className="px-4 py-2.5 font-semibold text-ink-700">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right font-semibold text-ink-700"
                  >
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {(Object.keys(STARTUP_STATUS_LABELS) as StartupStatus[]).map((status) => (
                  <tr key={status}>
                    <th scope="row" className="px-4 py-2.5 text-left font-normal">
                      <StatusBadge status={status} />
                    </th>
                    <td className="px-4 py-2.5 text-right text-ink-800 tabular-nums">
                      {counts.startupsByStatus[status] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-inquiries-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id="recent-inquiries-heading"
              className="text-lg font-semibold text-ink-900"
            >
              Recent inquiries
            </h2>
            <Link
              href="/admin/submissions"
              className="text-sm font-medium text-navy-900 underline underline-offset-2"
            >
              View all
            </Link>
          </div>

          <ul className="mt-3 divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
            {recentSubmissions.items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-ink-500">No inquiries yet.</li>
            ) : (
              recentSubmissions.items.map((submission) => (
                <li key={submission.id}>
                  <Link
                    href={`/admin/submissions/${submission.id}`}
                    className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-ink-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {submission.fullName}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {SUBMISSION_TYPE_LABELS[submission.submissionType]} ·{' '}
                        {formatDateTime(submission.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={submission.status} />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section aria-labelledby="recent-startups-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id="recent-startups-heading"
              className="text-lg font-semibold text-ink-900"
            >
              Recent applications
            </h2>
            <Link
              href="/admin/startup-applications"
              className="text-sm font-medium text-navy-900 underline underline-offset-2"
            >
              View all
            </Link>
          </div>

          <ul className="mt-3 divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
            {recentStartups.items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-ink-500">No applications yet.</li>
            ) : (
              recentStartups.items.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/admin/startup-applications/${application.id}`}
                    className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-ink-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {application.startupName}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {application.applicantName} ·{' '}
                        {formatDateTime(application.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={application.status} />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
