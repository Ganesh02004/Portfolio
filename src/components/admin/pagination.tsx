import Link from 'next/link';

/**
 * Pagination. Rendered as links so pages are crawlable by the browser's
 * history, work without JavaScript, and can be opened in a new tab.
 */
export function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
  total,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  total: number;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-sm text-ink-500">
        {total} {total === 1 ? 'result' : 'results'}
      </p>
    );
  }

  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== 'page') params.set(key, value);
    }
    if (targetPage > 1) params.set('page', String(targetPage));
    return params.size > 0 ? `${basePath}?${params.toString()}` : basePath;
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between gap-4 border-t border-ink-200 pt-4"
    >
      <p className="text-sm text-ink-500">
        Page {page} of {totalPages} · {total} {total === 1 ? 'result' : 'results'}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            rel="prev"
            className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-400">
            Previous
          </span>
        )}

        {page < totalPages ? (
          <Link
            href={hrefFor(page + 1)}
            rel="next"
            className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-400">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
