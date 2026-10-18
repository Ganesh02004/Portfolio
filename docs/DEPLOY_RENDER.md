# Deploying to Render

**Verdict: Render works, including the free tier.** Render runs your
`Dockerfile` and gives you a managed PostgreSQL database. That database is the
only resource you need — uploaded presentations are stored in it, so there is
no disk to attach and no paid instance required.

Deploying to Vercel instead? See [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md).

Everything below has been verified locally against a Postgres role with no
superuser rights and a root-owned volume mount — the two conditions that make
managed hosting different from `docker compose`. Only the Render dashboard steps
themselves are unverified, for the obvious reason.

---

## What you will create

| Render resource | Purpose | Plan |
| --- | --- | --- |
| PostgreSQL | Submissions, applications, uploaded presentations, staff accounts, audit trail | Free tier works for testing; paid for anything real |
| Web Service (Docker) | The application | Free tier works; it spins down when idle |

That is the whole list. No disk, no object store, no background worker.

---

## Step 1 — Create the database

Render dashboard → **New → Postgres**. Note the region; put the web service in
the same one.

When it is ready, copy both connection strings from the database page:

- **Internal Database URL** — used by the running app.
- **External Database URL** — used from your machine to run migrations.

## Step 2 — Run the migrations

Migrations are **not** part of the container start-up, deliberately: a schema
change should be a decision, not a side effect of a deploy. Run them once from
your machine against the external URL.

```bash
docker build --target tooling -t bsp-tooling .

docker run --rm \
  -e DATABASE_ADMIN_URL="<External Database URL>?sslmode=require" \
  -e APP_DB_USER=app_user \
  -e APP_DB_PASSWORD="<invent a strong password and keep it>" \
  bsp-tooling npx tsx scripts/migrate.ts
```

Expected output:

```
[migrate] applying 0001_initial_schema.sql … done
[migrate] applying 0002_roles_and_policies.sql … done
[migrate] applied 2 migration(s)
[migrate] provisioned login role app_user
```

This creates the schema, the three least-privilege roles, and a login role
called `app_user` with the password you chose. It needs `CREATEROLE` but **not**
superuser — verified locally against a non-superuser database owner.

If it fails with `permission denied to create role`, your provider has not
granted `CREATEROLE`. Check with:

```bash
docker run --rm -e PGURL="<External Database URL>?sslmode=require" \
  postgres:16-alpine sh -c \
  'psql "$PGURL" -c "SELECT current_user, rolcreaterole FROM pg_roles WHERE rolname = current_user;"'
```

If `rolcreaterole` is `f`, create the four roles by hand once from the
provider's SQL console as a superuser, then re-run the migration — it is
idempotent and will skip what already exists:

```sql
CREATE ROLE app_public NOLOGIN;
CREATE ROLE app_auth   NOLOGIN;
CREATE ROLE app_staff  NOLOGIN;
CREATE ROLE app_user LOGIN NOINHERIT PASSWORD '<app password>';
GRANT app_public, app_auth, app_staff TO app_user;
```

`NOINHERIT` is not optional. It is what makes a code path that forgets to pick
a role fail closed instead of running with every privilege at once.

Then seed the marketing plans:

```bash
docker run --rm \
  -e DATABASE_ADMIN_URL="<External Database URL>?sslmode=require" \
  bsp-tooling npx tsx scripts/seed.ts
```

### Build the app's own connection string

Take the **Internal** Database URL and swap in the app role. If Render gives you:

```
postgres://bsp_user:abc123@dpg-xxxx-a/bsp_db
```

then the app uses:

```
postgres://app_user:<the password you chose>@dpg-xxxx-a/bsp_db
```

Same host, same database, different user. The app never connects as the owner.

## Step 3 — Create the web service

Render dashboard → **New → Web Service** → connect the repository.

| Setting | Value |
| --- | --- |
| Language / Runtime | **Docker** |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| **Docker Target Stage** | **`runner`** ← easy to miss, and nothing works without it |
| Health Check Path | `/api/health` |
| Region | Same as the database |

## Step 4 — Environment variables

Web service → **Environment**. Generate the session secret first:

```bash
docker run --rm node:22-bookworm-slim \
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```dotenv
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://<your-service>.onrender.com

DATABASE_URL=postgres://app_user:<app password>@<internal host>/<database>
DATABASE_SSL_MODE=require

SESSION_COOKIE_SECRET=<the generated value>
SESSION_TTL_HOURS=12

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

Notes:

- **Do not set `PORT`.** Render sets it, and the image honours it.
- **Do not set `DATABASE_ADMIN_URL`** on the web service. The owner connection
  belongs only to the migration step. The app never needs it.
- `NEXT_PUBLIC_SITE_URL` must be the real URL, because it is baked into the
  links in outgoing email. Update it if you attach a custom domain.
- If you have no SMTP relay yet, point `SMTP_HOST` at anything reachable and
  accept that email will fail. **Submissions are still saved** — email failure is
  logged and never loses an inquiry. The admin dashboard shows a banner counting
  failed deliveries.

## Step 5 — Deploy and create your account

Deploy. The first build takes a few minutes. When it is live:

```bash
curl https://<your-service>.onrender.com/api/health
# {"status":"ok","checks":{"database":true}}
```

If `database` is `false`, check `DATABASE_URL` and that `sslmode=require` is
present.

Then create a staff account from your machine:

```bash
docker run --rm \
  -e DATABASE_ADMIN_URL="<External Database URL>?sslmode=require" \
  -e STAFF_PASSWORD="<choose a strong password>" \
  bsp-tooling npx tsx scripts/create-staff.ts \
    --email you@example.com --name "Your Name" --role ADMIN
```

Sign in at `https://<your-service>.onrender.com/admin/login`.

## Step 6 — Check it

```bash
BASE=https://<your-service>.onrender.com
curl -s $BASE/api/health
curl -s -o /dev/null -w '%{http_code}\n' $BASE/            # 200
curl -s -o /dev/null -w '%{http_code}\n' $BASE/admin       # 307 → login
```

Then in a browser: submit one contact inquiry and confirm you get a reference
code, sign in to `/admin` and confirm it is there, then submit a startup
application with a PDF and download it back from the admin page.

---

## Things that will bite you

**Free Postgres expires.** Render's free database is deleted after a set period.
Move to a paid plan before you put anything real in it.

**Free web services spin down.** First request after idle takes ~50 seconds.

**It scales horizontally.** Nothing is kept on the instance, so you can run
more than one replica without further work.

**Watch the database size.** Presentations live in it and are capped at 4 MB
each. See the size query in [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md#things-worth-knowing).

**Rebuilding does not re-run migrations.** By design. Run them yourself when you
add a migration.

**This is still a preview-content site.** Prices, service details and legal terms
are placeholders and the site says so on every page. See
`docs/CONTENT_PLACEHOLDERS.md` before showing it to customers.

---
