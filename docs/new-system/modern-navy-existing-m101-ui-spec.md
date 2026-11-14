# Modern Navy UI Specification — Existing M101

**Scope:** Visual modernization of the current M101 app, not a new product.  
**Reference:** Team1 is used for information hierarchy and workflow ideas only.  
**Visual direction:** Modern Navy, restrained and professional.

## 1. Application frame

### Desktop
- Keep a persistent left sidebar for the five existing primary areas.
- Keep one compact top bar for current page title, global business search, fiscal-year selector, activity indicator, and account menu.
- Keep the main content region fluid and data-first.
- Do not scatter year, search, and account controls into separate headers.
- The sidebar is navigation, not a second dashboard.

### Mobile
- Keep the existing compact top utility bar.
- Convert the primary sidebar into a horizontally scrollable bottom/secondary navigation strip.
- Keep touch targets comfortable; avoid wrapping utility controls into multiple disconnected rows.
- Tables remain horizontally scrollable when necessary; do not hide columns to make them fit.

## 2. Existing navigation (preserve existing capabilities)

1. **ภาพรวม** — existing DashboardView overview.
2. **ทะเบียนกิจการ** — existing directory list and selected business record panel.
3. **งานประจำปี** — existing AnnualTasksView.
4. **นำเข้า / ส่งออก** — existing ImportDocumentView, Excel mapping, and duplicate-conflict resolution.
5. **ตั้งค่าระบบ** — existing SettingsView.

Privileged admin controls remain accessible only to authorized administrators. AFK remains an independent idle experience, not a primary work destination.

## 3. Modern Navy visual language

- Primary: deep navy, used for active navigation, primary actions, focus, and key data emphasis.
- Canvas: cool, very light blue-gray.
- Surfaces: white, with thin cool-gray borders.
- Text: dark blue-gray, with muted secondary text.
- Semantic status: green = completed/success; amber = attention/at risk; red = overdue/error; blue = information.
- Avoid using navy as a full-page background or applying colored panels to every card.
- Use restrained shadows, modest radii, consistent spacing, and clear typographic hierarchy.
- Keep data tables flat and readable; avoid unnecessary nested cards and decoration.

The shared palette is implemented in `src/design-system/tokens.css`. Existing feature CSS must migrate toward these tokens instead of introducing competing colors.

## 4. Dashboard

Keep the existing dashboard functions:
- Total businesses in selected fiscal year.
- Completed, in progress, and pending/unknown record statuses.
- Breakdown by existing business type.
- Annual task summary and recent business records.
- Quick access to directory, import, and add-business actions.

Presentation rules:
- KPI values are clickable/drillable only when the destination can apply the exact same filter and count.
- Label directory workflow status separately from tax filing/legal compliance status.
- Explain the selected fiscal year and the scope of each metric.
- Never silently classify unknown legacy status as overdue or legally incomplete.
- Keep the dashboard concise; place detailed lists and breakdowns below the key metrics.

## 5. Business directory

Keep all current business record fields and capabilities. The table redesign must not remove information merely to create more whitespace.

- Keep search, current filters, sorting, record selection, and row-level actions.
- Preserve sequence number, business name, business type, tax identifier, e-Filing/SSO details, auditor/contact field, record status, verification/source metadata where currently available.
- Use clear column labels, stable alignment, tabular numerals, and subtle row separators.
- Use compact icon-led actions with text labels or accessible tooltips.
- Keep full record details available in the selected-record panel or detail modal.
- Do not expose the credential-like `password` field in global search, dashboard summaries, activity history, or public visitor views.

## 6. Annual tasks

Keep the existing annual task D1 table and API contract while redesigning presentation:
- Clear summary counts and status filters.
- Search by business, task type, and note.
- Show due date and overdue status distinctly.
- Preserve add/edit/delete and custom task types.
- Assignment and team ownership are future enhancements that require server-side authorization first.

## 7. Import and data safety

Keep the existing original import flow and the separate Excel mapping flow:
- File selection and sheet/table selection.
- Field mapping.
- Preview before writing.
- Duplicate detection and explicit conflict resolution.
- Reuse the existing import write flow; do not create a parallel import engine.
- Show the selected fiscal year before import confirmation.
- Never silently overwrite or delete records during mapping.

## 8. Interaction and accessibility

- Every interactive control has a visible focus state.
- Keyboard shortcuts remain discoverable and do not intercept typing in inputs.
- Escape closes dialogs and menus where appropriate.
- Respect reduced-motion preferences.
- Provide loading, empty, error, and saved states.
- Keep destructive actions explicit and confirmable.
- On mobile, controls must not rely on hover.

## 9. Implementation status

- Shared Modern Navy tokens: implemented on the working branch.
- Primary sidebar visibility: restored on the working branch; it had been explicitly hidden by a CSS rule even though the existing JSX navigation was present.
- Unified topbar and responsive behavior: existing components/styles are retained; further refinements require preview verification.
- Page-level visual migration: not yet complete.
- Production deployment: not performed.
