'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useId } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Filter bar for the admin lists.
 *
 * Filters live in the query string rather than client state, so a filtered view
 * is bookmarkable and survives a reload. The form submits normally when
 * JavaScript is unavailable.
 */

export interface SubmissionFiltersProps {
  basePath: string;
  statusOptions: ReadonlyArray<{ value: string; label: string }>;
  typeOptions?: ReadonlyArray<{ value: string; label: string }>;
  searchPlaceholder: string;
}

export function SubmissionFilters({
  basePath,
  statusOptions,
  typeOptions,
  searchPlaceholder,
}: SubmissionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseId = useId();

  const currentStatus = searchParams.get('status') ?? '';
  const currentType = searchParams.get('type') ?? '';
  const currentSearch = searchParams.get('q') ?? '';
  const hasFilters = Boolean(currentStatus || currentType || currentSearch);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const key of ['q', 'status', 'type']) {
      const value = formData.get(key);
      if (typeof value === 'string' && value.trim()) {
        params.set(key, value.trim());
      }
    }

    router.push(params.size > 0 ? `${basePath}?${params.toString()}` : basePath);
  }

  return (
    <form
      method="get"
      action={basePath}
      onSubmit={handleSubmit}
      className="rounded-card border border-ink-200 bg-white p-4"
    >
      <h2 className="sr-only">Filter results</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor={`${baseId}-q`}
            className="block text-xs font-semibold tracking-wide text-ink-500 uppercase"
          >
            Search
          </label>
          <input
            id={`${baseId}-q`}
            name="q"
            type="search"
            defaultValue={currentSearch}
            placeholder={searchPlaceholder}
            className="mt-1.5 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 hover:border-ink-400 focus:border-teal-600"
          />
        </div>

        <div className="sm:w-48">
          <label
            htmlFor={`${baseId}-status`}
            className="block text-xs font-semibold tracking-wide text-ink-500 uppercase"
          >
            Status
          </label>
          <select
            id={`${baseId}-status`}
            name="status"
            defaultValue={currentStatus}
            className="mt-1.5 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 hover:border-ink-400 focus:border-teal-600"
          >
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {typeOptions ? (
          <div className="sm:w-48">
            <label
              htmlFor={`${baseId}-type`}
              className="block text-xs font-semibold tracking-wide text-ink-500 uppercase"
            >
              Service
            </label>
            <select
              id={`${baseId}-type`}
              name="type"
              defaultValue={currentType}
              className="mt-1.5 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 hover:border-ink-400 focus:border-teal-600"
            >
              <option value="">All services</option>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit">Apply</Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(basePath)}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
