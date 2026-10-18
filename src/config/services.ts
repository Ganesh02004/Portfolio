/**
 * Service catalogue content.
 *
 * Each entry describes what the organization does in terms its notes support.
 * `pendingConfirmation` lists the decisions the owner still has to make for
 * that service; the UI renders them as an explicit "to be confirmed" list
 * rather than inventing plausible-sounding specifics.
 */

export interface ServiceDefinition {
  slug: string;
  /** Short name used in navigation and cards. */
  name: string;
  /** Full name used as the page heading. */
  title: string;
  href: string;
  summary: string;
  /** Short list shown on the service card. */
  highlights: readonly string[];
  /** Decisions outstanding before this page can be published as final. */
  pendingConfirmation: readonly string[];
  ctaLabel: string;
  ctaHref: string;
  /** Lucide-style icon key rendered by components/ui/service-icon.tsx */
  icon: 'training' | 'startup' | 'marketing' | 'digitalization';
}

export const services = [
  {
    slug: 'training-placement',
    name: 'Training & Placement',
    title: 'IT Training & Placement Support',
    href: '/services/training-placement',
    summary:
      'Structured technology training with interview preparation and practical exercises, followed by placement assistance from our team.',
    highlights: [
      'Domain and technology training',
      'Interview preparation and mock interviews',
      'Practical, workplace-style exercises',
      'Placement guidance and application support',
    ],
    pendingConfirmation: [
      'Course list, syllabus and delivery mode',
      'Programme duration and schedule',
      'Fees, instalments and refund terms',
      'Eligibility requirements',
      'Exactly what placement support includes',
    ],
    ctaLabel: 'Enquire about training',
    ctaHref: '/services/training-placement#enquire',
    icon: 'training',
  },
  {
    slug: 'startup-support',
    name: 'Startup Support',
    title: 'Startup Support',
    href: '/services/startup-support',
    summary:
      'Submit your idea with a presentation and pitch video. Our team reviews every application and contacts applicants about the outcome.',
    highlights: [
      'Idea submission with presentation and pitch video',
      'Review against internal criteria',
      'Direct follow-up on the outcome',
      'Guidance discussed with selected applicants',
    ],
    pendingConfirmation: [
      'Eligibility criteria for applicants',
      'How submissions are evaluated and scored',
      'What support selected applicants receive',
      'Whether any written agreement applies',
      'Review turnaround time',
    ],
    ctaLabel: 'Submit your idea',
    ctaHref: '/services/startup-support#apply',
    icon: 'startup',
  },
  {
    slug: 'marketing',
    name: 'Marketing Support',
    title: 'Marketing Support',
    href: '/services/marketing',
    summary:
      'One-time and duration-based marketing engagements for businesses that need consistent promotion rather than one-off campaigns.',
    highlights: [
      'One-time, fixed-scope engagements',
      'Duration-based ongoing support',
      'Scope agreed before work starts',
      'Deliverables defined per engagement',
    ],
    pendingConfirmation: [
      'Confirmed plan durations',
      'Pricing per plan and currency',
      'Deliverables and exclusions per plan',
      'Whether the one-time plan is fixed-scope or a term of service',
      'Renewal and cancellation terms',
    ],
    ctaLabel: 'Request a marketing consultation',
    ctaHref: '/services/marketing#enquire',
    icon: 'marketing',
  },
  {
    slug: 'digitalization',
    name: 'Digitalization',
    title: 'Business Digitalization & E-commerce',
    href: '/services/digitalization',
    summary:
      'Get an existing business online — listed on e-commerce and quick-commerce platforms, or running on its own website.',
    highlights: [
      'E-commerce marketplace listing support',
      'Quick-commerce listing support',
      'Custom business website build',
      'Product catalogue preparation',
    ],
    pendingConfirmation: [
      'Which marketplaces are supported',
      'What platform onboarding includes',
      'Website build scope, timeline and pricing',
      'Whether ongoing maintenance is offered',
    ],
    ctaLabel: 'Discuss your business',
    ctaHref: '/services/digitalization#enquire',
    icon: 'digitalization',
  },
] as const satisfies readonly ServiceDefinition[];

export type ServiceSlug = (typeof services)[number]['slug'];

export function findService(slug: string): ServiceDefinition | undefined {
  return services.find((service) => service.slug === slug);
}

/**
 * How a request moves through the organization. These four steps describe the
 * process the notes actually define; no timescales are stated because none
 * have been confirmed.
 */
export const howItWorks = [
  {
    step: 1,
    title: 'Choose a service',
    description:
      'Read what each service covers and decide which one fits what you are trying to do.',
  },
  {
    step: 2,
    title: 'Send us the details',
    description:
      'Complete the inquiry or application form. Startup applicants also attach a presentation and pitch video link.',
  },
  {
    step: 3,
    title: 'We review it',
    description:
      'A member of our team reads every submission and assesses it against our criteria for that service.',
  },
  {
    step: 4,
    title: 'We get back to you',
    description:
      'We contact you to discuss next steps, ask for anything missing, or let you know the outcome.',
  },
] as const;

/**
 * Questions we can answer today. Anything requiring a confirmed policy —
 * pricing, guarantees, timelines — is deliberately absent rather than
 * answered with a plausible guess.
 */
export const faqs = [
  {
    question: 'Do I need an account to contact you?',
    answer:
      'No. Every inquiry and application form on this site works without signing up.',
  },
  {
    question: 'What happens to the information I submit?',
    answer:
      'It is stored securely and used only to review and respond to your request. Uploaded presentations are kept in private storage that is not publicly accessible.',
  },
  {
    question: 'Do you guarantee a job after training?',
    answer:
      'No. We provide training, interview preparation and placement assistance. We do not guarantee employment, and you should be cautious of any organization that does.',
  },
  {
    question: 'Does submitting a startup idea guarantee support?',
    answer:
      'No. Applications are reviewed against internal criteria and only some applicants are shortlisted. We contact every applicant about the outcome.',
  },
  {
    question: 'Will my startup idea be kept confidential?',
    answer:
      'Your submission is visible only to the staff reviewing it. We do not publish applications. If you need a formal confidentiality agreement, tell us before you submit.',
  },
  {
    question: 'Can you get my products listed on a specific marketplace?',
    answer:
      'We support the onboarding and listing process, but acceptance is decided by the platform and depends on its own eligibility rules. We cannot promise approval.',
  },
] as const;
