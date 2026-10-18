import Link from 'next/link';
import { signOutAction } from '@/app/admin/actions';
import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import type { StaffProfile } from '@/types/domain';

/**
 * Admin chrome. The navigation is presentational only — every route behind it
 * enforces authorization on the server, so hiding or showing a link never
 * grants or denies access.
 */

const adminNav = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Inquiries', href: '/admin/submissions' },
  { label: 'Startup applications', href: '/admin/startup-applications' },
] as const;

export function AdminShell({
  staff,
  children,
}: {
  staff: StaffProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="container-content flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <div className="hidden sm:block">
              <p className="text-sm leading-tight font-semibold text-navy-900">
                {siteConfig.name}
              </p>
              <p className="text-xs leading-tight text-ink-500">Staff portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium text-ink-800">
                {staff.displayName}
              </p>
              <p className="text-xs leading-tight text-ink-500">
                {staff.role === 'ADMIN' ? 'Administrator' : 'Staff'}
              </p>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <nav aria-label="Admin" className="container-content">
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {adminNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block border-b-2 border-transparent px-3 py-3 text-sm font-medium whitespace-nowrap text-ink-600 hover:border-ink-300 hover:text-ink-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="ml-auto">
              <Link
                href="/"
                className="inline-block px-3 py-3 text-sm font-medium whitespace-nowrap text-ink-500 hover:text-navy-900"
              >
                View public site
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main id="admin-main" tabIndex={-1} className="flex-1 py-8 lg:py-10">
        <div className="container-content">{children}</div>
      </main>
    </div>
  );
}
