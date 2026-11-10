# M101 Team Access Model

Status: product direction confirmed; implementation design
Date: 2026-11-10
Scope: design only; no schema migration or runtime authorization change is included here.

## Confirmed product direction

M101 has one owner today. In the future, other users can be invited to work in the same workspace. There are **no member ranks or role ladder** such as Admin, Editor, or Viewer.

The owner remains the accountable workspace owner. All invited collaborators have the same baseline ability to work with the businesses and tasks assigned to them. Access is controlled by workspace membership and business assignment, not by a hierarchy of job titles.

This is an incremental modernization of the existing M101 application, not a replacement app.

## Security boundary and terminology

Keep these concepts separate:

1. **Workspace** — the tenant/security boundary. It owns its directory, annual tasks, settings, and members.
2. **Owner** — the one account that owns the workspace and manages membership, workspace settings, and ownership transfer.
3. **Collaborator** — an invited user. All collaborators have equal baseline work permissions; there are no ranks.
4. **Business relationship group** — a user-defined way to associate businesses. A business may be independent or belong to multiple relationship groups. This does not merge business records, accounting, revenue, tax, or compliance data.
5. **Work assignment / access scope** — the businesses a collaborator is assigned to work on. Relationship-group membership alone must not grant access.

A user can belong to multiple workspaces. Each business and its private data belong to exactly one workspace unless an explicit future cross-workspace sharing model is designed.

## Owner and collaborator permissions

| Capability | Owner | Invited collaborator |
|---|---:|---:|
| Read assigned business records | Yes | Yes |
| Create/update assigned business records | Yes | Yes |
| Read/update annual tasks for assigned businesses | Yes | Yes |
| Work on more than one assigned business | Yes | Yes |
| Invite or remove workspace members | Yes | No |
| Assign/revoke business work access | Yes | No |
| Manage workspace settings and ownership | Yes | No |
| Access unassigned businesses | Yes | No |
| Reveal stored business credentials | Explicitly protected action | Only if explicitly granted for assigned work |
| Perform sensitive/destructive workspace-wide actions | Yes, with confirmation and audit | No, unless separately approved |

- Collaborators are equal. Do not introduce role labels, rank badges, admin/editor/viewer choices, or role-based UI.
- The owner is not an ordinary rank; ownership is workspace accountability and membership management.
- A collaborator can read and edit assigned businesses and their annual tasks. This is the default collaboration model.
- The owner assigns access to one or more businesses. A collaborator must not gain access to another business merely because it is in the same relationship group.
- Sensitive credential reveal is a separate explicit grant and must be audited. Ordinary record access does not automatically expose stored passwords.
- Bulk replacement, workspace-wide deletion, ownership changes, and other destructive actions remain owner-only unless a future explicit product decision changes this.
- Deny by default if membership, assignment, or required permission is missing.

## Membership and invitations

- No open self-enrollment into a workspace.
- A valid Money102 login proves identity only; it must not automatically grant access to M101 business data.
- The owner invites a user by email. The invite is single-use, short-lived, revocable, and stored hashed. Acceptance must be bound to the authenticated email.
- Once accepted, the collaborator can work on the businesses assigned by the owner. No role selection is shown.
- Record inviter, accepted user, timestamps, and assigned business scopes.
- Existing M101 users and the current first admin must be mapped to the legacy workspace through a reviewed migration. Do not infer or silently transfer ownership based only on the old `admin` role.
- PIN login may authenticate an already-authorized user; it must not bypass membership or business assignment checks.

## Proposed data model (D1)

Additive tables, names subject to implementation review:

- `workspaces(id, name, owner_user_id, status, created_at, updated_at)`
- `workspace_memberships(id, workspace_id, user_id, membership_type, status, created_at, updated_at)` where membership type distinguishes only `owner` and `collaborator`, not a rank.
- `workspace_invitations(id, workspace_id, email, token_hash, expires_at, invited_by, accepted_by, accepted_at, revoked_at, created_at)`
- `business_assignments(id, workspace_id, business_id, user_id, assigned_by, created_at)` with unique `(workspace_id, business_id, user_id)`
- `business_credential_grants(id, workspace_id, business_id, user_id, granted_by, created_at)`
- `business_relationship_groups(id, workspace_id, name, created_at, updated_at)`
- `business_relationship_group_memberships(group_id, business_id, created_at)`
- `audit_events(id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at)`

