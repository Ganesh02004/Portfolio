import Link from 'next/link';
import { AdminShell } from '@/components/admin/admin-shell';
import { Pagination } from '@/components/admin/pagination';
import { SubmissionFilters } from '@/components/admin/submission-filters';
import { StatusBadge } from '@/components/ui/status-badge';
import { requireStaffPage } from '@/lib/auth/require-staff';
import { listStartupApplications } from '@/lib/db/submissions';
import { formatDateTime } from '@/lib/utils';
import {
  STARTUP_STATUS_LABELS,
  STARTUP_STATUSES,
  type StartupStatus,
} from '@/types/domain';

export const dynamic = 'force-dynamic';

const statusOptions = STARTUP_STATUSES.map((status) => ({
  value: status,
  label: STARTUP_STATUS_LABELS[status],
}));

function parseStatus(value: string | undefined): StartupStatus | undefined {
  return value && (STARTUP_STATUSES as readonly string[]).includes(value)
    ? (value as StartupStatus)
    : undefined;
}

export default async function AdminStartupApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaffPage('/admin/startup-applications');
  const params = await searchParams;

  const single = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === 'string' ? value : undefined;
  };

  const page = Number.parseInt(single('page') ?? '1', 10);
  const search = single('q');
  const status = parseStatus(single('status'));

  const result = await listStartupApplications({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });

  return (
    <AdminShell staff={staff}>
      <h1 className="text-3xl">Startup applications</h1>
      <p className="mt-2 text-sm text-ink-600">
        Idea submissions with presentations and pitch video links.
      </p>

      <div className="mt-6">
        <SubmissionFilters
          basePath="/admin/startup-applications"
          statusOptions={statusOptions}
          searchPlaceholder="Applicant, startup, email or reference"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-ink-200 bg-white">
        <table className="w-full min-w-[46rem] text-sm">
          <caption className="sr-only">
            Startup applications, most recent first. {result.total} in total.
          </caption>
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left">
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                Reference
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                Startup
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                Applicant
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                Received
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-500">
                  No applications match these filters.
                </td>
              </tr>
            ) : (
              result.items.map((application) => (
                <tr key={application.id} className="hover:bg-ink-50">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <Link
                      href={`/admin/startup-applications/${application.id}`}
                      className="font-mono text-xs font-semibold text-navy-900 underline underline-offset-2"
                    >
                      {application.referenceCode}
                    </Link>
                  </th>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-ink-900">
                      {application.startupName}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {application.ideaTitle}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-ink-800">
                      {application.applicantName}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {application.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                    {formatDateTime(application.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/admin/startup-applications"
        searchParams={{ q: search, status }}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
      />
    </AdminShell>
  );
}
