# Business Services Platform

A responsive business-services website with secure inquiry/application collection
and a staff-only submission dashboard. Built from [`BUILD_PLAN.md`](BUILD_PLAN.md).

Four services are presented publicly — IT training & placement support, startup
support, marketing support, and business digitalization & e-commerce — each with
its own page and inquiry form. Submissions land in PostgreSQL; startup
presentations are stored privately in that same database; staff review and
triage everything from a protected admin area.

**Everything runs in Docker.** There is no local Node.js step: the development
stack, the migrations, the tests and the production image are all built and run
in containers.

---

## Quick start

Requires Docker with Compose v2. Nothing else.

```bash
# 1. Start Postgres, the SMTP sink, run migrations and start the app
docker compose --env-file .env.docker up

# 2. In a second terminal, create a staff account
docker compose --env-file .env.docker run --rm cli \
  npx tsx scripts/create-staff.ts \
    --email you@example.com --name "Your Name" --role ADMIN
```

The generated password is printed once — store it before closing the terminal.

| What | Where |
| --- | --- |
| Public site | <http://localhost:3000> |
| Staff portal | <http://localhost:3000/admin/login> |
| Email sink (Mailpit) | <http://localhost:8025> |
| Health check | <http://localhost:3000/api/health> |
| Postgres | `localhost:55432` |

Stop with `docker compose --env-file .env.docker down`, or `down -v` to discard
the database — and with it the submissions and uploaded presentations — as well.

> `--env-file .env.docker` is required because the committed defaults live there
> rather than in `.env`, which is gitignored so that real credentials can never
> be committed by habit.

### Networks that intercept TLS

Corporate proxies that terminate TLS will break `npm ci` inside the image. Drop
the proxy's root CA (PEM, `.crt` extension) into `docker/certs/` and rebuild —
the base image stage installs anything it finds there. The directory is
gitignored apart from its `.gitkeep`, because the certificate is specific to one
network.

On Windows, export it with:

```powershell
$c = Get-ChildItem Cert:\LocalMachine\Root |
     Where-Object { $_.Subject -match 'YourProxyName' } | Select-Object -First 1
$pem = "-----BEGIN CERTIFICATE-----`n" +
       [Convert]::ToBase64String($c.RawData,'InsertLineBreaks') +
       "`n-----END CERTIFICATE-----`n"
Set-Content docker/certs/proxy-root-ca.crt $pem -Encoding ascii
```

---

## Deploying

**The only thing you provision is one PostgreSQL database.** No object store,
no bucket, no disk, no background worker — uploaded presentations are stored in
the database too.

| Platform | Status | Guide |
| --- | --- | --- |
| **Vercel** (free Hobby tier) | Works, no code changes | [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) |
| **Render** (free tier) | Works, no code changes | [`docs/DEPLOY_RENDER.md`](docs/DEPLOY_RENDER.md) |
| Any Docker host | Works | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |

Both were verified against a container running with a **completely read-only
filesystem** and no storage service — how a serverless platform runs your code.

```bash
docker build --target runner -t business-services-platform .
```

## Running the checks

One command runs the whole gate — format, lint, typecheck, migrations, unit
tests, integration tests, production build and browser tests — against
throwaway Postgres and SMTP services on an isolated network:

```bash
docker compose -f docker-compose.test.yml run --rm ci
```

It prints a pass/fail line per stage and exits non-zero if any stage failed.

To iterate on just the browser tests without re-running everything:

```bash
docker compose -f docker-compose.test.yml run --rm --entrypoint sh ci \
  scripts/e2e-only.sh tests/e2e/forms.spec.ts --project=desktop-chromium
```

### What each suite covers

| Suite | Count | What it proves |
| --- | --- | --- |
| Unit (`tests/unit`) | 134 | Validation rules, password hashing, file-signature detection, upload limits, environment validation, email templates, UI components |
| Integration (`tests/integration`) | 77 | Real Postgres: role separation, row level security, constraints, transaction rollback, byte-exact presentation round trip, signed-link forgery, email failure handling, rate limiting |
| End-to-end (`tests/e2e`) | 97 | Real browser against a production build: navigation, every form, admin authorization, private file download, mobile navigation, keyboard operation, security headers |

The integration suite deliberately uses a real database rather than mocks. The
central claims of this design — that a public visitor *cannot* read a
submission or a presentation, that staff *cannot* escalate their own role or
delete evidence, that a tampered download link *is* refused — are properties of
PostgreSQL's behaviour, and a mock would simply agree with whatever the code
believed.

---

## Architecture

```
Visitor browser
  │
  ├── Public pages (server-rendered)
  │     Home · Services ×4 · About · Contact · Privacy · Terms
  │
  └── POST /api/submissions · POST /api/startup-applications
        │  rate limit → Zod validation → honeypot → persist → email
        │
        ├──► PostgreSQL          role app_public — INSERT only, no SELECT.
        │                        Presentation bytes land in the SAME
        │                        transaction, so no orphan can exist.
        └──► SMTP                sent after the response; failure logged,
                                 submission preserved

