# Deployment

The production image is the `runner` stage of the `Dockerfile`: Next.js
standalone output running as a non-root user, with a health check. It needs a
PostgreSQL database, somewhere to put private files, and an SMTP relay.

```bash
docker build --target runner -t business-services-platform:TAG .
```

---

## Required configuration

Every variable is validated at startup; a missing or malformed value fails the
container with a message naming it. Full reference in `.env.example`.

```dotenv
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example

DATABASE_URL=postgres://app_user:<password>@host:5432/business_services
DATABASE_ADMIN_URL=postgres://owner:<password>@host:5432/business_services
APP_DB_USER=app_user
APP_DB_PASSWORD=<password>
DATABASE_SSL_MODE=require

SESSION_COOKIE_SECRET=<48+ random bytes, base64url>
SESSION_TTL_HOURS=12

NEXT_PUBLIC_MAX_PRESENTATION_MB=4
DOWNLOAD_LINK_TTL_SECONDS=300

SMTP_HOST=<relay>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<user>
SMTP_PASSWORD=<password>
FROM_EMAIL=no-reply@your-domain.example
NOTIFICATION_EMAIL=team@your-domain.example

RATE_LIMIT_SUBMISSIONS_PER_HOUR=8
RATE_LIMIT_LOGIN_ATTEMPTS_PER_15_MIN=10
```

Generate the session secret with:

```bash
docker run --rm node:22-bookworm-slim \
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Rotating it invalidates every signed-in staff session, which is the intended
response to a suspected session compromise.

### Two database URLs

`DATABASE_URL` is the application's `NOINHERIT` login role. `DATABASE_ADMIN_URL`
is the schema owner and is used **only** by the scripts in `scripts/` — never to
serve a request. In a hardened deployment, inject the admin URL only into the
migration job, not into the web container.

### Storage needs no configuration

Uploaded presentations are stored in PostgreSQL alongside everything else, so
there is no bucket, volume or object store to provision. The only knob is
`NEXT_PUBLIC_MAX_PRESENTATION_MB`, which bounds how much database storage a
single application can consume — see `docs/ARCHITECTURE.md` for the trade-off
and when to revisit it.

---

## Preview environment

1. Point the build at a staging database — never the production one.
2. Run migrations, then `scripts/seed.ts`.
3. Run the full gate: `docker compose -f docker-compose.test.yml run --rm ci`.
4. Provision one staff account with `scripts/create-staff.ts`.
5. Use a sink or a test-only inbox for `NOTIFICATION_EMAIL`. Never point a
   preview environment at a real mailbox.
6. Have the owner review every page of service copy against
   `docs/CONTENT_PLACEHOLDERS.md`.

---

## Production launch

Work through this in order. Items 1–4 are prerequisites, not checks.

**1. Content.** `docs/CONTENT_PLACEHOLDERS.md` must be clear, and
`siteConfig.hasUnconfirmedContent` must be set to `false` only once it is.

**2. Database.** Apply migrations with the owner connection. Confirm the three
task roles exist and that the login role is `NOINHERIT`:

```sql
SELECT rolname, rolinherit, rolcanlogin FROM pg_roles
 WHERE rolname IN ('app_user','app_public','app_auth','app_staff');
```

`app_user` must show `rolinherit = false`. If it shows `true`, the fail-closed
guarantee is not in effect — re-run the migration script.

**3. Email.** Configure SPF, DKIM and DMARC for the sending domain, then send a
real test to an external address and inspect the headers. Submissions survive
email failure by design, but a silently undelivered acknowledgement still looks
like being ignored.

**4. Verify after deploying.**

```bash
curl -fsS https://your-domain.example/api/health            # {"status":"ok"}
curl -sI https://your-domain.example | grep -i strict-transport
curl -sI https://your-domain.example | grep -i content-security-policy
curl -s  https://your-domain.example/admin -o /dev/null -w '%{http_code}\n'
```

Then by hand: submit one inquiry of each of the four types and confirm each
record appears in the admin portal with the reference code the visitor was
shown; confirm the acknowledgement email arrives; confirm `/admin` redirects to
sign-in when signed out; sign in, change a status, and confirm the history
records it.

**5. Operational checks.** Confirm logs are being collected, confirm the
container health check is wired to the orchestrator, and confirm a database
backup has actually been taken — not merely scheduled.

---

## Backups

Everything that cannot be reconstructed is in **PostgreSQL**: submissions,
applications, uploaded presentations, staff accounts and audit history. One
backup covers all of it, and a restore cannot leave a row pointing at a missing
file, because the file is in the same row's table.

Restore into a scratch environment and open a startup application end to end
before trusting the procedure — an untested backup is not a backup. Note that
presentations make the dump considerably larger than the row count suggests.

Define a retention period before launch, publish it in the privacy policy, and
set `siteConfig.legal.dataRetentionPeriod` to match. There is no automatic
deletion job yet; add one when the period is agreed.

---

## Rollback

**Application.** Deploy the previous image tag. The runtime holds no state, so
this is safe at any time.

**Database.** Migrations are forward-only and have no down scripts, which is
deliberate: a generated down-migration is a false sense of safety. Prefer
backward-compatible changes — add a nullable column, deploy, backfill, then
tighten in a later migration — so the previous image keeps working against the
new schema and an application rollback never needs a database rollback.

If a migration must be undone, restore from backup and replay. Rehearse this
against a copy before you need it.

**Session secret.** Rotating `SESSION_COOKIE_SECRET` signs out every staff
member immediately. That is the correct first move on a suspected session
compromise; there is no partial revocation.
