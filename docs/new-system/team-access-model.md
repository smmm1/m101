# M101 Team Access Model

Status: proposed architecture for the selected Team-first direction
Date: 2026-11-10
Scope: design only; no schema migration or runtime authorization change is included here.

## Product decision

M101 will support multiple people from the outset. The existing application remains the product; this is an incremental modernization, not a replacement app.

## Security boundary and terminology

Keep these concepts separate:

1. **Workspace** — the tenant/security boundary. A workspace owns its directory, annual tasks, settings, and members.
2. **Workspace membership** — the user's role in a workspace.
3. **Business relationship group** — a user-defined way to associate businesses. A business may be independent or belong to multiple relationship groups. This does not merge business records, accounting, revenue, tax, or compliance data.
4. **Access scope** — the subset of businesses a workspace member may access. Relationship membership alone must not grant access unless an explicit access grant is created.

A user can belong to multiple workspaces. A business and all its private data belong to exactly one workspace unless a future, explicit cross-workspace sharing model is designed.

## Roles and permissions

| Capability | Owner | Admin | Editor | Viewer |
|---|---:|---:|---:|---:|
| Read permitted business records | Yes | Yes | Yes | Yes |
| Create/update permitted business records | Yes | Yes | Yes | No |
| Delete business records | Yes | Yes | Policy-controlled | No |
| Read/update annual tasks | Yes | Yes | Yes | Read only |
| Import records / bulk replace | Yes | Yes | Explicit grant | No |
| Export ordinary records | Yes | Yes | Explicit grant | Explicit grant |
| Invite/remove members | Yes | Yes, unless owner-only action | No | No |
| Change workspace roles and scopes | Yes | Limited; cannot transfer ownership | No | No |
| Manage workspace / transfer ownership | Yes | No | No | No |
| Reveal stored business credentials | Separate explicit permission | Separate explicit permission | Separate explicit permission | No |

- **Owner** is a single accountable owner for a workspace. Ownership transfer must be an explicit, audited action with re-authentication.
- **Admin** administers workspace operations but cannot transfer ownership or reveal credentials by default.
- **Editor** edits within granted access scopes. Destructive bulk actions require a separate permission.
- **Viewer** is read-only within granted scopes.
- Sensitive credential reveal is a separate permission and must never be implied by the ordinary read role.
- Deny by default when a role, workspace membership, scope, or permission is missing.

## Membership and invitations

- Do not provide open self-enrollment into a workspace.
- A valid Money102 login proves identity only; it must not automatically grant access to M101 business data.
- New identities may be provisioned as pending/inactive, but receive no workspace data until an owner/admin issues and the invite is accepted.
- Invitations are workspace-specific, single-use, short-lived, revocable, and stored hashed. Bind acceptance to the authenticated email and record inviter, accepted user, timestamps, and assigned role/scopes.
- Existing M101 users and the existing first admin must be mapped to the legacy workspace through a reviewed, non-destructive migration. Do not guess the owner from email or silently reassign ownership.
- PIN login may authenticate an already-authorized user; it must not bypass membership or permission checks.

## Proposed data model (D1)

Additive tables, names subject to implementation review:

- `workspaces(id, name, owner_user_id, status, created_at, updated_at)`
- `workspace_memberships(id, workspace_id, user_id, role, status, created_at, updated_at)` with unique `(workspace_id, user_id)`
- `workspace_invitations(id, workspace_id, email, role, token_hash, expires_at, invited_by, accepted_by, accepted_at, revoked_at, created_at)`
- `access_groups(id, workspace_id, name, created_at, updated_at)`
- `access_group_memberships(access_group_id, user_id, created_at)`
- `business_access_grants(id, workspace_id, business_id, user_id, access_group_id, permission, granted_by, created_at)`
- `audit_events(id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at)`

The separate business relationship group model remains distinct from access groups. When business entities are normalized, each business record and its annual tasks must carry a workspace boundary. Existing JSON-by-fiscal-year data stays readable during a staged migration; no destructive conversion.

## API enforcement requirements

- Resolve the authenticated user and active workspace membership on the server for every private route.
- Never accept workspace ID, role, owner ID, or scope as authoritative from request body alone.
- Scope every read, write, update, delete, import, export, and annual-task query by authorized workspace and business access.
- Use explicit permission helpers for each action; role checks alone are insufficient for sensitive reveal, import, export, and destructive operations.
- PIN login creates a session only; all resource authorization still runs on every request.
- Public visitor routes remain an explicit allowlist and must not expose private identifiers or credentials.
- Return 401 for missing/invalid session, 403 for authenticated but unauthorized access, and avoid leaking whether an out-of-scope resource exists.
- Log security-relevant actions without logging passwords, tokens, PINs, credential plaintext, or full sensitive payloads.

## Migration and rollout sequence

1. **Inventory and preserve** — export/verify D1 schema and row counts; identify all current users, roles, directory years, and annual tasks. No production data access was performed for this design.
2. **Additive schema** — create workspace, membership, invitation, access group, grant, and audit tables. No existing tables or columns are dropped.
3. **Legacy workspace mapping** — create one legacy workspace and map the current owner and existing users using a reviewed mapping. Backfill current directory years and annual tasks to that workspace without changing their contents.
4. **Authorization layer** — add centralized server-side authorization helpers and tests for anonymous, invited, uninvited, owner, admin, editor, viewer, out-of-scope, and cross-workspace access.
5. **Invitation flow** — replace implicit workspace access with invitation acceptance. Do not enable broad access until existing legitimate users are mapped and verified.
6. **Frontend workspace context** — add workspace switcher, member management, role/scope UI, and clear access-denied states.
7. **Credential protection** — separately implement versioned authenticated encryption and a permission-gated reveal endpoint. Do not expose plaintext in ordinary record APIs.
8. **Concurrency and audit** — add revision checks/ETags for directory writes and persistent audit events; verify restore and rollback.
9. **Staged release** — test against a non-production D1 database first; then deploy only after explicit approval and production backup verification.

## Immediate existing-system risk

The current login route provisions every previously unseen, successfully authenticated Money102 email as an M101 `member`. The directory and annual-task routes then check only that a session exists, and the underlying data is shared globally. This means a valid Money102 account can currently be provisioned and access shared M101 data without a workspace invitation.

This must be closed as part of the authorization rollout. Do not hot-change the login behavior until the current owner and all legitimate existing users are safely mapped; otherwise existing access could be unexpectedly blocked.

## Acceptance tests required before enabling Team mode

- An unauthenticated request cannot read or mutate private data.
- A valid Money102 user without an invitation cannot read or mutate workspace data.
- An invited user cannot access a workspace before invitation acceptance.
- Viewer cannot write, delete, import, or reveal credentials.
- Editor cannot access unassigned businesses or perform ungranted bulk/destructive actions.
- Admin cannot transfer workspace ownership or reveal credentials without the separate grant.
- A member of workspace A cannot read or mutate workspace B by changing IDs in URL/body.
- A business in multiple relationship groups retains one canonical record and does not leak data to users who lack access.
- PIN authentication does not bypass workspace membership or action permissions.
- Audit events record actor, action, target, and time without storing secrets.
