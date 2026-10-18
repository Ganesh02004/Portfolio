import { services } from '@/config/services';

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export const primaryNav: readonly NavLink[] = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/** Service links for the header dropdown and the footer. */
export const serviceNav: readonly NavLink[] = services.map((service) => ({
  label: service.name,
  href: service.href,
  description: service.summary,
}));

export const footerNav: ReadonlyArray<{ heading: string; links: readonly NavLink[] }> = [
  { heading: 'Services', links: serviceNav },
  {
    heading: 'Organization',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
    ],
  },
];

export const primaryCta: NavLink = { label: 'Get started', href: '/contact' };
