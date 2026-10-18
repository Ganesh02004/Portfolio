# Business Services Platform --- End-to-End Build Plan for Claude Code
 
> **Purpose:** Use this document as the implementation blueprint for
> building a production-minded, responsive business website and
> lightweight service-management portal from the original handwritten
> requirements.
>
> **How to use it:** Place this file at the root of your repository as
> `BUILD_PLAN.md`. Give Claude Code the instructions in [Section
> 18](#18-how-to-use-this-file-with-claude-code). Build in small phases,
> run the checks after each phase, and do not ask the agent to implement
> the whole application in one giant change.
 
------------------------------------------------------------------------
 
## 1. Product vision
 
Build a responsive website for an organization that offers four
services:
 
1.  **IT Training & Placement Support** --- training, interview
    preparation, mock interviews, and clearly described placement
    assistance.
2.  **Startup Support** --- applicants submit an idea presentation and
    pitch video; the organization reviews submissions and may offer
    guidance to selected applicants.
3.  **Marketing Support** --- one-time and duration-based marketing
    service packages.
4.  **Business Digitalization & E-commerce** --- help existing
    businesses list products on e-commerce/quick-commerce platforms or
    build their own website.
 
The website should help visitors understand the services, submit
inquiries/applications, and allow authorized staff to manage
submissions.
 
### Product principles
 
-   Make the site trustworthy, clear, fast, accessible, and
    mobile-first.
-   Do not make unsupported guarantees about jobs, funding, business
    success, or platform acceptance.
-   Explain prices, deliverables, eligibility, and terms only after the
    business owner confirms them.
-   Protect personal data and uploaded files.
-   Keep the initial release focused; avoid building a large CRM or
    payment platform before the core service workflows are validated.
 
------------------------------------------------------------------------
 
## 2. Requirements: confirmed vs. assumptions
 
### Confirmed from the notes
 
-   The homepage has four service areas: Training & Placement, Startup
    Support, Marketing, and Business Digitalization.
-   Training has two proposed types: `General Training` and
    `General Training + Support`.
-   Startup support starts with an idea submission containing a
    PowerPoint presentation and an idea-pitch video; submissions are
    shortlisted based on quality/criteria; selected applicants may
    receive initial support. A possible share/partnership arrangement
    was mentioned but is not defined.
-   Marketing notes mention durations of **3, 6, 8, and 12 months**,
    plus a separate one-time plan. Confirm these before publishing them.
-   Business digitalization options include e-commerce listing,
    quick-commerce listing, or building the business's own website.
 
### Assumptions for the first build
 
These are implementation defaults, not confirmed business policies:
 
-   The first release is a public marketing website plus
    inquiry/application forms and a protected admin area.
-   Visitors can submit forms without creating accounts.
-   Staff use an admin login to review submissions and update their
    status.
-   Forms send a confirmation to the applicant and a notification to the
    team only after email delivery is configured.
-   Prices are configurable content, not hardcoded into the UI.
-   Startup video is initially collected as a video URL. Direct video
    uploads are deferred because of size, storage, and security
    considerations.
-   The first release does not collect payments. Add payments only after
    package pricing, refund rules, tax handling, and payment-provider
    requirements are confirmed.
-   "Placement support" means assistance only unless a written policy
    defines a stronger commitment.
-   Startup equity/revenue share is not offered or promised by the site
    until legal terms are approved.
 
### Decisions to make before public launch
 
-   Organization name, logo, domain, brand colors, and contact details.
-   Training courses, delivery mode, duration, fees, eligibility, and
    placement-support deliverables.
-   Startup eligibility, evaluation criteria, selection process, support
    scope, and any agreement.
-   Marketing package durations, pricing, deliverables, renewals, and
    cancellation policy.
-   Which e-commerce/quick-commerce platforms are supported and what is
    included in onboarding.
-   Whether payments, appointment booking, student accounts, or a full
    CRM are needed.
-   Legal business identity, privacy policy, terms, and retention period
    for submissions.
 
Use clearly marked placeholders until these decisions are confirmed. Do
not invent real testimonials, client logos, success metrics, course
credentials, or guarantees.
 
------------------------------------------------------------------------
 
## 3. Recommended technology stack
 
Use a single TypeScript application for the first release to reduce
operational complexity.
 
  -----------------------------------------------------------------------
  Layer                   Recommendation          Reason
  ----------------------- ----------------------- -----------------------
  Web framework           Next.js App Router +    Public pages,
                          TypeScript              server-rendered
                                                  content, and
                                                  server-side form
                                                  handling
 
  Styling                 Tailwind CSS            Consistent responsive
                                                  styling
 
  UI components           shadcn/ui or accessible Fast development with
                          custom components       controllable design
 
  Forms                   React Hook Form + Zod   Client-side usability
                                                  plus shared validation
                                                  patterns
 
  Database                PostgreSQL through      Managed relational
                          Supabase                database and migrations
 
  Authentication          Supabase Auth           Admin sign-in without
                                                  building password
                                                  storage
 
  File storage            Private Supabase        Store startup
                          Storage bucket          presentation files
                                                  securely
 
  Email                   Resend or another       Confirmation and staff
                          provider selected by    notifications
                          the owner               
 
  Testing                 Vitest + React Testing  Unit, component, and
                          Library; Playwright for browser workflow checks
                          end-to-end              
 
  Code quality            ESLint, Prettier,       Consistent,
                          TypeScript strict mode  maintainable code
 
  Hosting                 Vercel or another       Simple preview and
                          platform that supports  production deployments
                          Next.js                 
 
  Monitoring              Hosting logs initially; Visibility into
                          add error monitoring    production failures
                          when needed             
  -----------------------------------------------------------------------
 
**Important:** Confirm current package versions when creating the
project. Use stable compatible releases, commit the lockfile, and do not
blindly upgrade major versions during implementation.
 
### Architecture
 
``` text
Visitor browser
    |
    v
Next.js public pages
    |-- Home / Services / About / Contact
    |-- Training inquiry form
    |-- Startup application form
    |-- Marketing inquiry form
    |-- Digitalization inquiry form
    |
    v
Validated server-side actions or route handlers
    |-- Zod validation
    |-- Rate limiting / spam protection
    |-- Authorization where required
    |-- Safe file metadata checks
    |
    +------> PostgreSQL (service inquiries and applications)
    |
    +------> Private object storage (presentation files)
    |
    +------> Email provider (notifications)
 
Admin browser
    |
    v
Protected /admin area
    |-- Sign-in
    |-- Dashboard and filters
    |-- Submission detail
    |-- Status updates and internal notes
    |
    v
Server-side authorization + database policies
```
 
Do not expose service-role database keys, email API keys, or private
storage credentials to browser code.
 
------------------------------------------------------------------------
 
## 4. Site map and routes
 
### Public routes
 
  -----------------------------------------------------------------------
  Route                               Purpose
  ----------------------------------- -----------------------------------
  `/`                                 Homepage with four service cards,
                                      trust information, and clear calls
                                      to action
 
  `/services`                         Overview of all services
 
  `/services/training-placement`      Training options and
                                      placement-support explanation
 
  `/services/startup-support`         Startup process, eligibility, and
                                      application link
 
  `/services/marketing`               Marketing packages and inquiry CTA
 
  `/services/digitalization`          E-commerce, quick-commerce, and
                                      own-website options
 
  `/about`                            Organization story, values, and
                                      team information if supplied
 
  `/contact`                          Contact details and general inquiry
                                      form
 
  `/privacy`                          Privacy policy approved by the
                                      organization
 
  `/terms`                            Terms approved by the organization
 
  `/thank-you`                        Submission confirmation page; do
                                      not expose private application
                                      details
  -----------------------------------------------------------------------
 
### Admin routes
 
  -----------------------------------------------------------------------
  Route                               Purpose
  ----------------------------------- -----------------------------------
  `/admin/login`                      Staff sign-in
 
  `/admin`                            Summary dashboard
 
  `/admin/submissions`                Search/filter all submissions
 
  `/admin/submissions/[id]`           View one submission and its history
 
  `/admin/settings`                   Optional editable public
                                      content/settings; defer unless
                                      needed
  -----------------------------------------------------------------------
 
### Navigation
 
Desktop header: Logo, Services, About, Contact, and a primary "Get
Started" CTA.
 
Mobile navigation must be keyboard accessible and usable at narrow
widths. The footer should link to services, contact, privacy, and terms.
 
------------------------------------------------------------------------
 
## 5. Page-level requirements
 
### 5.1 Homepage
 
Recommended sections, in order:
 
1.  **Header/navigation** --- logo placeholder, links, primary CTA.
2.  **Hero** --- a concise value proposition and two CTAs such as
    "Explore Services" and "Talk to Us".
3.  **Four service cards** --- Training & Placement, Startup Support,
    Marketing Support, Digitalization.
4.  **How it works** --- Discover a service → Submit an
    inquiry/application → Team reviews → Follow-up.
5.  **Why choose us** --- use only claims the organization can
    substantiate.
6.  **Featured programs/packages** --- show only confirmed offerings.
7.  **Success stories/testimonials** --- omit or use clearly labeled
    placeholders until genuine consented content exists.
8.  **FAQ** --- answer confirmed questions; do not make up policies.
9.  **Final CTA** --- contact/inquiry.
10. **Footer** --- contact details, navigation, privacy, terms, social
    links if provided.
 
### 5.2 Training & Placement Support
 
Display two initial offering types:
 
-   **General Training**
-   **General Training + Support**
 
For each offering, the content model should support title, summary, full
description, course/domain list, duration, delivery mode, fee
(optional), eligibility, support deliverables, and CTA.
 
Possible service features, subject to confirmation:
 
-   Domain/technology training
-   Interview preparation
-   Mock interviews
-   Practical exercises or simulated IT-workspace experience
-   Placement guidance and application support
 
Do not promise guaranteed employment unless the organization has a
reviewed, explicit policy that permits such a claim.
 
CTA: **Enquire about training** → training inquiry form.
 
### 5.3 Startup Support
 
Explain the process:
 
1.  Applicant reads eligibility and terms.
2.  Applicant submits contact details, idea title/summary, a
    presentation, and pitch video URL.
3.  Team reviews the submission using internal criteria.
4.  Team updates status and contacts the applicant.
5.  Selected applicants discuss support scope and any separate written
    agreement.
 
Form fields (minimum viable set):
 
-   Full name
-   Email
-   Phone (optional unless needed)
-   Startup/idea name
-   Idea summary
-   Problem being solved
-   Target users/customers (optional)
-   Presentation file (PDF or PPTX; define maximum size)
-   Pitch video URL
-   Consent checkbox for processing the application data
-   Optional referral/source
 
Suggested status values:
 
`RECEIVED`, `UNDER_REVIEW`, `SHORTLISTED`, `NOT_SELECTED`,
`NEEDS_INFORMATION`, `CONTACTED`, `CLOSED`
 
Only staff should see internal review notes. Do not show an applicant's
private submission or status to another visitor. Applicant-facing status
tracking can be a later feature.
 
### 5.4 Marketing Support
 
The source notes mention 3-, 6-, 8-, and 12-month durations and a
separate one-time plan. Model plans as editable data, not JSX constants.
 
Each plan should support:
 
-   Name
-   Billing model (`ONE_TIME` or `RECURRING`)
-   Duration in months (nullable for one-time work)
-   Price and currency (optional until confirmed)
-   Deliverables
-   Exclusions
-   Target business type
-   CTA label
-   Active/inactive flag
-   Display order
 
Before publishing, confirm whether the one-time plan is a fixed-scope
project, a 12-month service, or something else. A duration and billing
frequency are not necessarily the same thing.
 
CTA: **Request a marketing consultation**. Defer online payments until
pricing and policies are confirmed.
 
### 5.5 Business Digitalization & E-commerce
 
Offer three clearly differentiated service options:
 
-   **E-commerce listing:** support with marketplace onboarding and
    product listings.
-   **Quick-commerce listing:** support with onboarding/listing on
    applicable platforms, subject to eligibility.
-   **Own business website:** discovery, design, development, launch,
    and optional maintenance.
 
Inquiry fields:
 
-   Contact name
-   Business name
-   Email and phone
-   Product/service category
-   Current online presence (optional)
-   Desired option
-   Approximate product count (optional)
-   Requirements/notes
-   Consent checkbox
 
Do not imply affiliation with or guaranteed acceptance by any
marketplace.
 
### 5.6 Contact
 
Fields: name, email, subject/service, message, consent. Include only
verified contact details and business hours.
 
------------------------------------------------------------------------
 
## 6. Data model
 
Use database migrations checked into version control. Prefer UUID
primary keys, timestamps in UTC, and explicit constraints.
 
### `profiles`
 
Admin/staff profile associated with the authentication user.
 
-   `id UUID PRIMARY KEY` --- matches auth user ID
-   `display_name TEXT`
-   `role TEXT NOT NULL` --- initially `ADMIN` or `STAFF`
-   `created_at TIMESTAMPTZ NOT NULL`
-   `updated_at TIMESTAMPTZ NOT NULL`
 
Public users must not be able to promote themselves to staff or modify
their own role. Provision staff access through a trusted admin process.
 
### `service_submissions`
 
Shared table for general inquiries and service-specific requests.
 
-   `id UUID PRIMARY KEY`
-   `submission_type TEXT NOT NULL` --- `TRAINING`, `MARKETING`,
    `DIGITALIZATION`, `CONTACT`
-   `status TEXT NOT NULL` --- initially `RECEIVED`
-   `full_name TEXT NOT NULL`
-   `email TEXT NOT NULL`
-   `phone TEXT NULL`
-   `business_name TEXT NULL`
-   `selected_option TEXT NULL`
-   `message TEXT NULL`
-   `source_page TEXT NULL`
-   `consent_at TIMESTAMPTZ NOT NULL`
-   `assigned_to UUID NULL REFERENCES profiles(id)`
-   `internal_notes TEXT NULL` --- admin/staff only
-   `created_at TIMESTAMPTZ NOT NULL`
-   `updated_at TIMESTAMPTZ NOT NULL`
 
Keep internal notes out of public responses and public queries.
 
### `startup_applications`
 
-   `id UUID PRIMARY KEY`
-   `status TEXT NOT NULL` --- use the startup status list above
-   `applicant_name TEXT NOT NULL`
-   `email TEXT NOT NULL`
-   `phone TEXT NULL`
-   `startup_name TEXT NOT NULL`
-   `idea_title TEXT NOT NULL`
-   `idea_summary TEXT NOT NULL`
-   `problem_statement TEXT NULL`
-   `target_customer TEXT NULL`
-   `pitch_video_url TEXT NOT NULL`
-   `presentation_object_key TEXT NOT NULL`
-   `consent_at TIMESTAMPTZ NOT NULL`
-   `internal_notes TEXT NULL`
-   `reviewed_by UUID NULL REFERENCES profiles(id)`
-   `reviewed_at TIMESTAMPTZ NULL`
-   `created_at TIMESTAMPTZ NOT NULL`
-   `updated_at TIMESTAMPTZ NOT NULL`
 
Store a private object key, not a publicly accessible file URL. Do not
put uploaded presentations in a public bucket.
 
### `marketing_plans`
 
-   `id UUID PRIMARY KEY`
-   `name TEXT NOT NULL`
-   `slug TEXT UNIQUE NOT NULL`
-   `billing_model TEXT NOT NULL`
-   `duration_months INTEGER NULL`
-   `price_minor_units BIGINT NULL` --- e.g. paise for INR; never use
    floating point for money
-   `currency CHAR(3) NOT NULL DEFAULT 'INR'`
-   `summary TEXT NOT NULL`
-   `deliverables JSONB NOT NULL DEFAULT '[]'`
-   `exclusions JSONB NOT NULL DEFAULT '[]'`
-   `is_active BOOLEAN NOT NULL DEFAULT TRUE`
-   `display_order INTEGER NOT NULL DEFAULT 0`
-   `created_at TIMESTAMPTZ NOT NULL`
-   `updated_at TIMESTAMPTZ NOT NULL`
 
### Optional later tables
 
Add only when needed:
 
-   `submission_events` --- audit trail for status changes.
-   `email_delivery_logs` --- delivery status without storing
    unnecessary email contents.
-   `site_content` --- editable CMS content.
-   `appointments` --- consultation booking.
-   `payments` and `orders` --- only after a payment workflow is
    approved.
 
### Data-model rules
 
-   Use database constraints/enums or validated string unions for
    status/type fields.
-   Add indexes for `created_at`, `status`, `submission_type`, and
    `email` where useful.
-   Store only information needed to process the inquiry.
-   Define a retention/deletion policy before launch.
-   Use migrations rather than manual-only database changes.
 
------------------------------------------------------------------------
 
## 7. Application structure
 
Suggested project layout:
 
``` text
business-services-platform/
├── BUILD_PLAN.md
├── README.md
├── CLAUDE.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── .env.example
├── public/
│   ├── images/
│   └── favicon.ico
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 0001_initial_schema.sql
│       └── 0002_rls_policies.sql
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── services/page.tsx
│   │   │   ├── services/training-placement/page.tsx
│   │   │   ├── services/startup-support/page.tsx
│   │   │   ├── services/marketing/page.tsx
│   │   │   ├── services/digitalization/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── privacy/page.tsx
│   │   │   ├── terms/page.tsx
│   │   │   └── thank-you/page.tsx
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   ├── page.tsx
│   │   │   └── submissions/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── api/
│   │   │   ├── submissions/route.ts
│   │   │   └── startup-applications/route.ts
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── site-header.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── site-footer.tsx
│   │   ├── home/
│   │   │   ├── hero-section.tsx
│   │   │   ├── service-grid.tsx
│   │   │   └── how-it-works.tsx
│   │   ├── services/
│   │   │   ├── service-card.tsx
│   │   │   ├── training-options.tsx
│   │   │   ├── marketing-plan-card.tsx
│   │   │   └── digitalization-options.tsx
│   │   ├── forms/
│   │   │   ├── contact-form.tsx
│   │   │   ├── training-inquiry-form.tsx
│   │   │   ├── marketing-inquiry-form.tsx
│   │   │   ├── digitalization-inquiry-form.tsx
│   │   │   └── startup-application-form.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── env.ts
│   │   ├── utils.ts
│   │   ├── validation/
│   │   │   ├── contact-schema.ts
│   │   │   ├── submission-schema.ts
│   │   │   └── startup-schema.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── admin.ts
│   │   ├── email/
│   │   │   └── send-notification.ts
│   │   ├── storage/
│   │   │   └── startup-files.ts
│   │   └── auth/
│   │       └── require-admin.ts
│   ├── config/
│   │   ├── site.ts
│   │   ├── services.ts
│   │   └── navigation.ts
│   └── types/
│       ├── database.ts
│       └── submissions.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```
 
This is a target structure, not a requirement to create every file at
once. Keep the structure lean and introduce folders only when they are
useful.
 
------------------------------------------------------------------------
 
## 8. Form submission and admin workflows
 
### Public submission workflow
 
1.  Browser validates required fields for immediate feedback.
2.  Server validates the same input with Zod.
3.  Server applies rate limits and spam controls.
4.  Server verifies consent and normalizes safe fields.
5.  Server writes the record to PostgreSQL.
6.  If a presentation file is required, validate and upload it to
    private storage using a server-controlled path; associate its object
    key with the application.
7.  Send applicant/team email notifications after the record is safely
    saved.
8.  Return a generic success response and redirect to `/thank-you`.
9.  If email delivery fails, preserve the submission and log the
    delivery failure. Do not lose the application because an email
    provider is temporarily unavailable.
 
Handle partial failures deliberately. For example, if the database write
fails, return a retry-friendly error without claiming success. For file
upload/database ordering, clean up orphaned objects when possible.
 
### Admin workflow
 
1.  Admin signs in through the authentication provider.
2.  Server verifies the authenticated user and role on every protected
    operation.
3.  Admin sees counts by status and recent submissions.
4.  Admin filters by type, status, and date; searches by applicant
    name/email where appropriate.
5.  Admin opens a record and sees its details.
6.  Admin updates status and adds internal notes.
7.  Status changes are recorded in an audit trail if implemented.
8.  Admin can request a signed, short-lived URL for a private
    presentation file.
9.  Unauthorized users receive an appropriate 401/403 response or a
    redirect to login.
 
Do not rely only on hiding admin links in the UI. Enforce access control
on the server and in database policies.
 
------------------------------------------------------------------------
 
## 9. Security and privacy requirements
 
Treat these as launch blockers, not optional polish.
 
-   Keep secrets in environment variables; commit only `.env.example`.
-   Never expose a Supabase service-role key in client-side code.
-   Enable Row Level Security (RLS) for tables accessible through
    Supabase APIs.
-   Public visitors may create only the intended submission types and
    may not read arbitrary submissions.
-   Only authorized staff may read submissions, internal notes, or
    update statuses.
-   Ensure users cannot self-assign an admin role.
-   Use private storage for application files and short-lived signed
    download URLs.
-   Restrict uploads to the expected extensions and MIME types; verify
    file size and content as far as practical. Never trust the
    browser-provided MIME type alone.
-   Generate storage keys on the server; do not use user-supplied paths
    as storage keys.
-   Add request rate limiting and basic bot/spam protection.
-   Validate URLs, including allowed protocols; reject `javascript:` and
    other unsafe schemes.
-   Escape/render user-provided text safely; avoid rendering raw HTML
    from submissions.
-   Use secure authentication cookies and the provider's recommended
    session handling.
-   Avoid logging secrets, full pitch contents, or unnecessary personal
    information.
-   Add a privacy notice and consent language reviewed for the
    business's jurisdiction.
-   Define retention, deletion, and access-request processes.
-   Add security headers and production HTTPS.
-   Use generic public error messages; keep diagnostic details in
    protected logs.
-   Do not put personal data in query strings or analytics events.
 
Before launch, verify the current security recommendations for the
chosen Next.js and Supabase versions.
 
------------------------------------------------------------------------
 
## 10. Design system and UX
 
### Visual direction
 
Aim for a modern, professional, approachable business-services website.
Do not overuse gradients, animations, glassmorphism, or decorative
cards.
 
Suggested starting palette (editable):
 
-   Primary: deep navy or indigo
-   Accent: teal or blue
-   Background: white/light neutral
-   Text: charcoal
-   Success/error colors: accessible, consistent semantic colors
 
### Typography and layout
 
-   Use one display font and one body font at most.
-   Set a consistent content max-width.
-   Use a spacing scale and consistent heading hierarchy.
-   Use real images with proper licensing or generated/approved assets.
-   Use subtle hover and focus states; respect reduced-motion
    preferences.
-   Make CTAs descriptive: "Enquire about training" is better than
    repeated "Click here".
 
### Accessibility
 
-   Semantic landmarks and headings.
-   Keyboard-accessible navigation, forms, dialogs, and controls.
-   Visible focus indicators.
-   Labels and useful error messages for every input.
-   Sufficient color contrast.
-   Alt text for meaningful images; empty alt text for decorative
    images.
-   Do not rely on color alone to convey status.
-   Test the site at mobile, tablet, and desktop sizes.
 
### Responsive breakpoints
 
Use Tailwind defaults unless the design needs something different. Test
at least a narrow phone width, a typical phone width, tablet, laptop,
and wide desktop.
 
------------------------------------------------------------------------
 
## 11. Environment and configuration
 
Create `.env.example` with placeholders only. Exact variable names
depend on the integration setup, but expect variables such as:
 
``` dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
 
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
 
RESEND_API_KEY=
NOTIFICATION_EMAIL=
FROM_EMAIL=
 
# Configure a provider-backed rate limiter if required.
RATE_LIMIT_PROVIDER_URL=
RATE_LIMIT_PROVIDER_TOKEN=
```
 
Rules:
 
-   Validate required environment variables at startup or at the point
    of use.
-   Fail with a clear server-side message when a required production
    variable is missing.
-   Never put secrets in variables prefixed with `NEXT_PUBLIC_`.
-   Do not use production credentials in local development.
-   Keep separate development, preview, and production environments.
-   Configure authentication redirect URLs for local, preview, and
    production origins.
-   Use test email destinations in non-production environments.
 
------------------------------------------------------------------------
 
## 12. Testing and quality gates
 
### Unit tests
 
Test:
 
-   Zod validation: valid data, missing fields, invalid email, excessive
    lengths, invalid URL, invalid file metadata.
-   Marketing plan display and formatting.
-   Status transitions and role-check helpers.
-   Environment validation.
-   Error handling for database, storage, and email failures.
 
### Integration tests
 
Test:
 
-   Valid submission persists correctly.
-   Invalid submission is rejected server-side.
-   Public callers cannot read submissions.
-   Non-admin users cannot access admin operations.
-   Admins can list, view, and update authorized records.
-   File upload rejects unsupported or oversized files.
-   Failed email delivery does not lose a saved submission.
 
### End-to-end tests
 
Minimum scenarios:
 
1.  Homepage loads and all four service cards navigate correctly.
2.  Mobile navigation opens, works by keyboard, and closes correctly.
3.  Training inquiry can be submitted.
4.  Marketing and digitalization inquiries can be submitted.
5.  Startup application validation works and a valid application is
    saved.
6.  Invalid pitch-video URLs and unsupported files are rejected.
7.  Unauthenticated user cannot access admin pages/data.
8.  Authorized admin can sign in, filter submissions, open a record, and
    update status.
9.  Form loading, success, and failure states are understandable.
10. Not-found and unexpected-error pages are usable.
 
### Required checks before each merge
 
Run the scripts configured in `package.json`, typically:
 
``` bash
npm run lint
npm run typecheck
npm run test
npm run build
```
 
If a script does not exist yet, add it or document why it is not
applicable. Run Playwright E2E tests in CI or the designated test
environment. Do not claim tests passed unless they were actually run and
passed.
 
------------------------------------------------------------------------
 
## 13. Deployment plan
 
### Local development
 
1.  Install a supported Node.js LTS version and package manager.
2.  Create the Next.js TypeScript app.
3.  Create a development Supabase project or local Supabase instance.
4.  Apply migrations.
5.  Configure `.env.local` using non-production credentials.
6.  Run the app and test the core workflows.
 
### Preview environment
 
1.  Connect the repository to the hosting platform.
2.  Configure preview environment variables.
3.  Apply migrations to a dedicated staging database.
4.  Configure auth callback URLs and email test mode.
5.  Run lint, typecheck, unit tests, build, and E2E smoke tests.
6.  Have the owner verify all service copy and forms.
 
### Production launch
 
1.  Confirm domain, SSL/HTTPS, and DNS.
2.  Set production environment variables and auth URLs.
3.  Apply reviewed database migrations.
4.  Configure email sender/domain authentication and delivery
    monitoring.
5.  Confirm storage privacy and RLS policies.
6.  Publish approved privacy/terms pages.
7.  Submit test inquiries and verify records, notifications, and admin
    access.
8.  Verify backups and a restore approach for critical data.
9.  Check logs, rate limiting, error monitoring, and rollback
    instructions.
10. Launch only after the acceptance checklist passes.
 
Keep a rollback plan for application deployments and database changes.
Prefer backward-compatible migrations where possible.
 
------------------------------------------------------------------------
 
## 14. Delivery phases and acceptance criteria
 
### Phase 0 --- Clarify and scaffold
 
**Work** - Confirm organization branding and any content that must be
real at launch. - Initialize Next.js, TypeScript, Tailwind, linting,
formatting, and testing. - Add `CLAUDE.md`, `.env.example`, and this
build plan. - Add the initial design tokens and responsive shell.
 
**Done when** - The app starts locally. - Lint, typecheck, and build
scripts work. - No secrets are committed. - The README explains setup.
 
### Phase 1 --- Public website
 
**Work** - Build header, mobile navigation, footer, homepage, service
overview, and service detail pages. - Add About, Contact, Privacy,
Terms, and Not Found pages. - Add SEO metadata and accessible responsive
layouts.
 
**Done when** - All routes render without errors. - Four services are
clearly presented. - Mobile and keyboard navigation work. - No fake
testimonials, unsupported guarantees, or invented business details
appear.
 
### Phase 2 --- Database and forms
 
**Work** - Create migrations, database types, RLS policies, validation
schemas, and server-side submission endpoints. - Implement contact,
training, marketing, digitalization, and startup forms. - Add startup
file storage in a private bucket.
 
**Done when** - Valid submissions persist. - Invalid inputs are rejected
on the server. - Public users cannot list or read other submissions. -
File validation and upload failure handling work.
 
### Phase 3 --- Notifications
 
**Work** - Integrate an email provider. - Send applicant confirmation
and staff notification templates. - Add delivery-failure logging and
retry strategy if needed.
 
**Done when** - Emails are delivered in the test environment. - Email
failure does not erase a submission. - Templates avoid leaking internal
notes or private data.
 
### Phase 4 --- Admin portal
 
**Work** - Add admin sign-in, role authorization, dashboard, filters,
submission detail, status updates, internal notes, and secure file
downloads.
 
**Done when** - Only provisioned staff can access the portal and data. -
Status changes persist. - Private files are accessible only through
authorized, expiring links. - Security tests pass.
 
### Phase 5 --- Hardening and launch
 
**Work** - Complete unit, integration, and E2E tests. - Run
accessibility and responsive checks. - Add production configuration,
logging, backup guidance, and deployment documentation. - Conduct owner
acceptance testing.
 
**Done when** - All required checks pass. - Production secrets and
policies are configured. - Legal and service content is approved. - A
production smoke test and rollback plan are documented.
 
### Later enhancements --- do not build in the MVP unless requested
 
-   Online payments and recurring billing.
-   Student/customer accounts.
-   Applicant-facing application status portal.
-   Appointment scheduling.
-   Full CRM and sales pipeline.
-   Blog/CMS and advanced SEO tools.
-   WhatsApp/SMS notifications.
-   Analytics dashboards.
-   Multilingual content.
-   Automated marketplace integrations.
 
------------------------------------------------------------------------
 
## 15. MVP acceptance checklist
 
Use this before calling the first release complete.
 
-   [ ] Homepage clearly presents all four services.
-   [ ] Each service has its own detail page and CTA.
-   [ ] Training options are described accurately.
-   [ ] Startup application accepts the required details, presentation,
    and video URL.
-   [ ] Marketing plans are shown only after duration, pricing, and
    deliverables are confirmed.
-   [ ] Digitalization page explains the three service options without
    promising marketplace approval.
-   [ ] Contact and inquiry forms have validation, loading, success, and
    error states.
-   [ ] Submission data is stored securely.
-   [ ] Uploaded presentations are private.
-   [ ] Admin login and server-side authorization work.
-   [ ] Admin can review and update submissions.
-   [ ] Privacy policy, terms, and consent language are approved.
-   [ ] No secrets or private data are exposed in client bundles or
    logs.
-   [ ] Mobile layout, keyboard navigation, and accessibility have been
    checked.
-   [ ] Lint, typecheck, unit tests, build, and E2E smoke tests pass.
-   [ ] Production email, DNS, HTTPS, backups, monitoring, and rollback
    are verified.
 
------------------------------------------------------------------------
 
## 16. Implementation rules for Claude Code
 
Follow these rules throughout the project:
 
1.  **Read before changing.** Inspect the repository and existing files
    before creating or replacing anything.
2.  **Work in phases.** Implement only the requested phase and summarize
    what changed.
3.  **Plan ambiguous work.** If a business rule is unknown, ask a
    concise question or implement a clearly marked placeholder. Never
    invent policy or pricing.
4.  **Keep changes focused.** Avoid unrelated refactors and unnecessary
    dependencies.
5.  **Use strict TypeScript.** Avoid `any`; use safe parsing and
    explicit types.
6.  **Validate on the server.** Client validation improves UX but is not
    a security boundary.
7.  **Enforce authorization server-side.** Never rely on hidden UI
    elements alone.
8.  **Protect uploaded files.** Private storage, size/type checks,
    server-generated paths, and authorized downloads are required.
9.  **Handle errors intentionally.** Give visitors useful messages and
    keep sensitive diagnostic details server-side.
10. **Test the behavior.** Add or update tests for every meaningful
    feature and bug fix.
11. **Run quality checks.** Report the actual results of lint,
    typecheck, tests, and build.
12. **Update documentation.** Keep README setup steps, environment
    variables, migrations, and deployment notes accurate.
13. **Do not claim completion prematurely.** Identify incomplete tasks,
    assumptions, and known risks in the final summary.
14. **Avoid unnecessary complexity.** Do not add microservices, queues,
    or elaborate abstractions without a demonstrated need.
15. **Use accessible components.** Inputs have labels, errors are
    announced, and controls work with keyboard navigation.
16. **Protect existing work.** Do not delete user files, rewrite
    configuration wholesale, or reset databases without explicit
    approval.
 
------------------------------------------------------------------------
 
## 17. `CLAUDE.md` starter instructions
 
Create a root `CLAUDE.md` containing project-specific instructions. Use
or adapt the following:
 
``` markdown
# Project instructions
 
Read `BUILD_PLAN.md` before implementing features.
 
## Stack
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- Supabase PostgreSQL/Auth/Storage
- Zod validation
- Vitest and Playwright
 
## Engineering rules
- Use server components by default; add client components only when interactivity requires them.
- Validate every untrusted input on the server.
- Never expose service-role keys or other secrets in client code.
- Protect admin routes and every admin data operation with server-side authorization.
- Use private storage for startup presentations.
- Do not invent business details, prices, testimonials, guarantees, or legal terms.
- Keep migrations in version control.
- Add tests for new behavior and regression cases.
- Maintain accessible labels, focus states, and responsive layouts.
- Avoid `any` and unsafe type assertions.
- Do not introduce dependencies without a clear need.
 
## Before finishing a task
Run the relevant lint, typecheck, tests, and build commands.
Report files changed, checks actually run, results, assumptions, and remaining work.
Do not state that a command passed unless it was executed successfully.
```
 
Adjust these instructions if the final stack differs.
 
------------------------------------------------------------------------
 
## 18. How to use this file with Claude Code
 
### Step 1 --- Create the repository
 
Create a new empty Git repository, then save this file as
`BUILD_PLAN.md` in the repository root.
 
### Step 2 --- Ask Claude Code to inspect and plan
 
Start with this prompt:
 
``` text
Read BUILD_PLAN.md completely and inspect the current repository.
 
Do not implement the entire application yet.
 
First:
1. Summarize the requirements and identify unresolved business decisions.
2. Propose the exact project scaffold and dependencies based on BUILD_PLAN.md.
3. Identify security-sensitive areas and how they will be handled.
4. Break Phase 0 and Phase 1 into small, verifiable tasks.
5. List the commands and tests you will run.
 
Do not invent company details, pricing, testimonials, or guarantees.
Wait for my approval before making broad changes.
```
 
### Step 3 --- Scaffold the project
 
``` text
Implement Phase 0 from BUILD_PLAN.md only.
 
Inspect existing files first. Set up the Next.js TypeScript project, Tailwind,
linting, formatting, typecheck, and test scripts. Add CLAUDE.md, README.md,
and .env.example. Use compatible stable dependency versions.
 
Do not implement database workflows or the admin portal yet.
Run the relevant checks and report the actual results.
```
 
### Step 4 --- Build the public website
 
``` text
Implement Phase 1 from BUILD_PLAN.md.
 
Build the responsive site shell, homepage, four service detail pages,
About, Contact, Privacy, and Terms pages. Use reusable components and
a consistent design system. Use placeholders for unconfirmed business
content and label them clearly. Do not add fake testimonials or unsupported
claims. Add route/component tests where appropriate.
 
Run lint, typecheck, tests, and build. Summarize changed files and results.
```
 
### Step 5 --- Add data and submissions
 
``` text
Implement Phase 2 from BUILD_PLAN.md.
 
Create reviewed SQL migrations, database types, restrictive RLS policies,
server-side Zod validation, and the public submission workflows. Keep
startup presentations in private storage and collect the pitch video as a
validated URL. Ensure public visitors cannot read submissions.
 
Add integration tests for valid submissions, invalid inputs, unauthorized
reads, file validation, and partial failures. Do not put service-role secrets
in client code. Run the relevant checks and report actual results.
```
 
### Step 6 --- Add email and admin
 
``` text
Implement Phases 3 and 4 from BUILD_PLAN.md in separate small changes.
 
First implement email templates and delivery failure handling. Then implement
admin authentication, role checks, submission filters/details, status updates,
internal notes, and expiring private-file links.
 
Test unauthorized access and role escalation attempts. Do not rely on UI
visibility for authorization. Report any configuration that requires my
manual action, such as provider credentials or auth setup.
```
 
### Step 7 --- Harden and deploy
 
``` text
Implement Phase 5 from BUILD_PLAN.md.
 
Review the entire application for security, accessibility, responsive design,
error handling, missing tests, unsafe environment-variable usage, and
production configuration. Fix issues within scope. Document local setup,
database migrations, environment variables, deployment, backups, smoke tests,
and rollback.
 
Run all available checks. Clearly separate verified results from anything
that still requires manual configuration or production verification.
```
 
### Step 8 --- Work like a software engineer
 
For each phase:
 
1.  Review the plan before accepting a large diff.
2.  Inspect the code and tests changed.
3.  Run the application locally.
4.  Verify the actual user journey in the browser.
5.  Commit a small, coherent change.
6.  Keep the build plan and README updated.
7.  Move to the next phase only when the current phase's acceptance
    criteria pass.
 
Claude Code can generate and modify code, but you must still review
security-sensitive changes, configure external services, verify
deployment settings, and approve business/legal content.
 
------------------------------------------------------------------------
 
## 19. First task to execute
 
The first concrete task is **Phase 0: project scaffold**. Do not start
with payments or a complicated admin dashboard.
 
Recommended initial milestone:
 
-   A running Next.js TypeScript app.
-   A polished responsive homepage.
-   Four service cards linking to service pages.
-   A consistent header/footer and contact CTA.
-   Strict lint/typecheck/build commands.
-   A documented `.env.example` and setup guide.
 
Once this is stable, add database persistence, secure forms, startup
file submissions, email, and the admin portal incrementally.
 
------------------------------------------------------------------------
 
## 20. Final product definition
 
The intended first release is a **business-services website with secure
inquiry/application collection and a staff-only submission dashboard**.
It is not initially a full e-commerce store, learning management system,
payment platform, or startup investment marketplace.
 
That boundary keeps the first release achievable while leaving room to
add payments, student accounts, bookings, content management, and
integrations after the business workflows are validated.
 