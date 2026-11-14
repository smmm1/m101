# M101 Application Shell — Phase 2

## Purpose
Establish one consistent navigation and workspace frame around the existing M101 modules. This phase is presentation and navigation only; it does not change APIs, D1, authentication, permissions, or business workflows.

## Shared shell
- Fixed-width desktop sidebar with grouped navigation and clear active-page treatment.
- Optional collapsed desktop sidebar that preserves icon navigation and expands the content canvas.
- Consistent top bar containing page context, global search, workspace/year controls, refresh, and account menu.
- Shared content canvas with predictable minimum-width and overflow behavior.
- Mobile navigation uses an accessible menu toggle, a dismissible scrim, and an explicit close control.
- Sidebar and content transitions respect reduced-motion preferences.

## Responsive behavior
- Desktop: expanded sidebar by default; user may collapse it.
- Tablet: narrower sidebar and tighter top-bar/content spacing.
- Mobile: off-canvas sidebar; desktop collapse control and breadcrumb are hidden to protect the search and account controls.
- Existing page-level responsive layouts remain responsible for their own tables, forms, and data panels.

## Preservation boundaries
- Existing route selection and page components remain intact.
- Existing search, year selection, workspace switching, refresh, profile menu, and sign-out actions remain wired to their existing handlers.
- No new route, placeholder module, API, database, or permission behavior is introduced.
- Login remains outside the authenticated workspace shell and retains its minimal presentation.

## Acceptance checks
- Confirm the branch Preview build and deploy succeed.
- Inspect expanded/collapsed desktop shell and mobile off-canvas navigation in Preview.
- Verify workspace/year selection, page navigation, global search handoff to the directory, profile menu, and sign-out remain operational.
- No Production deployment or Production D1 changes without explicit user approval.
