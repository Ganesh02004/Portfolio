# Accessibility

What this site commits to, how it is built, and which of it is actually tested.

---

## Commitments

**Target:** WCAG 2.2 Level AA.

- Every interactive element is reachable and operable by keyboard alone.
- Focus is always visible.
- Every form control has a real, programmatically associated label.
- Errors are announced, not merely coloured.
- State is never conveyed by colour alone.
- Motion respects `prefers-reduced-motion`.
- The layout works from a 320px phone to a wide desktop without horizontal
  scrolling.

---

## How it is built

### Structure

Each page has one `<h1>` and a heading order that does not skip levels.
`<header>`, `<nav>`, `<main>` and `<footer>` are real landmarks, each `<nav>`
has an `aria-label`, and every major section is a labelled region. A skip link
is the first focusable element on every route and moves focus to `<main>`.

Lists that are genuinely ordered — the "How it works" steps, the startup process
— are `<ol>`, and the step number is repeated in the heading for screen readers
rather than existing only as a decorative badge.

### Forms

`src/components/ui/field.tsx` is the single source of this behaviour, so no form
can diverge from it:

- `<label for>` paired with the control's id.
- Optional fields are marked "(optional)" in text. The requirement is never
  implied by a bare asterisk alone.
- Errors use `role="alert"`, so they are announced when they appear, and are
  wired through `aria-describedby` alongside any hint.
- `aria-invalid` is set as well as the red border.
- `noValidate` on the form suppresses native bubbles, because they conflict with
  the inline messages; validation still runs, just ours.

The honeypot is positioned off-screen *and* `aria-hidden` *and* `tabIndex={-1}`,
so it is invisible to sighted users, screen readers and keyboard users alike —
only an automated client fills it.

### Mobile navigation

Hand-written rather than taken from a library, so the behaviour is explicit:
`aria-expanded` on the trigger, `role="dialog"` with `aria-modal` on the panel,
Escape closes it and returns focus to the trigger, Tab is trapped inside while
open, body scroll is locked, and the panel is removed from the tree when closed.
A route change closes it.

### Colour and contrast

One palette, defined as tokens in `src/app/globals.css`. Body text is
`ink-800` on white (about 13:1); secondary text is `ink-600` (about 8:1);
`ink-500` is used only at sizes where it still clears AA. Status badges pair
every colour with its own label text, so "Shortlisted" reads as "Shortlisted"
whether or not green means anything to the reader.

### Motion and typography

Transitions are short and limited to colour and opacity; a
`prefers-reduced-motion` block reduces every animation and transition to
effectively zero and disables smooth scrolling. Type uses a system font stack —
no webfont request, so text renders immediately and never reflows, and
`text-wrap: balance` and `pretty` keep headings and paragraphs from breaking
awkwardly.

### Icons and images

Decorative SVGs are `aria-hidden` and sit beside a text label. There are no
content images yet; when real photography is added it needs alt text that
conveys the information, or an empty `alt` if it is decorative.

---

## What is tested automatically

`tests/e2e/responsive.spec.ts`, run in a real browser at both desktop and
Pixel 5 viewports:

| Check | Assertion |
| --- | --- |
| Skip link | Is the first Tab stop and moves focus to `#main` |
| Keyboard-only form completion | The contact form is filled and submitted using Tab, typing, Space and Enter only |
| Accessible names | Every non-hidden `input`, `select` and `textarea` on three form pages has an associated label or `aria-label` — the test fails with a list of offenders |
| Visible focus | A focused CTA has a computed `outline-width` greater than zero |
| Mobile nav | Opens, reports `aria-expanded`, closes on Escape with focus restored, traps Tab, closes on scrim tap, closes on navigation |
| No horizontal overflow | Ten routes are each checked for `scrollWidth - clientWidth <= 2` |

`tests/unit/components.test.tsx` covers the primitives: label association,
`aria-describedby` wiring, `aria-invalid`, `role="alert"`, keyboard operation of
the checkbox, one tab stop per service card, and that each status badge renders
readable text.

---

## What is not tested

Stated plainly rather than left to assumption.

| Gap | Note |
| --- | --- |
| **Screen reader testing** | No manual pass with NVDA, JAWS or VoiceOver. Automated checks cannot tell you whether a page is *understandable*. |
| **Automated rule scanning** | No axe-core or Lighthouse audit is wired in. Adding `@axe-core/playwright` to the browser suite is the cheapest next improvement. |
| **Measured contrast** | Ratios above are from the token definitions, not from a contrast checker run against rendered output. |
| **Zoom to 400%** | Not verified. |
| **Windows High Contrast / forced colors** | Not verified. |
| **Voice control and switch access** | Not verified. |
| **Real assistive-technology users** | No testing with disabled users, which is the only way to find the problems the above would miss. |

## Before launch

1. Add `@axe-core/playwright` and assert zero violations on each public route.
2. Do one manual screen-reader pass of the homepage, one service page, a form,
   and the admin submission detail.
3. Check the four service pages at 400% zoom.
4. Verify any real photography has appropriate alt text.
5. Re-check contrast against the final brand palette, not the placeholder one.
