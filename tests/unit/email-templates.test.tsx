import { describe, expect, it } from 'vitest';
import {
  startupAcknowledgement,
  staffNotification,
  submissionAcknowledgement,
} from '@/lib/email/templates';

/**
 * The rule these tests protect: applicant-facing email must never carry
 * internal information, and no template may inject unescaped user input.
 */

describe('submissionAcknowledgement', () => {
  const message = submissionAcknowledgement({
    to: 'asha@example.com',
    fullName: 'Asha Kumar',
    referenceCode: 'TRN-2610-K7M4QB',
    submissionType: 'TRAINING',
    submissionId: '11111111-1111-4111-8111-111111111111',
  });

  it('includes the reference code in both parts', () => {
    expect(message.text).toContain('TRN-2610-K7M4QB');
    expect(message.html).toContain('TRN-2610-K7M4QB');
    expect(message.subject).toContain('TRN-2610-K7M4QB');
  });

  it('addresses the applicant by name', () => {
    expect(message.text).toContain('Asha Kumar');
  });

  it('does not mention status or review criteria', () => {
    const body = `${message.text} ${message.html}`.toLowerCase();
    for (const forbidden of ['internal', 'shortlist', 'criteria', 'score', 'reject']) {
      expect(body).not.toContain(forbidden);
    }
  });

  it('links the delivery log to the right record', () => {
    expect(message.subject_table).toBe('service_submissions');
    expect(message.subject_id).toBe('11111111-1111-4111-8111-111111111111');
  });
});

describe('startupAcknowledgement', () => {
  it('states plainly that submission is not selection', () => {
    const message = startupAcknowledgement({
      to: 'asha@example.com',
      applicantName: 'Asha Kumar',
      referenceCode: 'STU-2610-K7M4QB',
      applicationId: '22222222-2222-4222-8222-222222222222',
    });

    expect(message.text.toLowerCase()).toContain('does not guarantee selection');
  });
});

describe('staffNotification', () => {
  const message = staffNotification({
    to: 'team@example.test',
    referenceCode: 'STU-2610-K7M4QB',
    kind: 'startup',
    serviceLabel: 'Startup support',
    contactName: 'Asha Kumar',
    contactEmail: 'asha@example.com',
    adminUrl: 'https://example.test/admin/startup-applications/abc',
  });

  it('sets reply-to so staff can answer directly', () => {
    expect(message.replyTo).toBe('asha@example.com');
  });

  it('links to the admin record', () => {
    expect(message.html).toContain('https://example.test/admin/startup-applications/abc');
  });

  it('carries no applicant free text', () => {
    // Staff open the record to read the submission itself.
    expect(message.text).not.toContain('idea summary');
  });
});

describe('HTML escaping', () => {
  it('escapes markup supplied in a name', () => {
    const message = submissionAcknowledgement({
      to: 'x@example.com',
      fullName: '<script>alert(1)</script>',
      referenceCode: 'GEN-2610-K7M4QB',
      submissionType: 'CONTACT',
      submissionId: '33333333-3333-4333-8333-333333333333',
    });

    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
  });

  it('escapes an admin URL containing a quote', () => {
    const message = staffNotification({
      to: 'team@example.test',
      referenceCode: 'GEN-2610-K7M4QB',
      kind: 'submission',
      serviceLabel: 'General contact',
      contactName: 'Asha',
      contactEmail: 'asha@example.com',
      adminUrl: 'https://example.test/"><script>alert(1)</script>',
    });

    expect(message.html).not.toContain('"><script>');
  });
});
