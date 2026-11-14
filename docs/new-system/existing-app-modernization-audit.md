# M101 Existing Application Modernization Audit — Baseline

**Status:** Initial source inventory; not a production behavior audit  
**Date:** 2026-11-10  
**Repository:** `smmm1/m101`  
**Production target:** `https://m101-directory.pages.dev/`  
**Purpose:** Establish the actual M101 application as the baseline for incremental modernization.

## 1. Scope clarification

M101 remains the existing website and product. This work does not create a parallel app, replace the repository, reset the database, or assume that existing features should be discarded.

The source inventory below was read from the current `main` branch. It confirms code and component presence, not that every feature is currently healthy in production.

## 2. Confirmed technical baseline

- Frontend: React 19, TypeScript, Vite.
- Hosting/build configuration: Cloudflare Pages via Wrangler.
- Database: Cloudflare D1 binding `DB`, database name `m101_db`.
- Main application entry: `src/App.tsx`.
- Existing global design assets: `src/index.css`, `src/m101-business-theme.css`, `src/m101-redesign.css`, and `src/design-system/`.
- Existing server/API code: Cloudflare Pages Functions under `functions/api/`.
- Existing migrations: `migrations/`.

No production configuration or database was changed during this audit.

## 3. Existing user-facing capabilities found in source

| Existing area | Source evidence | Modernization stance |
|---|---|---|
| Business dashboard and portfolio overview | `DashboardView.tsx` | Keep the purpose; redesign hierarchy and readability |
| Business registry and record management | `AddBusinessModal.tsx`, `EditBusinessModal.tsx`, `BusinessDetailModal.tsx`, `DeleteBusinessModal.tsx` | Preserve data and CRUD behavior while improving UX |
| Annual tasks | `AnnualTasksView.tsx` | Preserve existing workflow; assess how to improve assignment, deadlines and progress |
| Fiscal-year management | `YearManageModal.tsx` | Preserve behavior and verify edge cases |
| Excel/CSV import | `ExcelMappingImportModal.tsx`, `ImportDocumentView.tsx` | Preserve the existing import path and mapping capability |
| Duplicate import resolution | `ImportConflictModal.tsx` | Preserve conflict decisions and data safety |
| Settings | `SettingsView.tsx` | Keep existing settings capabilities; reorganize if useful |
| Admin controls | `AdminControlCenter.tsx` | Preserve admin functions; audit permissions and discoverability |
| Authentication and PIN | `src/App.tsx`, `functions/api/` | Preserve login/session behavior; audit security before changes |
| Visitor mode | `src/App.tsx` | Verify intended access and exposed data |
| Notifications and undo | `Toast.tsx`, `src/App.tsx` | Preserve feedback and recovery behavior |
| AFK/idle experience | `SmartIdleScreen.tsx` | Keep as an existing M101 capability; redesign only if needed |

## 4. Existing design foundation

The repository already contains a shared design-system foundation and a large amount of legacy styling. Do not layer another independent design system over it.

Modernization should:
1. Inspect the actual imported CSS and component consumers.
2. Establish one authoritative Modern Navy token set.
3. Migrate the shared shell and common components first.
4. Update pages in place, keeping existing interactions and data contracts.
5. Remove obsolete selectors only after confirming no consumers remain.

The current `DESIGN_SYSTEM.md` describes a monochrome light-theme standard. It must be reconciled with the newer Modern Navy direction rather than blindly treated as the final palette.

## 5. What still requires inspection

This first pass was a source-file inventory, not a complete code or production audit. The following must be inspected before implementation:
- All routes/views and how users navigate between them.
- Dashboard metrics, table columns, search, filters, and row actions.
- D1 tables, indexes, constraints, and migration history.
- Every Pages Function and its authorization checks.
- Import mapping and existing import write path.
- Authentication, visitor mode, session expiry, and admin permissions.
- Mobile, tablet, and desktop behavior.
- Production smoke tests and backup/restore readiness.

## 6. Safe implementation sequence

### Phase A — Audit current behavior
Map routes, components, API endpoints, D1 tables, and existing workflows. Record what must not regress.

### Phase B — Approve the new M101 experience
Design the global shell, navigation, dashboard, registry, business detail, and annual-task experience using Modern Navy. Use Team1 only for information architecture inspiration.

### Phase C — Modernize the existing frontend
Refactor shared tokens/components and migrate the existing pages in place. Keep routes and data contracts stable where possible.

### Phase D — Extend the existing capabilities
Add agreed improvements such as flexible business relationships, better work assignment, and team collaboration without replacing the existing product foundation.

### Phase E — Verify and release
Run typecheck/build, workflow regression checks, data-integrity checks, responsive QA, and Cloudflare Pages deployment verification. No destructive migration without explicit approval and rollback plan.

## 7. Guardrails

- No second M101 application.
- No new repository.
- No change to the production URL.
- No switch away from Cloudflare Pages/D1 without explicit approval.
- No wiping or silently replacing existing business data.
- No removal of existing features solely because the blueprint proposes a different navigation structure.
- No merge or production deployment as part of this source inventory.
