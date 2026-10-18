import { describe, expect, it } from 'vitest';
import {
  consentSchema,
  emailSchema,
  fullNameSchema,
  httpUrlSchema,
  optionalPhoneSchema,
  toFieldErrors,
} from '@/lib/validation/common';
import {
  contactSchema,
  digitalizationInquirySchema,
  serviceSubmissionSchema,
  trainingInquirySchema,
} from '@/lib/validation/submission-schema';
import {
  maxPresentationBytes,
  startupApplicationFieldsSchema,
  validatePresentationMetadata,
} from '@/lib/validation/startup-schema';

describe('fullNameSchema', () => {
  it('collapses internal whitespace and trims', () => {
    expect(fullNameSchema.parse('  Asha   Kumar  ')).toBe('Asha Kumar');
  });

  it('rejects a single character', () => {
    expect(fullNameSchema.safeParse('A').success).toBe(false);
  });

  it('rejects names beyond the column length', () => {
    expect(fullNameSchema.safeParse('a'.repeat(121)).success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('normalizes case and whitespace', () => {
    expect(emailSchema.parse('  Asha@Example.COM ')).toBe('asha@example.com');
  });

  it.each(['no-at-sign', 'missing@tld', '@example.com', 'two@@example.com', ''])(
    'rejects %j',
    (value) => {
      expect(emailSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('optionalPhoneSchema', () => {
  it('treats an empty string as absent', () => {
    expect(optionalPhoneSchema.parse('')).toBeUndefined();
    expect(optionalPhoneSchema.parse('   ')).toBeUndefined();
  });

  it('accepts international formats', () => {
    expect(optionalPhoneSchema.parse('+91 98765 43210')).toBe('+91 98765 43210');
    expect(optionalPhoneSchema.parse('(555) 123-4567')).toBe('(555) 123-4567');
  });

  it('rejects letters', () => {
    expect(optionalPhoneSchema.safeParse('call me').success).toBe(false);
  });
});

describe('consentSchema', () => {
  it('accepts an explicit true and the checkbox "on" value', () => {
    expect(consentSchema.parse(true)).toBe(true);
    expect(consentSchema.parse('true')).toBe(true);
    expect(consentSchema.parse('on')).toBe(true);
  });

  it('rejects a missing or false value', () => {
    expect(consentSchema.safeParse(false).success).toBe(false);
    expect(consentSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('httpUrlSchema', () => {
  it('accepts http and https links', () => {
    expect(httpUrlSchema.parse('https://example.com/watch?v=1')).toBe(
      'https://example.com/watch?v=1',
    );
    expect(httpUrlSchema.parse('http://example.com')).toBe('http://example.com');
  });

  // The security-relevant cases: a URL field must not become a script sink.
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    'vbscript:msgbox(1)',
  ])('rejects unsafe scheme %j', (value) => {
    expect(httpUrlSchema.safeParse(value).success).toBe(false);
  });

  it('rejects embedded credentials', () => {
    expect(httpUrlSchema.safeParse('https://user:pass@example.com').success).toBe(false);
  });

  it('rejects a bare hostname with no scheme', () => {
    expect(httpUrlSchema.safeParse('example.com/video').success).toBe(false);
  });
});

describe('contactSchema', () => {
  const valid = {
    submissionType: 'CONTACT' as const,
    fullName: 'Asha Kumar',
    email: 'asha@example.com',
    message: 'I would like to know more about your training programmes.',
    consent: true,
  };

  it('accepts a complete submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a message of substance', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'hi' });
    expect(result.success).toBe(false);
  });

  it('requires consent', () => {
    const result = contactSchema.safeParse({ ...valid, consent: false });
    expect(result.success).toBe(false);
  });
});

describe('trainingInquirySchema', () => {
  const base = {
    submissionType: 'TRAINING' as const,
    fullName: 'Asha Kumar',
    email: 'asha@example.com',
    consent: true,
  };

  it('requires a recognised option', () => {
    expect(
      trainingInquirySchema.safeParse({ ...base, selectedOption: 'GENERAL_TRAINING' })
        .success,
    ).toBe(true);
    expect(
      trainingInquirySchema.safeParse({ ...base, selectedOption: 'FREE_PLACEMENT' })
        .success,
    ).toBe(false);
  });
});

describe('digitalizationInquirySchema', () => {
  const base = {
    submissionType: 'DIGITALIZATION' as const,
    fullName: 'Asha Kumar',
    businessName: 'Kumar Traders',
    email: 'asha@example.com',
    selectedOption: 'ECOMMERCE_LISTING' as const,
    consent: true,
  };

  it('treats an empty product count as absent', () => {
    const result = digitalizationInquirySchema.safeParse({
      ...base,
      approximateProductCount: '',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.approximateProductCount).toBeUndefined();
  });

  it('coerces a numeric string', () => {
    const result = digitalizationInquirySchema.safeParse({
      ...base,
      approximateProductCount: '42',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.approximateProductCount).toBe(42);
  });

  it('rejects a negative count', () => {
    expect(
      digitalizationInquirySchema.safeParse({ ...base, approximateProductCount: '-1' })
        .success,
    ).toBe(false);
  });
});

describe('serviceSubmissionSchema discriminated union', () => {
  it('rejects an unrecognised submission type', () => {
    const result = serviceSubmissionSchema.safeParse({
      submissionType: 'PAYMENT',
      fullName: 'Asha Kumar',
      email: 'asha@example.com',
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it('does not let one form satisfy another form’s requirements', () => {
    // DIGITALIZATION requires businessName; a CONTACT-shaped payload must fail.
    const result = serviceSubmissionSchema.safeParse({
      submissionType: 'DIGITALIZATION',
      fullName: 'Asha Kumar',
      email: 'asha@example.com',
      selectedOption: 'OWN_WEBSITE',
      consent: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('startupApplicationFieldsSchema', () => {
  const valid = {
    applicantName: 'Asha Kumar',
    email: 'asha@example.com',
    startupName: 'Fieldnote',
    ideaTitle: 'Offline-first field data collection',
    ideaSummary:
      'A mobile tool for surveyors working without connectivity, syncing records when a connection returns.',
    pitchVideoUrl: 'https://example.com/pitch',
    consent: true,
  };

  it('accepts a complete application', () => {
    expect(startupApplicationFieldsSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a summary long enough to review', () => {
    const result = startupApplicationFieldsSchema.safeParse({
      ...valid,
      ideaSummary: 'An app.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unsafe pitch video scheme', () => {
    const result = startupApplicationFieldsSchema.safeParse({
      ...valid,
      pitchVideoUrl: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });
});

describe('validatePresentationMetadata', () => {
  it('accepts a PDF within the size limit', () => {
    expect(
      validatePresentationMetadata({
        filename: 'pitch.pdf',
        sizeBytes: 2048,
        mimeType: 'application/pdf',
      }),
    ).toBeNull();
  });

  it('accepts a pptx with a generic browser MIME type', () => {
    expect(
      validatePresentationMetadata({
        filename: 'pitch.pptx',
        sizeBytes: 2048,
        mimeType: 'application/octet-stream',
      }),
    ).toBeNull();
  });

  it('reports a missing file', () => {
    expect(validatePresentationMetadata(null)).toEqual({ kind: 'MISSING' });
  });

  it('reports an empty file', () => {
    expect(
      validatePresentationMetadata({
        filename: 'pitch.pdf',
        sizeBytes: 0,
        mimeType: 'application/pdf',
      }),
    ).toEqual({ kind: 'EMPTY' });
  });

  it('reports a file over the limit', () => {
    const result = validatePresentationMetadata({
      filename: 'pitch.pdf',
      sizeBytes: maxPresentationBytes() + 1,
      mimeType: 'application/pdf',
    });
    expect(result).toEqual({ kind: 'TOO_LARGE', maxBytes: maxPresentationBytes() });
  });

  it('accepts a file exactly at the limit', () => {
    expect(
      validatePresentationMetadata({
        filename: 'pitch.pdf',
        sizeBytes: maxPresentationBytes(),
        mimeType: 'application/pdf',
      }),
    ).toBeNull();
  });

  it('rejects an executable regardless of declared type', () => {
    const result = validatePresentationMetadata({
      filename: 'payload.exe',
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(result?.kind).toBe('UNSUPPORTED_EXTENSION');
  });

  it('rejects a double extension that ends in an unsupported type', () => {
    const result = validatePresentationMetadata({
      filename: 'pitch.pdf.exe',
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(result?.kind).toBe('UNSUPPORTED_EXTENSION');
  });
});

describe('toFieldErrors', () => {
  it('maps the first issue per field', () => {
    const result = contactSchema.safeParse({
      submissionType: 'CONTACT',
      fullName: 'A',
      email: 'bad',
      message: 'short',
      consent: false,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = toFieldErrors(result.error);
    expect(Object.keys(errors).sort()).toEqual(
      ['consent', 'email', 'fullName', 'message'].sort(),
    );
    expect(errors.email).toBeTruthy();
  });
});
