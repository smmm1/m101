# M101 Existing-Code Audit — Findings and Modernization Priorities

**Date:** 2026-11-10  
**Baseline:** `main` branch source read; no production data or configuration changed  
**Working branch:** `product/m101-new-system-blueprint`

This is an implementation audit of the existing M101 application, not a proposal for a replacement product.

## 1. Existing application architecture

- React 19 + TypeScript + Vite.
- Cloudflare Pages Functions route requests through `functions/api/[[path]].ts`.
- Cloudflare D1 binding `DB`, database `m101_db`.
- D1 stores user/session records, app config, business-directory data, and annual tasks.
- The UI currently loads the directory by fiscal year and keeps the active records in React state.
- Annual tasks already use a separate relational table and API.
- The shared design system is imported by `src/main.tsx` and is a viable migration foundation.

## 2. Verified risks and technical debt

### P0 — Authorization is not yet designed for teams

The inspected directory and annual-task endpoints check that a session exists via `requireUser`, but do not check role or per-business permissions before allowing directory writes and annual-task operations. The existing UI has admin/member concepts, but a hidden or disabled UI control is not server-side authorization.

**Implication:** Do not enable multi-user/team collaboration by merely adding members to the interface. Define workspace/entity-level permissions and enforce them in every API handler before team access is released.

**Safe next step:** Keep the existing owner workflow intact; design a server-side authorization layer and test matrix before adding team membership.

### P0 — Business record data contains a credential-like field

The existing `BusinessRecord` type includes a `password` property, and authenticated `GET /api/data` returns stored records as-is. The public visitor response explicitly blanks that field, but authenticated directory storage is still a JSON record blob.

**Implication:** Treat this field as sensitive. Before team access or broader API changes, determine what the field represents, who genuinely needs it, and whether it should be moved to a separately protected secret store or removed after a verified migration. Do not expose it in new search, logs, exports, or activity feeds by default.

**Safe next step:** Trace every read/write/import/export use and confirm the meaning with the product owner before altering stored values.

### P1 — Directory writes replace whole fiscal-year datasets

The UI loads all years and sends `availableYears` plus `recordsByYear` to `PUT /api/data`. The API upserts submitted years and deletes any existing year omitted from the submitted year list. The UI autosaves the entire in-memory dataset after a short debounce.

**Implication:** Two open sessions can overwrite one another's changes (last-write-wins). A stale client can also unintentionally omit a year and cause its row to be deleted. This is a significant data-integrity concern before teams or concurrent editors are introduced.

**Safe next step:** Introduce optimistic concurrency/version checks and explicit year-delete operations. Add backup/restore and regression tests before changing the persistence contract.

### P1 — Login has a hard dependency on the Money102 auth service binding

The current `wrangler.jsonc` declares `MONEY102_AUTH` and `/api/auth/login` calls that service to verify credentials. M101's directory data and session records are stored in M101 D1, but password verification depends on the separate service.

**Implication:** Login availability is coupled to that service. This must be made explicit in the M101 architecture and deployment checks. It must not be changed or removed casually because doing so could lock users out.

**Safe next step:** Keep the current behavior unchanged while documenting the dependency and confirming the intended long-term identity provider separately.

### P1 — Existing activity history is session-local

The dashboard's Activity Log is built from component state and timestamps in the browser session. It is not a persistent audit log in D1. Annual task rows have created/updated user IDs, but the directory's JSON write path does not provide field-level change history.

**Implication:** The current activity dropdown should not be presented as a durable audit trail. Team collaboration and compliance workflows need persistent, server-generated audit events.

**Safe next step:** Design a separate append-only audit table and record actor, action, entity, timestamp, and safe before/after metadata. Never store credential values in audit payloads.

### P1 — Directory records are stored as JSON, not normalized business entities

Migration `0001_init.sql` defines `directory_year_data.records` as a JSON-valid text field. The annual task table is relational, but it duplicates `business_name` and does not declare a foreign key to a normalized business table.

**Implication:** Flexible business relationships, multi-year identity, and granular permissions will be difficult to implement safely while a business is only a JSON item inside a year blob.

