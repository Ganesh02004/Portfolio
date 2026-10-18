import { cn } from '@/lib/utils';

/**
 * Logo mark.
 *
 * A geometric placeholder, not a brand identity — the organization has not
 * supplied a logo yet (see docs/CONTENT_PLACEHOLDERS.md). It is decorative
 * because the wordmark beside it carries the accessible name.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
      role="presentation"
    >
      <rect width="32" height="32" rx="8" className="fill-navy-900" />
      <path
        d="M9 21.5V10.5h5.4c2.3 0 3.8 1.2 3.8 3 0 1.3-.7 2.2-1.9 2.6 1.4.3 2.3 1.4 2.3 2.8 0 1.9-1.6 3.1-4.1 3.1H9Zm2.6-6.6h2.4c1 0 1.6-.5 1.6-1.3s-.6-1.2-1.6-1.2h-2.4v2.5Zm0 4.6h2.7c1.1 0 1.7-.5 1.7-1.3s-.6-1.3-1.7-1.3h-2.7v2.6Z"
        fill="#fff"
      />
      <circle cx="22.5" cy="20.5" r="2.5" className="fill-teal-400" />
    </svg>
  );
}
