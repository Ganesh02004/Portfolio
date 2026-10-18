import { z } from 'zod';
import {
  consentSchema,
  emailSchema,
  fullNameSchema,
  honeypotSchema,
  optionalPhoneSchema,
  optionalText,
  requiredText,
} from '@/lib/validation/common';
import { SUBMISSION_TYPES } from '@/types/domain';

/**
 * Submission schemas for the four inquiry forms that share
 * `service_submissions`. Each form has its own schema so that a field which is
 * optional on one form cannot be quietly omitted on another; they converge on
 * a single discriminated union for the API handler.
 */

const baseFields = {
  fullName: fullNameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  consent: consentSchema,
  website: honeypotSchema,
  sourcePage: optionalText(200, 'Source page'),
};

/** Training offering types, mirroring the two confirmed options. */
export const TRAINING_OPTIONS = [
  'GENERAL_TRAINING',
  'GENERAL_TRAINING_WITH_SUPPORT',
] as const;
export type TrainingOption = (typeof TRAINING_OPTIONS)[number];

export const TRAINING_OPTION_LABELS: Record<TrainingOption, string> = {
  GENERAL_TRAINING: 'General Training',
  GENERAL_TRAINING_WITH_SUPPORT: 'General Training + Support',
};

export const DIGITALIZATION_OPTIONS = [
  'ECOMMERCE_LISTING',
  'QUICK_COMMERCE_LISTING',
  'OWN_WEBSITE',
] as const;
export type DigitalizationOption = (typeof DIGITALIZATION_OPTIONS)[number];

export const DIGITALIZATION_OPTION_LABELS: Record<DigitalizationOption, string> = {
  ECOMMERCE_LISTING: 'E-commerce listing support',
  QUICK_COMMERCE_LISTING: 'Quick-commerce listing support',
  OWN_WEBSITE: 'Own business website',
};

export const contactSchema = z.object({
  ...baseFields,
  submissionType: z.literal('CONTACT'),
  subject: optionalText(150, 'Subject'),
  message: requiredText(10, 4000, 'Message'),
});

export const trainingInquirySchema = z.object({
  ...baseFields,
  submissionType: z.literal('TRAINING'),
  selectedOption: z.enum(TRAINING_OPTIONS, {
    errorMap: () => ({ message: 'Choose a training option' }),
  }),
  areaOfInterest: optionalText(200, 'Area of interest'),
  message: optionalText(4000, 'Message'),
});

export const marketingInquirySchema = z.object({
  ...baseFields,
  submissionType: z.literal('MARKETING'),
  businessName: optionalText(150, 'Business name'),
  /** Plan slug, or 'UNDECIDED' when the visitor wants a recommendation. */
  selectedOption: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? 'UNDECIDED' : value),
    z
      .string()
      .max(80, 'Selected plan is not recognised')
      .regex(/^[a-z0-9-]+$|^UNDECIDED$/, 'Selected plan is not recognised')
      .default('UNDECIDED'),
  ),
  message: optionalText(4000, 'Message'),
});

export const digitalizationInquirySchema = z.object({
  ...baseFields,
  submissionType: z.literal('DIGITALIZATION'),
  businessName: requiredText(2, 150, 'Business name'),
  selectedOption: z.enum(DIGITALIZATION_OPTIONS, {
    errorMap: () => ({ message: 'Choose the option you need' }),
  }),
  productCategory: optionalText(150, 'Product or service category'),
  currentPresence: optionalText(300, 'Current online presence'),
  approximateProductCount: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return value;
  }, z.coerce.number().int('Enter a whole number').min(0, 'Enter a whole number').max(1_000_000, 'Enter a number under 1,000,000').optional()),
  message: optionalText(4000, 'Requirements'),
});

/**
 * Discriminated union consumed by the submission route handler. The
 * discriminator makes an unrecognised `submissionType` a validation failure
 * rather than a silent fall-through.
 */
export const serviceSubmissionSchema = z.discriminatedUnion('submissionType', [
  contactSchema,
  trainingInquirySchema,
  marketingInquirySchema,
  digitalizationInquirySchema,
]);

export type ContactInput = z.infer<typeof contactSchema>;
export type TrainingInquiryInput = z.infer<typeof trainingInquirySchema>;
export type MarketingInquiryInput = z.infer<typeof marketingInquirySchema>;
export type DigitalizationInquiryInput = z.infer<typeof digitalizationInquirySchema>;
export type ServiceSubmissionInput = z.infer<typeof serviceSubmissionSchema>;

/** Runtime guard used by the handler before it trusts a `submissionType`. */
export function isSubmissionType(
  value: unknown,
): value is (typeof SUBMISSION_TYPES)[number] {
  return (
    typeof value === 'string' && (SUBMISSION_TYPES as readonly string[]).includes(value)
  );
}
