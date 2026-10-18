import { siteConfig } from '@/config/site';

/**
 * Standing notice shown while launch-critical content is unconfirmed.
 *
 * This exists so no visitor can mistake placeholder copy for approved business
 * terms. It disappears the moment `siteConfig.hasUnconfirmedContent` is set to
 * false, which should only happen once docs/CONTENT_PLACEHOLDERS.md is clear.
 */
export function PreviewNotice() {
  if (!siteConfig.hasUnconfirmedContent) return null;

  return (
    <div className="border-b border-warning-200 bg-warning-50">
      <p className="container-content py-2 text-center text-xs leading-relaxed text-warning-900">
        <span className="font-semibold">Preview build.</span> Service details, pricing and
        legal terms on this site are placeholders awaiting confirmation and are not an
        offer.
      </p>
    </div>
  );
}
