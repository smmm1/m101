# M101 Application Shell — Phase 2

## Purpose
Establish one consistent navigation and workspace frame around the existing M101 modules. This phase is presentation and navigation only; it does not change APIs, D1, authentication, permissions, or business workflows.

## Shared shell
- Fixed-width desktop sidebar with grouped navigation and clear active-page treatment.
- Optional collapsed desktop sidebar that preserves icon navigation and expands the content canvas.
- Consistent top bar containing page context, global search, workspace/year controls, refresh, and account menu.
- Shared content canvas with predictable minimum-width and overflow behavior.
- Mobile navigation uses an accessible menu toggle, a dismissible scrim, an explicit close control, and keyboard focus containment with focus restoration.
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
- Verify the mobile navigation moves focus inside, contains Tab/Shift+Tab, closes on Escape, and restores focus to the menu toggle.
- Verify the profile dropdown exposes disclosure state and its controls remain keyboard reachable.
- Verify workspace/year selection, page navigation, global search handoff to the directory, profile menu, and sign-out remain operational.
- No Production deployment or Production D1 changes without explicit user approval.


## Preview deployment record
- Cloudflare Pages Preview deployment: https://4a99051e.m101-directory.pages.dev
- Deployment ID: `4a99051e-7a49-436b-9ecf-a9061c5d3dc4`
- Commit: `c04448251aed3212ad5d0884ac68c83dfd019ee4`
- Cloudflare queued, initialize, clone, build, and deploy stages all completed successfully on 2026-11-14.
- Cross-device visual and authenticated workflow QA still requires a real browser session; this is not represented as passed by the deployment status.


## Keyboard accessibility follow-up
- Commit: `154693c01cb316f1206731036ddbcfce949c48c1`
- Mobile navigation now moves focus into the sidebar when opened, contains keyboard Tab navigation, and restores focus to the invoking menu button when closed.
- Profile actions now use disclosure semantics rather than an incomplete ARIA menu role.
- Cloudflare Preview build and deploy passed for this commit at https://18025e04.m101-directory.pages.dev.
- Real-browser visual and authenticated workflow QA remains outstanding; build/deploy success does not replace those checks.
