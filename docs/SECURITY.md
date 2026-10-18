# Security model

What is enforced, where it is enforced, and which test proves it. Anything not
verified is listed as such at the end rather than left implied.

---

## Trust boundaries

```
Untrusted                  │ Enforced on the server
───────────────────────────┼──────────────────────────────────────────────
Form fields                │ Zod re-validates every field (client validation
                           │ is UX only, never a boundary)
Uploaded file bytes        │ Magic-byte signature must match the extension
Filename                   │ Sanitised for display; never used as a path
Pitch video URL            │ Protocol allow-list; credentials rejected
Query string / route param │ Parsed against closed unions; UUID shape checked
Session cookie             │ HMAC verified before any database lookup
Download token             │ HMAC + expiry + staff session, all three required
Proxy headers              │ Used only for rate-limit bucketing, hashed first
```

---

## 1. Database privileges

The application's login role is created **`NOINHERIT`** and holds no table
privileges. Every query runs in a transaction that first issues
`SET LOCAL ROLE` to one of three task roles. Forgetting to choose a role fails
closed.

| | `app_public` | `app_auth` | `app_staff` |
| --- | --- | --- | --- |
| Insert submissions | yes | — | — |
| Read submissions | **no** | **no** | yes |
| Read internal notes | **no** | **no** | yes |
| Update submissions | no | no | yes |
| Delete submissions | no | no | **no** |
| Read password hashes | no | yes | **no** |
| Change a staff role | **no** | **no** | **no** |
| Manage sessions | no | yes | revoke only |

No role can change `profiles.role`. Privilege escalation is therefore not
reachable from the web surface at all; roles change only by an administrator
running `scripts/create-staff.ts` against the owner connection.

*Verified by* `tests/integration/database-policies.test.ts` — twelve assertions,
each attempting a forbidden query as the relevant role and requiring
`permission denied`.

## 2. Row level security

RLS is enabled on all eight tables. Public inserts carry a `WITH CHECK` that
pins the row to its initial state:

```sql
status = 'RECEIVED' AND internal_notes IS NULL AND assigned_to IS NULL
```

So even a caller who reached the public role cannot create a pre-approved record
or inject staff notes. `app_public` has **no SELECT grant and no SELECT policy**
on either submissions table, which is why the insert path does not use
`RETURNING` (see `docs/ARCHITECTURE.md`).

*Verified by* `database-policies.test.ts` — inserts that pre-set `status`,
`internal_notes`, `reviewed_by` or `reviewed_at` are each required to fail with
a row-level-security error, and a correctly shaped insert is required to succeed.

## 3. Authorization on every admin operation

`requireStaffPage()` guards pages; `requireStaff()` guards route handlers and
server actions. Both resolve the session server-side on every request. Hiding a
link is never treated as access control.

Server actions re-authorize independently of the page that rendered the form, so
a stale tab, a replayed request or a hand-crafted POST hits the same check.

*Verified by* `tests/e2e/admin.spec.ts` — five protected paths must redirect an
unauthenticated visitor to sign-in, the redirect response must contain no
submission data, a forged cookie must be rejected, and a well-formed token with
no matching record must be rejected.

## 4. Private file handling

| Rule | Implementation |
| --- | --- |
| Content must match the extension | `detectPresentationFormat()` checks magic bytes for PDF / OOXML-ZIP / OLE2 |
| Size and type gated before buffering | `validatePresentationMetadata()` runs on metadata first |
| Never publicly reachable | Stored as `BYTEA` in PostgreSQL; nothing serves the bytes except the authenticated route |
| Downloads expire | HMAC-signed token with an absolute expiry, checked alongside the staff session |
| The id cannot be swapped in the URL | The application id travels inside the signed token, not as a plain parameter |
| Orphans are impossible | Bytes and application row share one transaction — see `docs/ARCHITECTURE.md` |
| `app_public` can write and never read | Grant plus policy in `0003_presentations_in_database.sql` |
| `app_staff` cannot alter or delete bytes | SELECT only; no UPDATE or DELETE grant |

