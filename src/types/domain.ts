/**
 * Domain types mirroring the database enums in
 * db/migrations/0001_initial_schema.sql. These are the single source of truth
 * for the application; adding a value here without a matching migration will
 * fail at insert time rather than silently accepting bad data.
 */

export const SUBMISSION_TYPES = [
  'TRAINING',
  'MARKETING',
  'DIGITALIZATION',
  'CONTACT',
] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export const SUBMISSION_STATUSES = [
  'RECEIVED',
  'UNDER_REVIEW',
  'CONTACTED',
  'NEEDS_INFORMATION',
  'CLOSED',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const STARTUP_STATUSES = [
  'RECEIVED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'NOT_SELECTED',
  'NEEDS_INFORMATION',
  'CONTACTED',
  'CLOSED',
] as const;
export type StartupStatus = (typeof STARTUP_STATUSES)[number];

export const STAFF_ROLES = ['ADMIN', 'STAFF'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const BILLING_MODELS = ['ONE_TIME', 'RECURRING'] as const;
export type BillingModel = (typeof BILLING_MODELS)[number];

/** Human-readable labels. Status is never communicated by colour alone. */
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  RECEIVED: 'Received',
  UNDER_REVIEW: 'Under review',
  CONTACTED: 'Contacted',
  NEEDS_INFORMATION: 'Needs information',
  CLOSED: 'Closed',
};

export const STARTUP_STATUS_LABELS: Record<StartupStatus, string> = {
  RECEIVED: 'Received',
  UNDER_REVIEW: 'Under review',
  SHORTLISTED: 'Shortlisted',
  NOT_SELECTED: 'Not selected',
  NEEDS_INFORMATION: 'Needs information',
  CONTACTED: 'Contacted',
  CLOSED: 'Closed',
};

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  TRAINING: 'Training & placement',
  MARKETING: 'Marketing',
  DIGITALIZATION: 'Digitalization',
  CONTACT: 'General contact',
};

export interface StaffProfile {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
}

export interface ServiceSubmission {
  id: string;
  referenceCode: string;
  submissionType: SubmissionType;
  status: SubmissionStatus;
  fullName: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  selectedOption: string | null;
  message: string | null;
  sourcePage: string | null;
  consentAt: Date;
  assignedTo: string | null;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartupApplication {
  id: string;
  referenceCode: string;
  status: StartupStatus;
  applicantName: string;
  email: string;
  phone: string | null;
  startupName: string;
  ideaTitle: string;
  ideaSummary: string;
  problemStatement: string | null;
  targetCustomer: string | null;
  referralSource: string | null;
  pitchVideoUrl: string;
  presentationFilename: string;
  presentationSizeBytes: number;
  presentationMimeType: string;
  consentAt: Date;
  internalNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketingPlan {
  id: string;
  name: string;
  slug: string;
  billingModel: BillingModel;
  durationMonths: number | null;
  priceMinorUnits: number | null;
  currency: string;
  summary: string;
  targetBusiness: string | null;
  ctaLabel: string;
  deliverables: string[];
  exclusions: string[];
  isActive: boolean;
  isPricingConfirmed: boolean;
  displayOrder: number;
}

export interface SubmissionEvent {
  id: string;
  subjectTable: 'service_submissions' | 'startup_applications';
  subjectId: string;
  actorProfileId: string | null;
  actorName: string | null;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  detail: string | null;
  createdAt: Date;
}
