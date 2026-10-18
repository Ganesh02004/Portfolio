'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { primaryCta, primaryNav, serviceNav } from '@/config/navigation';
import { cn } from '@/lib/utils';

/**
 * Mobile navigation.
 *
 * Keyboard behaviour is handled explicitly rather than left to the browser:
 * Escape closes the panel, focus is trapped inside it while open, and focus
 * returns to the trigger on close. The panel is removed from the accessibility
 * tree when closed, and body scroll is locked while it is open.
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close on navigation, so the panel never persists across a route change.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? [],
      );

    focusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex size-10 items-center justify-center rounded-lg border border-ink-300 text-ink-800 hover:bg-ink-50"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
          {isOpen ? (
            <path d="m5.3 4.3 14.4 14.4-1 1L4.3 5.3l1-1Zm14.4 1L5.3 19.7l-1-1L18.7 4.3l1 1Z" />
          ) : (
            <path d="M3 5.5h18v2H3v-2Zm0 5.5h18v2H3v-2Zm0 5.5h18v2H3v-2Z" />
          )}
        </svg>
      </button>

      {isOpen ? (
        <>
          {/*
            Decorative scrim. It has no accessible name by design — Escape and
            the close button are the keyboard routes out — so it carries a test
            id for the browser suite to target.
          */}
          <div
            data-testid="mobile-nav-backdrop"
            className="fixed inset-0 top-16 z-40 bg-ink-900/40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-navigation"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-ink-200 bg-white shadow-raised"
          >
            <nav className="container-content py-5">
              <p className="px-1 pb-2 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                Services
              </p>
              <ul className="mb-4 flex flex-col">
                {serviceNav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'block rounded-lg px-3 py-2.5 text-base font-medium text-ink-800 hover:bg-ink-50',
                        pathname === link.href && 'bg-navy-50 text-navy-900',
                      )}
                      aria-current={pathname === link.href ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <ul className="flex flex-col border-t border-ink-200 pt-4">
                {primaryNav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'block rounded-lg px-3 py-2.5 text-base font-medium text-ink-800 hover:bg-ink-50',
                        pathname === link.href && 'bg-navy-50 text-navy-900',
                      )}
                      aria-current={pathname === link.href ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                href={primaryCta.href}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-navy-900 px-5 py-3 text-base font-semibold text-white hover:bg-navy-800"
              >
                {primaryCta.label}
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
