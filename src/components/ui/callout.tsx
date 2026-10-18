import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Callout: a labelled block of supporting information.
 *
 * The tone is carried by an icon and a visible heading as well as colour, so
 * the meaning survives for anyone who cannot distinguish the palette.
 */

type Tone = 'info' | 'pending' | 'success' | 'danger';

const tones: Record<Tone, { shell: string; icon: string; path: string }> = {
  info: {
    shell: 'border-navy-200 bg-navy-50 text-navy-900',
    icon: 'text-navy-700',
    path: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.75 3.5v1.5h-1.5V4.5h1.5Zm0 3v4h-1.5v-4h1.5Z',
  },
  pending: {
    shell: 'border-warning-200 bg-warning-50 text-warning-900',
    icon: 'text-warning-700',
    path: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.75 3.25v3.44l2.28 1.35-.76 1.29-3.02-1.79V4.25h1.5Z',
  },
  success: {
    shell: 'border-success-200 bg-success-50 text-success-900',
    icon: 'text-success-700',
    path: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.3 5.05-3.9 3.9a.75.75 0 0 1-1.06 0L4.7 8.2l1.06-1.06 1.11 1.11 3.37-3.37L11.3 6.05Z',
  },
  danger: {
    shell: 'border-danger-200 bg-danger-50 text-danger-900',
    icon: 'text-danger-700',
    path: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.75 10.5h-1.5V10h1.5v1.5Zm0-2.75h-1.5v-4h1.5v4Z',
  },
};

export interface CalloutProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Callout({ tone = 'info', title, children, className }: CalloutProps) {
  const style = tones[tone];

  return (
    <div className={cn('rounded-card border p-4 sm:p-5', style.shell, className)}>
      <div className="flex gap-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={cn('mt-0.5 size-4 shrink-0 fill-current', style.icon)}
        >
          <path d={style.path} />
        </svg>
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          {title ? <p className="mb-1 font-semibold">{title}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
