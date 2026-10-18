import { cn } from '@/lib/utils';

/**
 * Service icons, drawn inline as decorative SVG.
 *
 * They are purely decorative — every icon sits next to a text label — so each
 * is marked aria-hidden rather than given a redundant accessible name.
 */

export type ServiceIconName = 'training' | 'startup' | 'marketing' | 'digitalization';

const paths: Record<ServiceIconName, string> = {
  // Graduation cap
  training:
    'M12 3 2 8l10 5 8-4v6h2V8L12 3Zm-6 9.2V16c0 1.66 2.69 3 6 3s6-1.34 6-3v-3.8l-6 3-6-3Z',
  // Upward rocket
  startup:
    'M14.5 2c2.5 0 5.5 1.3 7.5 3.5-.2 3-1.6 5.6-3.8 7.6l.3 4.2-3.6 2.2-.7-4a9.3 9.3 0 0 1-3.6 0l-.7 4L6.3 17.3l.3-4.2A12.4 12.4 0 0 1 2.8 5.5C4.8 3.3 7.8 2 10.3 2h4.2Zm-2.1 4.4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  // Rising bar chart
  marketing: 'M4 20V10h3.5v10H4Zm6.25 0V4h3.5v16h-3.5ZM16.5 20v-6H20v6h-3.5Z',
  // Storefront
  digitalization:
    'M4 4h16l1.5 5.2A2.8 2.8 0 0 1 18.8 12 2.8 2.8 0 0 1 16 10.2 2.8 2.8 0 0 1 13.2 12 2.8 2.8 0 0 1 10.4 10.2 2.8 2.8 0 0 1 7.6 12 2.8 2.8 0 0 1 4.8 10.2 2.8 2.8 0 0 1 2.5 9.2L4 4Zm1 9.6c.6.26 1.25.4 1.9.4H17c.73 0 1.44-.14 2-.4V20H5v-6.4Z',
};

export function ServiceIcon({
  name,
  className,
}: {
  name: ServiceIconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('size-6 fill-current', className)}
    >
      <path d={paths[name]} />
    </svg>
  );
}
