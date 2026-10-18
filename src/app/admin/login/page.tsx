import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/login-form';
import { Logo } from '@/components/layout/logo';
import { getCurrentStaff } from '@/lib/auth/session';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // An already-signed-in staff member has no reason to see this page.
  const staff = await getCurrentStaff();
  if (staff) redirect('/admin');

  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '';

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <main
        id="admin-main"
        className="flex flex-1 items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <Logo className="size-9" />
            <div>
              <p className="text-sm font-semibold text-navy-900">{siteConfig.name}</p>
              <p className="text-xs text-ink-500">Staff portal</p>
            </div>
          </div>

          <div className="mt-6 rounded-card border border-ink-200 bg-white p-6 shadow-card sm:p-7">
            <h1 className="text-2xl">Sign in</h1>
            <p className="mt-1.5 text-sm text-ink-600">
              Staff accounts are provisioned by an administrator. There is no self-signup.
            </p>

            <LoginForm next={next} />
          </div>

          <p className="mt-5 text-center text-xs text-ink-500">
            This area is for authorized staff only. Access attempts are logged.
          </p>
        </div>
      </main>
    </div>
  );
}
