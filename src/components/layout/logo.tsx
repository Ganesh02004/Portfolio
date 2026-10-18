import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  variant?: 'mark' | 'full';
  alt?: string;
  priority?: boolean;
}

/**
 * Balaji Technologies logo.
 *
 * - "mark" (default): The dynamic BT monogram mark, decorative when paired
 *   with the adjacent text wordmark.
 * - "full": The complete Balaji Technologies logo with monogram and wordmark.
 */
export function Logo({
  className,
  variant = 'mark',
  alt = '',
  priority = true,
}: LogoProps) {
  if (variant === 'full') {
    return (
      <Image
        src="/images/logo.png"
        alt={alt}
        width={1670}
        height={524}
        priority={priority}
        className={cn('h-auto w-auto shrink-0 object-contain', className)}
      />
    );
  }

  return (
    <Image
      src="/images/logo-mark.png"
      alt={alt}
      width={569}
      height={483}
      priority={priority}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