Staff browser
  │
  └── /admin/* — every page and action re-checks the session server-side
        │
        ├──► PostgreSQL          role app_staff — read + triage, cannot
        │                        change roles or delete records
        └──► GET /api/admin/presentations?token=…
                                 session + HMAC + expiry, all three required.
                                 Nothing else serves these bytes.
```

Full rationale — why Supabase was swapped out, and why presentations live in
the database — is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS 4, system font stack, no webfont requests |
| Validation | Zod 3, shared between browser and server |
| Forms | React Hook Form |
| Database | PostgreSQL 16, plain SQL migrations, no ORM. The only stateful dependency. |
| Auth | Self-hosted sessions: scrypt hashing, DB-backed sessions, httpOnly cookies |
| Storage | Uploaded presentations as `BYTEA` in PostgreSQL — no second service |
| Email | Nodemailer over SMTP; Mailpit locally |
| Tests | Vitest, Testing Library, Playwright |

### Project layout

```
db/migrations/     numbered SQL, applied in order, checksum-verified
db/seed/           marketing plan content
docker/certs/      corporate TLS roots (gitignored)
docs/              architecture, security, deployment, content checklist
scripts/           migrate · seed · create-staff · ci.sh
src/app/(public)/  public routes
src/app/admin/     protected routes + server actions
src/app/api/       submission endpoints, health, private download
src/components/    layout · home · services · forms · ui · admin
src/config/        site identity, service catalogue, navigation
src/lib/           env · db · auth · validation · storage · email · rate-limit
tests/             unit · integration · e2e
```

---

## Operations

All of these run through the `cli` service, which uses the same image as the app:

```bash
CLI="docker compose --env-file .env.docker run --rm cli"

$CLI npx tsx scripts/migrate.ts                    # apply pending migrations
$CLI npx tsx scripts/migrate.ts --reset            # drop and recreate (dev only)
$CLI npx tsx scripts/seed.ts                       # upsert marketing plans
$CLI npx tsx scripts/create-staff.ts --help        # provision a staff account
```

Migrations are idempotent and record a checksum per file. Editing a migration
that has already been applied is refused — add a new one instead.

### Changing marketing plans

Plans are data, not code. Edit [`db/seed/marketing-plans.json`](db/seed/marketing-plans.json)
and re-run `scripts/seed.ts`. A price is only ever rendered when
`is_pricing_confirmed` is `true` **and** a price is present, so an unapproved
figure cannot reach the public page by accident.

---

## Before this goes live

This release is complete as software and **not ready to publish as a business
site**. Service descriptions, pricing, legal terms and contact details are
placeholders pending owner confirmation, and the site shows a standing preview
notice saying so.

[`docs/CONTENT_PLACEHOLDERS.md`](docs/CONTENT_PLACEHOLDERS.md) is the checklist.
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) covers production configuration,
backups, smoke tests and rollback.

---

## Documentation

| Document | Contents |
| --- | --- |
| [`BUILD_PLAN.md`](BUILD_PLAN.md) | The original requirements and delivery plan |
| [`CLAUDE.md`](CLAUDE.md) | Working rules for anyone (or anything) editing this repo |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Decisions, deviations from the plan, and why |
| [`docs/SECURITY.md`](docs/SECURITY.md) | The security model and what is verified by which test |
| [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) | Step-by-step deploy to Vercel's free tier |
| [`docs/DEPLOY_RENDER.md`](docs/DEPLOY_RENDER.md) | Step-by-step deploy to Render's free tier |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Platform-agnostic production configuration, backups, rollback |
| [`docs/CONTENT_PLACEHOLDERS.md`](docs/CONTENT_PLACEHOLDERS.md) | Launch-blocking content decisions |
| [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | Accessibility commitments and how they are tested |
