# M101 Security Review — Existing API Baseline

Review branch: `product/m101-new-system-blueprint`

Review date: 2026-11-10

Scope: static source inspection of the existing Cloudflare Pages Functions API, business record type, and current authentication flow. This is not a penetration test or a production runtime test.

## Confirmed findings

### S1 — Sensitive business credentials are stored and returned as plaintext fields

- `BusinessRecord` defines a `password: string` field.
- The authenticated `GET /api/data` handler returns the stored `directory_year_data.records` JSON without field filtering.
- The business detail UI renders the password and provides a copy action.
- The edit form accepts and saves the password as part of the record.
- The public visitor endpoint does redact this field through `cleanRecordForVisitor`, but that does not protect authenticated responses, browser memory, exports, or backups.

Impact: anyone who obtains a valid M101 session with access to the shared directory can retrieve the stored business credentials. The data is not application-layer encrypted in the current record model.

Recommended remediation (separate, planned change):
1. Decide whether this field must remain recoverable (it appears to be an e-Filing credential, so hashing is not suitable).
2. Design application-layer encryption using a Cloudflare secret-managed key, with authenticated encryption and key versioning.
3. Plan a backward-compatible migration for existing plaintext records and recovery/rollback before changing reads or writes.
4. Ensure plaintext is only revealed on an explicitly authorized action; never include it in ordinary list/search responses, logs, analytics, or public exports.
5. Review backup/export/import behavior and document key rotation and recovery.

Do not deploy an encryption change until the secret/key provisioning and migration/rollback plan are verified.

### S2 — Authenticated API authorization currently checks session presence, not role

- Login provisions the first M101 user as `admin` and subsequent new users as `member`.
- The API has a `requireUser` session check.
- The inspected directory and annual-task routes call `requireUser`, but do not enforce an admin/owner role or per-resource permissions.
- The directory is stored as shared D1 data, not partitioned by user or group.

Impact: every previously unseen, valid Money102 email is automatically provisioned as an M101 member. That account can then reach the same shared directory data and write endpoints because the routes only check session presence. This is effectively open enrollment for anyone with a valid Money102 account, not invitation-based team access.

Recommended remediation (before enabling team collaboration):
1. Define explicit owner-only and team modes, including who can read, create, edit, delete, import, export, and reveal sensitive fields.
2. Enforce authorization server-side on every API route; hiding UI controls is not authorization.
3. Use workspace tenancy, invitation-only membership, explicit group-scoped access grants, and separate credential-reveal permission.
4. Add automated tests for anonymous, uninvited, owner, admin, editor, viewer, out-of-scope, and cross-workspace requests.
5. Preserve current owner access and existing D1 records during rollout.

### S3 — Directory writes replace the full submitted year set

- `PUT /api/data` upserts every year in the submitted payload.
- It deletes existing years omitted from `availableYears`.
- The frontend maintains a full in-memory `recordsByYear` state and saves it.

Impact: concurrent or stale clients can overwrite newer changes or delete years omitted from a stale payload. This is a data-integrity risk, not an observed production incident.

Recommended remediation:
- Introduce version/ETag or updated-at conflict checks and reject stale writes.
- Prefer targeted year-level writes or transactional revision checks.
- Add a backup/recovery test before changing the write contract.

## Existing protections observed

- Mutating API requests apply same-origin checks.
- Session tokens are stored as hashes in D1 and cookies are HttpOnly, Secure, and SameSite=Lax.
- Visitor data uses an explicit allowlist and redacts tax ID, password, e-Filing code, SSO code, and remarks.
- Password/PIN credential verification is handled through the existing authentication flow; this review did not change it.

## Verification limits and next steps

- Static source review only; no production database or user records were accessed.
- No authentication or authorization behavior was changed in this review.
- No data migration, secret provisioning, deployment, or production test was performed.
- The latest verified TypeScript/build success before the SheetJS upgrade was commit `568f75d`; commit `e0d6041` upgraded SheetJS and its CI completed successfully with zero npm audit findings.
- CI now creates an ephemeral package lock and runs `npm audit --audit-level=high`; high/critical findings fail the workflow instead of being masked.
- This review remains source-only. No browser visual review, D1 mutation, credential migration, or production deployment has been performed.

## Authorization design decision required before enforcement

The current `admin` and `member` roles do not encode a confirmed product policy. Do not silently assume that every member should be read-only, or that every M101 user should see all businesses.

Proposed policy for owner-only mode:
- Admin/owner: read and write all directory and annual-task data; manage users/settings; reveal sensitive credentials only through a separately protected action.
- Member: no access until explicitly invited and assigned a scope.
- Visitor: public allowlist only, with all tax identifiers and credentials redacted.

Proposed policy for team mode (requires user confirmation):
- Team owner: manage membership and permissions.
- Team editor: create/update records and annual tasks within assigned groups.
- Team viewer: read only within assigned groups.
- Sensitive credential reveal: separate permission from ordinary record read.
- Cross-group access: deny by default; relationships between businesses do not automatically grant access to each other's records.

Before implementation, decide whether M101 should launch in owner-only mode first, or support team mode immediately. Also define whether the existing first `admin` is the permanent owner or merely the initial account administrator.

## Credential protection design

Because business credentials must be recoverable for legitimate use, password hashing is not an appropriate replacement. Recommended design is authenticated encryption at rest using Web Crypto AES-GCM, a Cloudflare secret-managed key, and a key-version marker. Migration must be staged:
1. Provision and validate the secret in a non-production environment.
2. Add versioned encrypted-field support while retaining reads for existing plaintext rows.
3. Back up and verify the current D1 data before migration.
4. Migrate in bounded batches and verify decryptability and record counts.
5. Change normal API responses to omit credentials; add a separately authorized reveal endpoint only after permission rules are approved.
6. Test export/import, backup restore, key rotation, and rollback before production rollout.

No encryption implementation or credential migration is included in this branch yet.


Team-mode architecture is specified in `docs/new-system/team-access-model.md`. It separates workspace security boundaries from user-defined business relationship groups and access groups. The design is additive and is not yet implemented.
