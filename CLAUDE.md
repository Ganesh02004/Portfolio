# Project instructions

Read `BUILD_PLAN.md` for the requirements and `docs/ARCHITECTURE.md` for the
decisions before changing anything structural.

## Everything runs in Docker

There is no local Node.js step. Do not run `npm` on the host.

```bash
# Development stack
docker compose --env-file .env.docker up

# Full gate: format, lint, typecheck, migrate, unit, integration, build, e2e
docker compose -f docker-compose.test.yml run --rm ci

# Browser tests only, while iterating
docker compose -f docker-compose.test.yml run --rm --entrypoint sh ci \
  scripts/e2e-only.sh tests/e2e/forms.spec.ts --project=desktop-chromium

# Formatting fixes
docker run --rm -v "$PWD:/app" -v /app/node_modules -w /app \
  business-services-platform-test-ci npx prettier --write .
```

The test image must be rebuilt after changing files it copies:
`docker compose -f docker-compose.test.yml build ci`.

## Stack

Next.js 15 App Router · React 19 · TypeScript strict · Tailwind CSS 4 · Zod 3 ·
React Hook Form · PostgreSQL 16 with plain SQL migrations · self-hosted sessions
(scrypt) · Nodemailer · Vitest · Playwright.

## Engineering rules

- **Server components by default.** Add `'use client'` only where interactivity
  genuinely requires it.
- **Validate every untrusted input on the server.** Client validation is for
  usability. It is never a security boundary.
- **Pick a database role.** All access goes through `asPublic`, `asAuth` or
  `asStaff` from `src/lib/db/client.ts`. Never query outside one of those.
- **No `RETURNING` on the public insert path.** Under RLS it requires a SELECT
  policy, which would let `app_public` read submissions back. Generate ids in
  application code — see `src/lib/db/submissions.ts`.
- **Authorize on the server, every time.** `requireStaffPage()` for pages,
  `requireStaff()` for route handlers and server actions. Hiding a link is not
  access control.
- **Private files stay private.** Uploaded presentations are `BYTEA` rows in
  PostgreSQL, written in the same transaction as the application. Verify the
  content signature, never trust the browser's MIME type, and never serve the
  bytes from anywhere but the authenticated download route.
- **One stateful dependency.** PostgreSQL. Do not introduce an object store, a
  cache, a queue or a volume without a demonstrated need — the deployment story
  depends on there being nothing else to provision.
- **Never invent business content.** No prices, testimonials, client names,
  timelines, credentials or guarantees unless the owner supplied them. If
  something is unknown, add it to `pendingConfirmation` in
  `src/config/services.ts` or to `docs/CONTENT_PLACEHOLDERS.md`.
- **No `any`, no unsafe assertions.** The one exception is the row-mapping
  helpers in `src/lib/db/`, which are scoped with an eslint-disable comment.
- **Migrations are forward-only.** Never edit an applied migration — the runner
  verifies checksums and will refuse. Add a new file.
- **Money is integer minor units.** Never a float, anywhere.
- **Don't add a dependency** without a clear need the standard library or an
  existing dependency cannot meet.

## Accessibility

Use the primitives in `src/components/ui/field.tsx` rather than raw inputs; they
carry the label association, `aria-describedby`, `aria-invalid` and
`role="alert"` wiring. Keep one `<h1>` per page, keep focus visible, and never
convey state by colour alone.

## Tests

Add or update tests for every behaviour change.

- `tests/unit` — logic and components. Fast, no services.
- `tests/integration` — real Postgres and real storage. This is where database
  policies, role restrictions and failure handling are proven. Do not mock these;
  a mock will simply agree with whatever the code believes.
- `tests/e2e` — real browser against a production build.

When writing browser tests, target records by their seeded reference code rather
than "the first row", and scope locators to a form's region — several field
labels overlap with section headings and with the consent checkbox text.

## Before finishing a task

Run the full gate and report what actually happened: files changed, which checks
ran, their real results, any assumptions, and anything still incomplete. Do not
report a command as passing unless it was executed and passed.