**Safe next step:** Plan a backward-compatible staged normalization. First define stable business identity and reconciliation rules; then design migration, dual-read verification, rollback, and only later switch writes. No current records should be migrated or deleted as part of this design-only step.

### P2 — Visual system has conflicting layers

- `tokens.css` defines a monochrome black/gray palette.
- `m101-business-theme.css` defines a newer shell and component overrides.
- `m101-redesign.css` is a very large legacy stylesheet with additional root variables and overlapping shell selectors.
- The app contains sidebar, horizontal-tab, and topbar layout styles, including selectors that hide one sidebar variant.

**Implication:** Applying a new color palette alone will not create a consistent experience. CSS precedence and duplicate shell rules can cause inconsistent layouts between views and breakpoints.

**Safe next step:** Use the shared design tokens as the source of truth, migrate shell components first, then remove legacy selectors only after proving they have no active consumers.

## 3. Existing features to preserve

| Current capability | Modernization decision |
|---|---|
| Dashboard and overview metrics | Keep; clarify definitions and make counts drill into matching records |
| Business directory and complete record fields | Keep; redesign table presentation without reducing information |
| Add/edit/detail/delete business flows | Keep; improve form hierarchy and confirmation behavior |
| Fiscal-year switcher and year management | Keep; protect year deletion and make active year obvious |
| Excel/CSV import and field mapping | Keep; preserve preview, duplicate detection, and conflict resolution |
| Annual tasks | Keep; improve filtering, grouping, and task ownership after permissions exist |
| Settings and admin tools | Keep; separate routine settings from privileged administration |
| Login, PIN, visitor mode | Keep pending explicit identity/security decisions |
| AFK/idle screen | Keep as part of M101; visual treatment can be handled separately |

## 4. Modern Navy visual implementation started

The shared token file `src/design-system/tokens.css` has been updated on this working branch to establish:
- A restrained navy primary color and navy-tinted canvas/surfaces.
- Clearer text and border contrast.
- Semantic green/amber/red/blue status colors.
- Consistent focus rings, spacing, radii, and elevation.
- Compatibility aliases for existing M101 styles.

This is a foundation change only. It is not a claim that every page is already visually redesigned. The large legacy stylesheet still contains hardcoded grayscale values and overlapping layout rules that require a controlled migration.

## 5. Modernization page map — existing M101 capabilities

| Proposed navigation label | Existing M101 screen/capability | Notes |
|---|---|---|
| ภาพรวม | DashboardView overview | KPI definitions must be explicit; avoid implying legal filing completion from generic directory status |
| ทะเบียนกิจการ | Existing directory list + selected-record panel | Keep all current data fields and current import entry points |
| งานประจำปี | AnnualTasksView | Retain current API and D1 table while improving UX |
| นำเข้าข้อมูล | ImportDocumentView + ExcelMappingImportModal + ImportConflictModal | Do not fork or replace the existing write path |
| ตั้งค่าระบบ | SettingsView | Preserve backup/restore and existing settings |
| ผู้ดูแลระบบ | AdminControlCenter | Existing privileged controls; server-side checks required |
| หน้าพัก / AFK | SmartIdleScreen | Existing capability; keep independent from normal navigation |

This is a reorganization of existing screens, not a mandate to create all-new modules.

## 6. Implementation sequence

1. Complete source and route inventory, including all data reads/writes and role checks.
2. Verify the current Modern Navy token change with TypeScript/build and preview QA.
3. Refactor the existing application shell in place: sidebar, compact unified topbar, year selector, global search, account menu.
4. Redesign dashboard and directory table while preserving every currently displayed business field and existing interactions.
5. Redesign existing detail, add/edit, import/mapping/conflict, annual-task, and settings screens.
6. Address data integrity and security risks before enabling collaboration or adding new persistent relationships.
7. Add domain features incrementally with migrations, tests, backups, and rollback plans.

## 7. Release gates

- No production deployment from this branch without explicit approval.
- No migration or deletion of production data during the UI redesign.
- No removal of the Money102 auth binding without a separately approved identity migration.
- No team access until server-side authorization and secret-field handling are verified.
- No replacement of the existing directory import path.
- No simplification that removes current table fields or useful workflows.
