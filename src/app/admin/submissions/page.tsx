import Link from 'next/link';
import { AdminShell } from '@/components/admin/admin-shell';
import { Pagination } from '@/components/admin/pagination';
import { SubmissionFilters } from '@/components/admin/submission-filters';
import { StatusBadge } from '@/components/ui/status-badge';
import { requireStaffPage } from '@/lib/auth/require-staff';
import { listServiceSubmissions } from '@/lib/db/submissions';
import { formatDateTime } from '@/lib/utils';
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUSES,
  SUBMISSION_TYPE_LABELS,
  SUBMISSION_TYPES,
  type SubmissionStatus,
  type SubmissionType,
} from '@/types/domain';

export const dynamic = 'force-dynamic';

const statusOptions = SUBMISSION_STATUSES.map((status) => ({
  value: status,
  label: SUBMISSION_STATUS_LABELS[status],
}));

const typeOptions = SUBMISSION_TYPES.map((type) => ({
  value: type,
  label: SUBMISSION_TYPE_LABELS[type],
}));

/** Query-string values are untrusted; only known enum members are accepted. */
function parseStatus(value: string | undefined): SubmissionStatus | undefined {
  return value && (SUBMISSION_STATUSES as readonly string[]).includes(value)
    ? (value as SubmissionStatus)
    : undefined;
}

function parseType(value: string | undefined): SubmissionType | undefined {
  return value && (SUBMISSION_TYPES as readonly string[]).includes(value)
    ? (value as SubmissionType)
    : undefined;
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaffPage('/admin/submissions');
  const params = await searchParams;

  const single = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === 'string' ? value : undefined;
  };

  const page = Number.parseInt(single('page') ?? '1', 10);
  const search = single('q');
  const status = parseStatus(single('status'));
  const type = parseType(single('type'));

  const result = await listServiceSubmissions({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  });

  return (
    <AdminShell staff={staff}>
      <h1 className="text-3xl">Inquiries</h1>
      <p className="mt-2 text-sm text-ink-600">
        Contact, training, marketing and digitalization inquiries.
      </p>

      <div className="mt-6">
        <SubmissionFilters
          basePath="/admin/submissions"
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          searchPlaceholder="Name, email or reference"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-ink-200 bg-white">
        <table className="w-full min-w-[46rem] text-sm">
          <caption className="sr-only">
            Service inquiries, most recent first. {result.total} in total.
          </caption>
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left">
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                Reference
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                From
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-700">
                Service
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
                  No inquiries match these filters.
                </td>
              </tr>
            ) : (
              result.items.map((submission) => (
                <tr key={submission.id} className="hover:bg-ink-50">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <Link
                      href={`/admin/submissions/${submission.id}`}
                      className="font-mono text-xs font-semibold text-navy-900 underline underline-offset-2"
                    >
                      {submission.referenceCode}
                    </Link>
                  </th>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-ink-900">
                      {submission.fullName}
                    </span>
                    <span className="block text-xs text-ink-500">{submission.email}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {SUBMISSION_TYPE_LABELS[submission.submissionType]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                    {formatDateTime(submission.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/admin/submissions"
        searchParams={{ q: search, status, type }}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
      />
    </AdminShell>
  );
}