Business relationship groups and business assignments are separate concepts. Relationship groups describe how businesses are connected; assignments define which collaborators may work on them. A business may belong to multiple relationship groups but remains one canonical business record with its own accounting, revenue, tax, and compliance data.

When business entities are normalized, each business and annual task must carry a workspace boundary. Existing JSON-by-fiscal-year data stays readable during a staged migration; no destructive conversion.

## API enforcement requirements

- Resolve the authenticated user and active workspace membership on the server for every private route.
- Never accept workspace ID, owner ID, membership status, or business assignment as authoritative from request body alone.
- Scope every read, write, update, delete, import, export, and annual-task query by workspace and business assignment.
- All collaborators share the same baseline work permissions on assigned businesses; enforce owner-only membership/settings and workspace-wide destructive actions separately.
- Credential reveal requires a separate business-specific grant and must never be included in ordinary directory responses.
- PIN login creates a session only; all resource authorization still runs on every request.
- Public visitor routes remain an explicit allowlist and must not expose private identifiers or credentials.
- Return 401 for missing/invalid session, 403 for authenticated but unauthorized access, and avoid leaking whether an out-of-scope resource exists.
- Log security-relevant actions without logging passwords, tokens, PINs, credential plaintext, or full sensitive payloads.

## Migration and rollout sequence

1. **Inventory and preserve** — export/verify D1 schema and row counts; identify current users, roles, directory years, and annual tasks. No production data access was performed for this design.
2. **Additive schema** — create workspace, membership, invitation, business assignment, credential grant, relationship group, and audit tables. Do not drop or rewrite existing tables.
3. **Legacy workspace mapping** — create one legacy workspace and map the current owner and legitimate existing users using a reviewed mapping. Backfill directory years and annual tasks without changing contents.
4. **Authorization layer** — add centralized server-side authorization helpers and tests for anonymous, uninvited, owner, collaborator, assigned, unassigned, and cross-workspace access.
5. **Invitation flow** — replace implicit workspace access with owner-issued invitations. Do not enable broad access until existing legitimate users are mapped and verified.
6. **Frontend collaboration UI** — add member list, invite/revoke actions, business assignment controls, and clear access-denied states. Do not add role selectors.
7. **Credential protection** — separately implement versioned authenticated encryption and a permission-gated reveal endpoint. Do not expose plaintext in ordinary record APIs.
8. **Concurrency and audit** — add revision checks/ETags for directory writes and persistent audit events; verify restore and rollback.
9. **Staged release** — test against a non-production D1 database first; production rollout only after explicit approval and verified backup.

## Immediate existing-system risk

The current login route provisions every previously unseen, successfully authenticated Money102 email as an M101 `member`. The directory and annual-task routes then check only that a session exists, and the underlying data is shared globally. This means a valid Money102 account can currently be provisioned and access shared M101 data without an owner invitation or business assignment.

This must be closed as part of the authorization rollout. Do not hot-change login behavior until the current owner and all legitimate existing users are safely mapped; otherwise existing access could be unexpectedly blocked.

## Acceptance tests required before enabling collaboration

- An unauthenticated request cannot read or mutate private data.
- A valid Money102 user without an invitation cannot read or mutate workspace data.
- An invited collaborator cannot access workspace data before invitation acceptance.
- Two collaborators assigned to the same business have equal baseline read/write access.
- A collaborator cannot access an unassigned business, even if that business is in a relationship group with an assigned business.
- A collaborator can work across multiple businesses when explicitly assigned to each.
- A collaborator cannot invite/remove users, change assignments, change workspace settings, or perform workspace-wide destructive actions.
- A credential is not returned by ordinary record APIs; reveal requires an explicit grant and is audited.
- A member of workspace A cannot read or mutate workspace B by changing IDs in URL/body.
- A business in multiple relationship groups retains one canonical record and independent financial/tax/compliance data.
- PIN authentication does not bypass workspace membership or business assignment.
- Audit events record actor, action, target, and time without storing secrets.