*Verified by* `tests/unit/presentation-file.test.ts` (signature and filename
handling), `tests/integration/storage-and-email.test.ts` (byte-exact round
trip including a 2 MB file, role restrictions, token forgery, secret
substitution, expiry, cascade delete) and `tests/e2e/admin.spec.ts`
(unauthenticated download refused, tampered token refused, real file returned).

## 5. Input validation

Shared Zod schemas validate on both sides; the server never trusts the client's
result. Notable rules:

- **URLs** are checked against a protocol allow-list. `javascript:`, `data:`,
  `file:` and `vbscript:` are rejected — `new URL()` alone accepts all of them.
  Embedded credentials are rejected.
- **Consent** must be explicitly `true`; absent is a validation error, never an
  assumed agreement.
- **Submission type** is a discriminated union, so an unrecognised type is a
  validation failure rather than a silent fall-through, and one form cannot
  satisfy another form's requirements.
- **Database constraints** back the schemas up: `CHECK` constraints on email
  shape and name length, enums for every status, and a constraint preventing a
  plan from being marked price-confirmed without a price.

*Verified by* `tests/unit/validation.test.ts` (42 assertions) and
`database-policies.test.ts` (constraints hold even if validation were bypassed).

## 6. Output safety

User-submitted text is rendered as text. No submission content is ever passed
through `dangerouslySetInnerHTML`. Email templates escape every interpolated
value, and staff notifications deliberately carry **no visitor free text** —
staff open the record to read it.

*Verified by* `tests/unit/email-templates.test.tsx` — markup supplied in a name
must appear escaped, and applicant-facing mail must contain no internal terms.

## 7. Abuse controls

Fixed-window limits per hashed client identifier: 8 submissions/hour and
10 sign-in attempts/15 minutes by default. Every form carries a honeypot field
hidden from both sighted users and assistive technology; a filled honeypot gets
a plain `400` that reveals nothing.

Sign-in failures return one message for every cause, and unknown accounts still
perform a password verification, so neither the wording nor the timing
distinguishes "no such account" from "wrong password".

*Verified by* `storage-and-email.test.ts` (limits, per-caller and per-scope
isolation, identifier hashing) and `admin.spec.ts` (identical failure message
for unknown and wrong-password cases).

## 8. Transport and headers

Applied to every response in `next.config.ts`: HSTS with preload,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy`
denying camera/microphone/geolocation, and a CSP with `frame-ancestors 'none'`,
`object-src 'none'` and `base-uri 'self'`. `X-Powered-By` is removed.

*Verified by* `tests/e2e/public-site.spec.ts`, which asserts the headers on a
real response from a production build.

> **Known limitation.** `script-src` includes `'unsafe-inline'` because Next.js
> injects an inline bootstrap script and this app does not yet use a nonce-based
> CSP. Tightening this requires middleware that generates a per-request nonce.
> It is the most valuable remaining hardening item.

## 9. Secrets and logging

`.env.example` and `.env.docker` contain placeholders and local-only defaults;
real credentials are never committed, and `.dockerignore` keeps env files out of
images. `src/lib/env.ts` validates everything at startup and names the offending
variable on failure. Nothing secret is exposed under `NEXT_PUBLIC_`.

Logs carry message text and masked identifiers only — never secrets, pitch
contents, or full email addresses. `email_delivery_logs` stores a masked
recipient and no message body. Visitors see generic error text; diagnostic
detail stays server-side, with an error digest shown so support can correlate.

---

## Not verified

Stated plainly so nobody assumes otherwise.

| Item | Status |
| --- | --- |
| **Production TLS / HSTS** | The headers are set and asserted, but no production certificate or domain exists yet. The session cookie only takes its hardened `__Host-` form when `NEXT_PUBLIC_SITE_URL` is `https`. |
| **Real email deliverability** | Verified only against Mailpit. SPF/DKIM/DMARC are unconfigured. |
| **Malware scanning of uploads** | Format is verified; content is not scanned. |
| **Nonce-based CSP** | Not implemented; see above. |
| **Penetration testing** | None performed. |
| **Legal review** | The privacy policy and terms describe what the software does accurately, but no lawyer has reviewed them, and neither states a governing law. |
| **Backup and restore** | Procedure is documented, never rehearsed. |

## Reporting

Until a disclosure address is published, route security reports through the
business owner. Do not open a public issue for a suspected vulnerability.
