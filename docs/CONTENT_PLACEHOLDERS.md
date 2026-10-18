# Content awaiting confirmation

**This site must not be published to a real audience until this checklist is
clear.** Everything below is a business decision, not an engineering task. The
software is complete; the content is not.

While `siteConfig.hasUnconfirmedContent` is `true`, every page carries a notice
saying the service details, pricing and legal terms are placeholders and are not
an offer. Clearing that flag before this checklist is done would publish
unapproved terms as though they were final.

Nothing here has been invented to fill a gap. No testimonial, client logo,
success metric, course credential, team biography or guarantee appears anywhere
in this repository, because none were supplied.

---

## Launch blockers

### Organization identity
`src/config/site.ts`

- [ ] Registered business name → `siteConfig.name`
- [ ] Logo (replaces the geometric placeholder in `src/components/layout/logo.tsx`)
- [ ] Domain and production URL → `NEXT_PUBLIC_SITE_URL`
- [ ] Brand colours, if the navy/teal palette is not wanted → `src/app/globals.css`
- [ ] Contact email → `siteConfig.contact.email`
- [ ] Phone number → `siteConfig.contact.phone`
- [ ] Office address, if one is published → `siteConfig.contact.address`
- [ ] Business hours → `siteConfig.contact.hours`
- [ ] Social profile URLs, if any → `siteConfig.social`

Until contact details exist, the footer and contact page say so and point to the
form rather than showing a fabricated number.

### Legal identity
`src/config/site.ts` → `siteConfig.legal`

- [ ] Registered entity name
- [ ] Registration number
- [ ] Jurisdiction / governing law
- [ ] Privacy contact address
- [ ] **Retention period for submissions** — then publish it and set
      `dataRetentionPeriod`
- [ ] Legal review of `/privacy` and `/terms`

Both legal pages currently carry a visible "pending legal review" notice. They
describe what the software actually does, which is verifiable from the code, but
they state no governing law and no statutory rights.

### Training & placement
`src/config/services.ts` → `training-placement.pendingConfirmation`

- [ ] Course and technology list
- [ ] Syllabus and delivery mode (in person / online / hybrid)
- [ ] Programme duration and schedule
- [ ] Fees, instalment options, refund terms
- [ ] Eligibility requirements
- [ ] Exactly what "placement support" includes and excludes

The page states plainly that employment is not guaranteed. **Do not remove that
unless a reviewed written policy permits a stronger claim** — and if it does,
have it reviewed again.

### Startup support
`src/config/services.ts` → `startup-support.pendingConfirmation`

- [ ] Applicant eligibility criteria
- [ ] Evaluation criteria and how submissions are scored
- [ ] What selected applicants actually receive
- [ ] Whether any written agreement applies, and its terms
- [ ] Review turnaround time
- [ ] Whether a confidentiality undertaking is offered before submission

The terms page states that submitting transfers no rights, equity or ownership
and creates no partnership. Any equity or revenue-share arrangement needs legal
drafting before it is mentioned anywhere on the site.

### Marketing
`db/seed/marketing-plans.json`, then re-run `scripts/seed.ts`

- [ ] Confirm the durations. The notes mention 3, 6, 8 and 12 months plus a
      separate one-time plan — all five are seeded as placeholders.
- [ ] **Decide what the one-time plan actually is**: a fixed-scope project, or a
      term of service? The notes are ambiguous, and a duration and a billing
      frequency are not the same thing.
- [ ] Price per plan → `price_minor_units` **in minor units** (paise for INR)
- [ ] Deliverables per plan
- [ ] Exclusions per plan
- [ ] Target business type per plan
- [ ] Renewal and cancellation terms
- [ ] Set `is_pricing_confirmed: true` only for plans whose price is approved

No price is rendered unless `is_pricing_confirmed` is true **and** a price is
present. Filling in a number alone will not publish it.

### Digitalization
`src/config/services.ts` → `digitalization.pendingConfirmation`

- [ ] Which marketplaces are supported
- [ ] Which quick-commerce platforms are supported
- [ ] What platform onboarding includes
- [ ] Website build scope, timeline and pricing
- [ ] Whether ongoing maintenance is offered, and on what terms

The page states that this organization is not affiliated with or an agent of any
platform and cannot guarantee acceptance. That must stay unless a genuine
partner agreement exists.

---

## Optional, once the above is done

- [ ] Real testimonials — with written consent from each person quoted
- [ ] Client logos — with permission to use each mark
- [ ] Team biographies and credentials
- [ ] Case studies with figures the business can substantiate
- [ ] Photography, properly licensed

Add these through `src/config/` and new components. Do not add a "Success
stories" section with illustrative examples: labelled or not, it reads as a
claim.

---

## Clearing the notice

Once every launch blocker above is resolved:

1. Set `siteConfig.hasUnconfirmedContent = false`.
2. Empty each service's `pendingConfirmation` array in
   `src/config/services.ts` — the "Details we confirm with you directly" block
   disappears on its own when the array is empty.
3. Remove the pending-review callouts from `/privacy` and `/terms`.
4. Re-run the full gate; the browser suite asserts the notice is present, so
   that test will need updating to match the new state.
5. Review every page once more in a browser before announcing the site.
