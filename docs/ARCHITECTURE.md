# Architecture decisions

This records the choices that are not obvious from the code, and the three
places where this implementation deliberately departs from `BUILD_PLAN.md`.

---

## 1. Postgres, self-hosted auth and local storage instead of Supabase

**The plan recommended** Supabase for PostgreSQL, Auth and Storage.

**This build uses** a PostgreSQL container, self-hosted sessions, and
presentation bytes stored in that same database.

**Why.** The overriding constraint on this build was that everything must build,
run and be tested inside Docker, with no reliance on a developer's machine or on
a hosted service being reachable. Supabase's local stack is roughly ten
containers and still expects the CLI to orchestrate it; a cloud project would
mean the test suite could not run offline and could not be trusted to be
isolated.

The plan explicitly allows substitution — it names "PostgreSQL through Supabase"
and "Resend **or another provider selected by the owner**" — so what matters is
that the *guarantees* survive the substitution. They do:

| Plan requirement | How it is met here |
| --- | --- |
| Managed relational database + migrations | PostgreSQL 16, numbered SQL migrations with checksums (`scripts/migrate.ts`) |
| Row Level Security | RLS enabled on every table, plus three least-privilege roles (`db/migrations/0002_roles_and_policies.sql`) |
| Admin sign-in without building password storage | Password storage *is* built, but on Node's own scrypt with parameters recorded in the hash — no third-party crypto, no native build step |
| Private storage bucket | Presentation bytes in PostgreSQL, never publicly reachable, never statically served |
| Short-lived signed download URLs | HMAC-signed expiring tokens on an authenticated route |

**What this costs.** Supabase would have provided password reset, MFA and email
verification out of the box; none of those exist here. Staff accounts are
provisioned by an administrator running a script, which is adequate for a
handful of staff and inadequate beyond that. Adding password reset is the first
thing to do if the team grows.

**Reversing it.** The database is plain PostgreSQL with plain SQL, so a Supabase
project would accept the migrations as-is. Auth is the only part that would
need real rework.

---

## 2. Presentations in PostgreSQL, not an object store

Uploaded startup presentations are stored as `BYTEA` in `startup_presentations`
(see `db/migrations/0003_presentations_in_database.sql`), keyed to the
application they belong to.

**Why.** The deployment target has to be "one database and nothing else". An
object store — S3, a bucket, a mounted volume — is a second stateful resource
to provision, secure, back up and pay for, and on a serverless host a mounted
volume is not available at all. Putting a few megabytes of PDF in the database
that already has to exist removes the whole category of problem.

Two things improved as a side effect, and they are worth more than the
simplification:

- **Orphans became impossible.** The previous design uploaded the file, then
  inserted the row, and deleted the object again if the insert failed — a
  sequence with a failure window in the middle and a cleanup path that could
  itself fail. The bytes and the row now share one transaction: they commit
  together or neither exists.
- **There is no URL that serves the bytes.** Nothing static, nothing
  pre-signed against a third-party host. The only path is
  `/api/admin/presentations`, which requires a staff session *and* a valid
  signed token.

**What it costs.** Presentations consume database storage and count against a
managed provider's quota, and large objects in a relational database do not
scale indefinitely. That is why `NEXT_PUBLIC_MAX_PRESENTATION_MB` exists and
defaults to 4: it bounds the per-row cost, and it keeps uploads under the 4.5 MB
request-body limit that serverless platforms impose. At roughly 4 MB a file, a
0.5 GB free-tier database holds about 125 applications — fine for a first
release, and a clear signal of when to revisit.

**When to revisit.** If presentations need to be larger than a few megabytes, or
there are thousands of them, move the bytes to an object store and keep the
metadata where it is. The read and write paths are isolated in
`src/lib/storage/presentation-store.ts`, so that is a contained change — but it
reintroduces the second service and the orphan-cleanup problem, so do it only
when the numbers actually demand it.

## 3. Rate limiting in Postgres rather than a dedicated limiter

