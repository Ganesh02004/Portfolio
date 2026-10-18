# Deploying to Vercel (free tier)

**Yes, this works on Vercel's free Hobby plan, with no code changes.**

You need exactly one thing besides the Vercel project: **a PostgreSQL
database.** There is no object store, no bucket, no S3, no disk and no
background worker. Uploaded startup presentations are stored in the same
database as everything else.

A database is unavoidable — a site that collects applications and shows them in
a staff dashboard has to keep them somewhere. You create it from inside the
Vercel dashboard in two clicks, on a free plan, and Vercel wires the connection
string into the project for you.

Verified locally against a container with a **completely read-only filesystem**
and no storage service, which is how Vercel runs your code: health check green,
all four inquiry forms working, presentation upload and download working, and
the full 59-test browser suite passing. Only the Vercel dashboard clicks
themselves are unverified.

---

## Step 1 — Push the repository

Push to GitHub, GitLab or Bitbucket. Nothing needs changing first.

## Step 2 — Create the database

In the Vercel dashboard: **Storage → Create Database → Postgres** (Neon). Pick
the free plan and the region nearest your users.

Vercel adds the connection variables to your project automatically. From the
database page, copy two things:

- The **pooled** connection string — the host contains `-pooler`. This is what
  the app uses. Serverless functions open many short-lived connections, and the
  pooler is what stops that exhausting the database.
- The **direct** (unpooled) connection string. You will use this once, from
  your machine, to create the schema.

> Neon's free tier includes 0.5 GB. Presentations live in the database and are
> capped at 4 MB each, so that is roughly 125 applications before you need a
> paid plan. Section "Watch the database size" below covers what to do about it.

## Step 3 — Create the schema

Migrations are not part of the build, deliberately: changing a database schema
should be a decision, not a side effect of pushing code. Vercel's build step
also has no business holding owner credentials.

Run it once from your machine with Docker:

```bash
docker build --target tooling -t bsp-tooling .

docker run --rm \
  -e DATABASE_ADMIN_URL="<DIRECT connection string>?sslmode=require" \
  -e APP_DB_USER=app_user \
  -e APP_DB_PASSWORD="<invent a strong password and keep it>" \
  bsp-tooling npx tsx scripts/migrate.ts
```

Expected:

```
[migrate] applying 0001_initial_schema.sql … done
[migrate] applying 0002_roles_and_policies.sql … done
[migrate] applying 0003_presentations_in_database.sql … done
[migrate] applied 3 migration(s)
[migrate] provisioned login role app_user
```

Then load the marketing plan content:

```bash
docker run --rm \
  -e DATABASE_ADMIN_URL="<DIRECT connection string>?sslmode=require" \
  bsp-tooling npx tsx scripts/seed.ts
```

