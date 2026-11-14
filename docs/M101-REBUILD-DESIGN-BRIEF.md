# M101 Rebuild — Dashboard Design Brief

## Product direction
Rebuild the existing M101 application in place. Preserve the login/authentication foundation only; do not carry forward the previous dashboard composition, navigation layout, visual styling, or placeholder content into the new workspace.

Repository: `smmm1/m101`
Production target: `https://m101-directory.pages.dev/`
Hosting/data platform: Cloudflare Pages + Cloudflare D1 only.
Work branch: `feature/m101-dashboard-rebuild-reference`
This branch is for Preview/review; do not merge to `main` or deploy Production as part of the design pass.

## Visual reference
Use the user-supplied GOODFOOD dashboard screenshot as the visual direction:
- Light, white-first workspace with a restrained pale blue-gray sidebar.
- Clear blue accent for active navigation and chart series.
- One compact top bar containing current page context, global search, year selector, notifications, and account controls.
- Thin dividers, restrained borders, modest radii, and generous but efficient spacing.
- Compact icon-led actions; avoid oversized buttons and stacked decorative cards.
- Dashboard charts and data visualizations should be functional and derived from persisted M101 data, never copied sample values from the reference image.
- Adapt the reference to Mustang/M101 identity; do not use GOODFOOD branding or food-related content.

The Figma Community reference URL supplied by the user is:
https://www.figma.com/community/file/1073116958099793906/project-management-dashboard

## Information architecture
The user asked to also implement the specific Team1 dashboard page as a reference for information completeness:
https://team1-dashboard.pages.dev/c/MUdGss5W2BELQGGpogCpi1gmm1PeVmUY/

Use its information architecture and completeness as a reference only. Do not copy its visual design. The page could not be inspected by the available web preview during this pass, so do not claim its exact fields or behavior have been verified.

## Dashboard content
The first dashboard should balance:
1. Business portfolio overview — total registered businesses and meaningful breakdowns by entity type/status.
2. Annual obligations — annual task completion, overdue items, upcoming deadlines, and category-level progress.
3. Useful work queues — recent/unfinished work that can be acted on directly.

All counts, labels, and charts must be sourced from real persisted M101 data. If a data source or field does not exist, show an honest empty/unsupported state rather than inventing values.

## Business registry
The business registry must preserve complete business information and remain data-first. Redesign presentation without silently dropping fields or simplifying the table to the point that important information disappears. Keep actions compact and consistent.

## Login
The login page should be deliberately minimal: a quiet blank page with only a single prominent floating login panel. Remove marketing copy, decorative side panels, visitor entry, and unrelated UI from the login screen. Preserve the authentication foundation and server-side authorization.

## Workflow and safety
- Design/review pages one at a time before implementing the next page.
- Do not invent placeholder pages or sample business records.
- Do not delete or rewrite D1 production data during UI work.
- Do not change Vercel or Supabase.
- Validate build/typecheck and Cloudflare Preview before any production release.
