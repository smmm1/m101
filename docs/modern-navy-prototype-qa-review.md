# Modern Navy Prototype QA Review

Date: 2026-11-10
Branch: `design/m101-modern-navy-ux-blueprint`

## Scope

Reviewed the two HTML prototypes against:
- `docs/modern-navy-ux-blueprint.md`
- `docs/modern-navy-screen-layouts-draft02.md`
- the confirmed M101 design constraints recorded in this branch.

Files reviewed:
- `docs/prototypes/modern-navy-overview-directory.html`
- `docs/prototypes/modern-navy-detail-screens.html`

This is a source-level review. No browser/device rendering test was performed, and this review does not claim production behavior.

## Verified strengths

- Both prototypes use the proposed Modern Navy palette and a desktop sidebar + topbar composition.
- The Overview/Directory prototype includes responsive CSS breakpoints and a horizontally scrollable directory table.
- The detail prototype contains separate screen sections for business detail, groups/relationships, annual work, import/export, and settings.
- Sample data is visibly labelled as illustrative in the prototypes; it must not be treated as live M101 data.
- The business detail concept masks credential values by default.
- The group screen is presented as a proposal, not as an existing production feature.

## Findings to fix before implementation

### P0 — Navigation and shell consistency

1. The Overview/Directory prototype has only two screen sections (`overview`, `directory`). Other sidebar entries are decorative text and do not navigate.
2. The detail prototype has five screen sections, but its sidebar uses a different navigation structure and does not link back to Overview or Directory.
3. The two prototypes duplicate the app shell with different class names, dimensions, and navigation behavior. They should share one shell specification and one consistent navigation model.
4. On mobile, the hamburger icon is visible but has no event handler and the sidebar remains hidden. Add a real open/close menu interaction in the prototype.

### P1 — Controls that look actionable but are inert

The prototypes contain controls for adding/editing businesses, showing credentials, creating/editing groups, opening annual tasks, selecting import files, export, filters, column settings, and settings actions. Most have no event behavior.

Before presenting the prototype as an interactive walkthrough:
- either implement the specific preview interaction (navigation, open/close, tab/filter state, reveal/hide sample credential, modal preview), or
- render nonfunctional controls as clearly disabled/static examples so they do not imply completed behavior.

Do not connect these preview controls to real records or production APIs.

### P1 — Business data completeness

The directory table currently shows a subset of fields, while its lower detail summary uses broad category labels rather than exposing every confirmed field.

The final detail view must make all existing BusinessRecord fields inspectable:
- sequence number, business name, type, tax ID;
- E-Filing code, SSO code, password (masked by default);
- auditor date, remark, status, DBD verification flag;
- optional topic, source type, source file name;
- created and updated timestamps.

The table may remain concise and horizontally scrollable, but the user must be able to reach all fields from the selected business detail. Column visibility must never remove data from records or exports.

### P1 — Mobile information architecture

The current mobile CSS hides the sidebar but does not provide an operable replacement navigation. The mobile directory also needs a clear path to every record field and row action without relying on a desktop-width table.

Acceptance criteria:
- working mobile menu with active-page indication;
- directory rows/cards retain business name, type, sequence, and status;
- opening a record exposes every confirmed field;
- import/export and other secondary actions remain reachable;
- no critical action is available only through hover.

### P2 — Empty, loading, error, and permission states

The prototypes focus on populated sample screens. Add visual states for:
- no businesses / no annual tasks;
- loading;
- D1/network unavailable;
- permission denied;
- import validation failure and duplicate-resolution step;
- no search results.

Do not use invented KPI values or dates in a live implementation. The existing blueprint already requires real-data-derived metrics and honest empty states.

## Domain decisions that remain approval-gated

The Groups & Relationships proposal must not be implemented until the user approves:
- whether membership can be many-to-many;
- whether relationship links have direction;
- custom relationship type semantics;
- duplicate membership rules;
- unlinking/deleting group behavior;
- permissions for group membership and visibility;
- whether any aggregate reporting is desired.

Default safety rule: each business retains its own registration, accounting, compliance, and revenue records. No group-level roll-up by default.

## Recommended correction sequence

1. Consolidate both prototypes into one consistent shell/navigation model.
2. Add working preview navigation and mobile menu behavior.
3. Complete business detail field coverage and verify directory-to-detail access.
4. Make action affordances honest: preview interaction or visibly disabled state.
5. Add empty/loading/error/permission/import states.
6. Present the consolidated prototype for user review.
7. Only after explicit approval, plan application-code implementation. No production deployment or D1 changes are part of this design QA step.

## Status

- Source-level review: completed.
- HTML prototypes: remain design-only examples with sample data.
- Application code changed: no.
- Main branch changed: no.
- Cloudflare production changed: no.
- D1 schema/data changed: no.