This needs `CREATEROLE` but **not** superuser. Neon grants it. If you see
`permission denied to create role`, see the fallback in
[`DEPLOY_RENDER.md`](DEPLOY_RENDER.md#step-2--run-the-migrations) — the same
four `CREATE ROLE` statements apply.

### Build the app's connection string

Take the **pooled** string and swap in the app role. If Vercel gives you:

```
postgresql://neondb_owner:AbC123@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require
```

the app uses:

```
postgresql://app_user:<your app password>@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require
```

Same host, same database, different user. The app never connects as the owner —
it connects as a role that cannot read back a submission it did not just create,
and cannot change anyone's staff role.

## Step 4 — Import the project

**Add New → Project**, pick the repository, and accept the detected Next.js
settings. Do not change the build command or output directory. Before clicking
Deploy, add the environment variables below.

## Step 5 — Environment variables

Generate the session secret first:

```bash
docker run --rm node:22-bookworm-slim \
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Add these to the project (Production, Preview and Development):

```dotenv
DATABASE_URL=postgresql://app_user:<app password>@<pooled host>/<db>?sslmode=require
DATABASE_SSL_MODE=require

SESSION_COOKIE_SECRET=<the generated value>
SESSION_TTL_HOURS=12

NEXT_PUBLIC_SITE_URL=https://<your-project>.vercel.app

NEXT_PUBLIC_MAX_PRESENTATION_MB=4
DOWNLOAD_LINK_TTL_SECONDS=300

SMTP_HOST=<your relay>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<user>
SMTP_PASSWORD=<password>
FROM_EMAIL=no-reply@<your domain>
NOTIFICATION_EMAIL=<where staff notifications go>

RATE_LIMIT_SUBMISSIONS_PER_HOUR=8
RATE_LIMIT_LOGIN_ATTEMPTS_PER_15_MIN=10
```

What matters and why:

- **`NEXT_PUBLIC_SITE_URL` must be your real `https://` URL.** The session
  cookie's security attributes follow the scheme: on `https` it uses the
  hardened `__Host-` prefix. Set it to `http://...` and you will get a startup
  warning and a weaker cookie. It is also used for the links in outgoing email.
- **`NEXT_PUBLIC_MAX_PRESENTATION_MB` must stay at 4 or below.** Vercel caps a
  function's request body at 4.5 MB, and a file the platform rejects never
  reaches the application — the visitor would see a bare network error instead
  of a useful message. The default is 4 for exactly this reason.
- **Do not set `DATABASE_ADMIN_URL`.** The owner connection belongs only to the
  migration step you ran from your machine. The app never needs it.
- **Do not set `PORT`.** Vercel manages it.

### If you have no SMTP relay yet

Deploy anyway. Put any reachable host in `SMTP_HOST` and accept that email will
fail. **Submissions are still saved** — email is sent after the response, so a
dead relay costs nothing in latency, delivery failures are recorded in
`email_delivery_logs`, and the admin dashboard shows a banner counting them.
Applicants simply will not get an acknowledgement until you configure a relay.

Verified: with SMTP pointed at a closed port, a submission still returns
`201` in **168 ms**.

## Step 6 — Deploy, then create your staff account

Deploy. When it is live:

```bash
curl https://<your-project>.vercel.app/api/health
# {"status":"ok","checks":{"database":true}}
```

If `database` is `false`, check `DATABASE_URL` — most often a missing
`?sslmode=require`, or the unpooled host used by mistake.

Create your account from your machine:

```bash
docker run --rm \
  -e DATABASE_ADMIN_URL="<DIRECT connection string>?sslmode=require" \
  -e STAFF_PASSWORD="<choose a strong password>" \
  bsp-tooling npx tsx scripts/create-staff.ts \
    --email you@example.com --name "Your Name" --role ADMIN
```

Sign in at `https://<your-project>.vercel.app/admin/login`. There is no
self-signup; accounts exist only because an administrator ran that command.

## Step 7 — Check it

```bash
BASE=https://<your-project>.vercel.app
curl -s $BASE/api/health
curl -s -o /dev/null -w '%{http_code}\n' $BASE/            # 200
curl -s -o /dev/null -w '%{http_code}\n' $BASE/admin       # 307 → login
```

Then by hand, in a browser:

1. Submit a contact inquiry. You should get a reference code.
2. Submit a startup application with a PDF under 4 MB.
3. Sign in to `/admin`, open both records, and download the presentation. If
   that download works, the storage path is working — there is nothing else to
   configure.

---

## What runs where

| Piece | Where it lives on Vercel |
| --- | --- |
| Public pages | Static and server-rendered, on Vercel's CDN and functions |
| Inquiry and application endpoints | Node.js serverless functions |
| Admin portal | Node.js serverless functions, session checked per request |
| Submissions, staff accounts, audit trail | Your Postgres |
| **Uploaded presentations** | **Your Postgres** (`startup_presentations`) |
| Email | Your SMTP relay, sent after the response |
| Rate-limit counters | Your Postgres |

---

## Things worth knowing

**Watch the database size.** Presentations are the only thing here that grows
quickly. Check it with:

```sql
SELECT pg_size_pretty(pg_total_relation_size('startup_presentations')) AS presentations,
       pg_size_pretty(pg_database_size(current_database()))            AS total;
```

When you approach the free-tier limit, either upgrade the database, lower
`NEXT_PUBLIC_MAX_PRESENTATION_MB`, or delete presentations for applications you
have finished reviewing — deleting an application removes its presentation
automatically.

**Presentations are capped at 4 MB.** A 10 MB deck will be refused with a clear
message. If applicants need to send more, ask them to compress the PDF, or move
the file to a bucket and switch to a storage driver — but that means a second
service, which is the thing this design avoids.

**Cold starts.** The free tier sleeps. The first request after idle takes a
second or two. Neon also suspends an idle free database, so the first query may
add another moment.

**Pushing code does not re-run migrations.** By design. Run them yourself when
you add a migration file.

**Preview deployments share the production database** unless you give the
Preview environment its own `DATABASE_URL`. Do that before you let anyone test a
preview branch, or their test submissions land in production.

**This is still a preview-content site.** Prices, service details and legal terms
are placeholders, and every page says so. Work through
[`CONTENT_PLACEHOLDERS.md`](CONTENT_PLACEHOLDERS.md) before showing it to real
customers.

---

## Rolling back

**Application:** Vercel keeps every deployment. Promote a previous one from the
dashboard — instant, and safe, because the running code holds no state.

**Database:** migrations are forward-only and have no down scripts; a generated
down-migration is a false sense of safety. Prefer backward-compatible changes —
add a nullable column, deploy, backfill, tighten later — so an application
rollback never needs a database rollback. If you must undo a migration, restore
from your provider's backup and replay.

**Session secret:** rotating `SESSION_COOKIE_SECRET` signs out every staff
member immediately. That is the correct first move if you suspect a session has
been compromised.
