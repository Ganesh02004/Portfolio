/**
 * Site identity and contact details.
 *
 * Everything in this file is content, not code. Values left as `null` have NOT
 * been confirmed by the business owner, and the UI renders a standing notice
 * while `hasUnconfirmedContent` is true. Clearing that flag before the owner
 * has approved the copy is a launch-blocking mistake — the checklist in
 * docs/CONTENT_PLACEHOLDERS.md tracks what must be decided.
 *
 * No testimonials, client logos, success metrics, credentials or guarantees
 * appear anywhere in this file, because none have been supplied.
 */

export interface ContactChannel {
  label: string;
  /** Null until the business confirms the real value. */
  value: string | null;
}

export interface LegalDetails {
  entityName: string | null;
  registrationNumber: string | null;
  jurisdiction: string | null;
  /** How long submissions are retained. Must be confirmed before launch. */
  dataRetentionPeriod: string | null;
  privacyContactEmail: string | null;
}

export interface SiteConfig {
  /** Working title. Replace with the registered business name before launch. */
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  /** True while any launch-critical content is still a placeholder. */
  hasUnconfirmedContent: boolean;
  contact: {
    email: ContactChannel;
    phone: ContactChannel;
    address: ContactChannel;
    hours: ContactChannel;
  };
  /** Social profiles are omitted entirely until real URLs are supplied. */
  social: ReadonlyArray<{ label: string; href: string }>;
  legal: LegalDetails;
}

export const siteConfig: SiteConfig = {
  name: 'Balaji Technologies',
  shortName: 'BT',

  tagline:
    'Training, startup, marketing and digitalization support for growing businesses',

  description:
    'We help people build IT careers and help businesses start, market and digitalize. Tell us what you need and our team will review your request.',

  hasUnconfirmedContent: true,

  contact: {
    email: { label: 'Email', value: null },
    phone: { label: 'Phone', value: null },
    address: { label: 'Office', value: null },
    hours: { label: 'Hours', value: null },
  },

  social: [],

  legal: {
    entityName: null,
    registrationNumber: null,
    jurisdiction: null,
    dataRetentionPeriod: null,
    privacyContactEmail: null,
  },
};

export type ConfirmedContactChannel = ContactChannel & { value: string };

/** Contact channels that have a confirmed value, in display order. */
export function confirmedContactChannels(): ConfirmedContactChannel[] {
  return Object.values(siteConfig.contact).filter(
    (channel): channel is ConfirmedContactChannel => channel.value !== null,
  );
}

export function hasAnyContactDetails(): boolean {
  return confirmedContactChannels().length > 0;
}
