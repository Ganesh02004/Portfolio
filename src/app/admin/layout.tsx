import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s — Admin',
  },
  // Belt and braces: the portal is access-controlled on the server, and also
  // excluded from indexing so a URL leak does not put it in search results.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#admin-main" className="skip-link">
        Skip to main content
      </a>
      {children}
    </>
  );
}
