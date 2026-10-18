import { siteConfig } from '@/config/site';
import type { EmailMessage } from '@/lib/email/mailer';
import { SUBMISSION_TYPE_LABELS, type SubmissionType } from '@/types/domain';

/**
 * Email templates.
 *
 * Applicant-facing mail acknowledges receipt and nothing more. It never
 * contains internal notes, review status, assessment criteria or another
 * applicant's data. Staff notifications carry identifying details but still no
 * free-text body from the submission, so a crafted message cannot be used to
 * inject content into the notification.
 */

/** Escapes text for safe inclusion in an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f6f7f9;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:28px 28px 8px 28px;">
          <h1 style="margin:0 0 16px 0;font-size:19px;line-height:1.35;color:#111827;">${escapeHtml(heading)}</h1>
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:8px 28px 28px 28px;border-top:1px solid #f3f4f6;">
          <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
            ${escapeHtml(siteConfig.name)} &middot; This is an automated message; replies reach our team.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.65;color:#374151;">${escapeHtml(text)}</p>`;
}

function referenceBlock(referenceCode: string): string {
  return `<p style="margin:16px 0;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#111827;">
    Your reference: <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(referenceCode)}</strong>
  </p>`;
}

export interface SubmissionAcknowledgementInput {
  to: string;
  fullName: string;
  referenceCode: string;
  submissionType: SubmissionType;
  submissionId: string;
}

export function submissionAcknowledgement(
  input: SubmissionAcknowledgementInput,
): EmailMessage {
  const serviceLabel = SUBMISSION_TYPE_LABELS[input.submissionType];
  const heading = 'We have received your inquiry';

  const lines = [
    `Hello ${input.fullName},`,
    `Thank you for contacting ${siteConfig.name}. We have received your ${serviceLabel.toLowerCase()} inquiry and a member of our team will review it.`,
    'Please keep the reference below if you need to follow up with us.',
  ];

  return {
    to: input.to,
    template: 'submission_acknowledgement',
    subject: `We received your inquiry (${input.referenceCode})`,
    subject_table: 'service_submissions',
    subject_id: input.submissionId,
    text: [...lines, '', `Reference: ${input.referenceCode}`, '', siteConfig.name].join(
      '\n',
    ),
    html: layout(
      heading,
      lines.map(paragraph).join('') + referenceBlock(input.referenceCode),
    ),
  };
}

export interface StartupAcknowledgementInput {
  to: string;
  applicantName: string;
  referenceCode: string;
  applicationId: string;
}

export function startupAcknowledgement(input: StartupAcknowledgementInput): EmailMessage {
  const lines = [
    `Hello ${input.applicantName},`,
    `Thank you for submitting your idea to ${siteConfig.name}. Your application and presentation have been received.`,
    'Our team reviews submissions against internal criteria and will contact you about the outcome. Submitting an application does not guarantee selection or support.',
  ];

  return {
    to: input.to,
    template: 'startup_acknowledgement',
    subject: `Your startup application was received (${input.referenceCode})`,
    subject_table: 'startup_applications',
    subject_id: input.applicationId,
    text: [...lines, '', `Reference: ${input.referenceCode}`, '', siteConfig.name].join(
      '\n',
    ),
    html: layout(
      'Your application has been received',
      lines.map(paragraph).join('') + referenceBlock(input.referenceCode),
    ),
  };
}

export interface StaffNotificationInput {
  to: string;
  referenceCode: string;
  kind: 'submission' | 'startup';
  serviceLabel: string;
  contactName: string;
  contactEmail: string;
  adminUrl: string;
}

/**
 * Staff notification. Deliberately contains no visitor-authored free text —
 * staff open the record to read it, which keeps unreviewed content out of
 * inboxes and out of email clients that render HTML loosely.
 */
export function staffNotification(input: StaffNotificationInput): EmailMessage {
  const label = input.kind === 'startup' ? 'startup application' : 'service inquiry';
  const lines = [
    `A new ${label} is waiting for review.`,
    `Service: ${input.serviceLabel}`,
    `From: ${input.contactName} <${input.contactEmail}>`,
    `Reference: ${input.referenceCode}`,
  ];

  return {
    to: input.to,
    template: 'staff_notification',
    subject: `New ${label}: ${input.referenceCode}`,
    replyTo: input.contactEmail,
    text: [...lines, '', `Open in admin: ${input.adminUrl}`].join('\n'),
    html: layout(
      `New ${label}`,
      lines.map(paragraph).join('') +
        `<p style="margin:16px 0 0 0;"><a href="${escapeHtml(input.adminUrl)}" style="display:inline-block;padding:10px 16px;background:#1e2a5a;color:#ffffff;border-radius:8px;text-decoration:none;font-size:14px;">Open in admin</a></p>`,
    ),
  };
}