The plan left the limiter provider open. A fixed-window counter in a Postgres
table is coarser than a sliding window and shares the database's fate, but it
needs no second datastore for the first release, which the plan explicitly asks
for ("avoid unnecessary complexity").

Two details are deliberate:

- Client identifiers are **hashed** before storage, so the table never holds raw
  IP addresses. The privacy policy says this, and
  `tests/integration/storage-and-email.test.ts` verifies it.
- The limiter **fails open**. If the counter cannot be written the request
  proceeds, because losing a genuine inquiry is worse than permitting one extra
  attempt. The failure is logged.

Move this to a dedicated limiter if abuse becomes real, rather than making the
SQL cleverer.

---

## Database access: three roles and `SET LOCAL ROLE`

This is the structural core of the security model and the least conventional
part of the codebase.

The application connects as a login role created with **`NOINHERIT`**. It is a
member of three task roles but inherits nothing from them, so it can do nothing
at all until a transaction issues `SET LOCAL ROLE`:

| Role | May do |
| --- | --- |
| `app_public` | Insert submissions; read active marketing plans; read/write rate-limit counters |
| `app_auth` | Read credentials, manage sessions, stamp `last_login_at` |
| `app_staff` | Read and triage submissions; write audit events; read delivery logs |

`src/lib/db/client.ts` exposes `asPublic`, `asAuth` and `asStaff`, each of which
opens a transaction, sets the role, sets a statement timeout, and commits or
rolls back. A code path that forgets to pick a role does not quietly run with
full access — it fails with a permission error.

`tests/integration/database-policies.test.ts` proves this by issuing
`RESET ROLE` mid-transaction and asserting the query is refused.

### Why the public insert path has no `RETURNING`

Under row level security, `INSERT ... RETURNING` is evaluated against a
**SELECT** policy. Using it would have meant giving `app_public` the ability to
read submission rows back — precisely what the design forbids. So the row id and
reference code are generated in application code
(`src/lib/db/submissions.ts`) and inserted explicitly, and `app_public` has no
SELECT grant and no SELECT policy on either submissions table at all.

This was found by an integration test, not by review.

---

## Authentication

- **Passwords** use Node's `scrypt` with N=2^15, r=8, p=1. Parameters are stored
  inside the hash string, so the cost can be raised later while existing hashes
  stay verifiable; `needsRehash()` reports when a stored hash is below current
  policy. Passwords are NFKC-normalised so visually identical Unicode inputs
  match.
- **Sessions** are 32 random bytes. The browser receives `<token>.<hmac>`; the
  database stores only `SHA-256(token)`. A database dump therefore yields no
  usable cookie, and a forged cookie fails the HMAC check before any database
  lookup, so unauthenticated traffic cannot be used to probe the session table.
- **Unknown accounts** still perform a password verification against a dummy
  hash, so response timing does not reveal which addresses have accounts. The
  failure message is identical for every cause.

---

## Content model

Content that the business owner must be able to change without a deployment
lives in the database (`marketing_plans`). Content that describes what the
software does lives in `src/config/` as typed modules.

`siteConfig.hasUnconfirmedContent` gates a standing site-wide preview notice.
Marketing plans carry `is_pricing_confirmed`, and a price is rendered only when
that flag is true *and* a price exists — so an unapproved figure cannot reach a
public page by accident, even if someone fills in the number. There is a unit
test for exactly that.

Prices are stored as integer minor units. No monetary value is ever held in a
float.

---

## Deferred by design

Not built, and deliberately so. The plan lists these as later enhancements.

| Deferred | Why |
| --- | --- |
| Pitch **video upload** | Large, costly to store, hard to scan. Collected as a validated URL instead. |
| Payments | Requires confirmed pricing, refund rules, tax handling. |
| Applicant status portal | Needs applicant accounts, which needs the above auth work. |
| Password reset / MFA | Staff accounts are provisioned by an administrator; add before the team grows. |
| Antivirus scanning of uploads | Format is verified by content signature; malware scanning belongs in front of production storage. |
| Nonce-based CSP | Current policy allows `'unsafe-inline'` for scripts because Next.js injects inline bootstrap. See `docs/SECURITY.md`. |
