# M101 Unified Design System

**Status:** Active implementation standard  
**Scope:** Entire M101 frontend: every view, modal, form, table, and responsive state  
**Principle:** One product, one design language, one source of truth.

## 1. Governance

This document and `src/design-system/tokens.css` define the authoritative visual standard. Feature pages must not introduce independent palettes, typography scales, spacing scales, radii, shadows, or interaction patterns.

When a request describes a global visual change, update the design-system source first, then audit every consumer. Page-specific exceptions require a functional reason and must continue to use global tokens and shared components.

## 2. Product direction

- Clean, minimalist, human-centric business and account management SaaS.
- Light theme: Modern Navy — deep navy primary actions and navigation, white surfaces, cool slate canvas/borders, restrained blue information accents, and semantic green/amber/red status colors. Color must communicate meaning, never decorate.
- Optimize readability, low cognitive load, and rapid data scanning.
- No terminal/retro styling, ASCII decoration, excessive gradients, glass effects, or decorative dashboard clutter.
- Direct data structures and clear forms; decoration must never compete with business information.

## 3. Color tokens

| Token | Value | Meaning |
|---|---|---|
| `--ds-color-canvas` | `#F4F6FA` | Application canvas |
| `--ds-color-surface` | `#FFFFFF` | Surface |
| `--ds-color-surface-subtle` | `#EEF2F7` | Subtle section/header fill |
| `--ds-color-border` | `#D9E1EC` | Dividers and borders |
| `--ds-color-border-strong` | `#9AAAC0` | Input/strong border |
| `--ds-color-text` | `#172033` | Primary text |
| `--ds-color-text-secondary` | `#526176` | Secondary text |
| `--ds-color-text-muted` | `#8190A5` | Placeholder/metadata |
| `--ds-color-primary` | `#142B4D` | Main action / navy |
| `--ds-color-success` | `#18794E` | Success |
| `--ds-color-warning` | `#A66A12` | Warning |
| `--ds-color-danger` | `#B42318` | Destructive/error |
| `--ds-color-info` | `#315F8C` | Informational |

All colors must be consumed through tokens. Semantic colors retain the same meaning across modules; use navy for primary navigation/actions and reserve green, amber, and red for status.

## 4. Typography

Font stack: Inter, Noto Sans Thai, Sarabun, system sans-serif.

| Role | Size | Weight |
|---|---:|---:|
| App identity | 18px | 600 |
| Page title | 24px | 700 |
| Section title | 18px | 600 |
| Subsection | 16px | 600 |
| Body/data | 14px | 400 |
| Form label | 13px | 500 |
| Table header/metadata | 12px | 500 |
| Button | 14px | 500 |

Thai text retains natural casing. Use tabular numerals for IDs and amounts where useful. Maintain readable line height and do not truncate critical identifiers.

## 5. Layout and spacing

- Header target: 64px. The existing shell currently uses 72px; retain its geometry until the shared shell is migrated as a whole.
- Content maximum width: 1440px.
- Desktop content padding: 32px; tablet: 24px; mobile: 16px.
- Standard section gap: 24px.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.
- Radius scale: 4, 6, 8, 12px; pill only for status badges.
- Borders: 1px solid token border; shadows are minimal and reserved for elevation.

## 6. Shared component specifications

### Buttons
Variants: primary, secondary, outline, ghost, danger, icon. Standard height 36px, 6–8px radius, 14px medium text, 16–18px icon. States: default, hover, active, focus-visible, disabled, loading. Icon-only controls need accessible labels and touch alternatives.

### Inputs and forms
Text, number, search, select, multi-select, date, textarea, checkbox, radio, switch, and file upload share a 40px control height, top-aligned labels, tokenized borders, visible focus, and consistent validation/error messaging.

### Tables
Use row-based data structures with subtle horizontal dividers rather than heavy card wrappers. Default row height 48–56px. Headers 12px medium on subtle neutral fill. Left-align names and identifiers, right-align numeric values, keep date alignment consistent, and use semantic status badges. Support search, filters, sorting, pagination, loading, empty, error, selection, and responsive overflow states.

### Status badges
Use soft semantic backgrounds and matching text. All status badges use grayscale surfaces and text; distinguish status with labels and icons, never color alone.

### Dialogs and modals
One shared overlay/dialog contract for standard, confirmation, form, detail, import, and export flows. Centered desktop dialog, viewport-safe mobile sizing, consistent title/body/footer, focus management, keyboard behavior, and clear destructive confirmation.

### Notifications
One global notification system for success, error, warning, and information. Messages must reflect actual operation outcomes; errors must explain recovery where possible.

### Navigation and application shell
One shared shell for global header, navigation, page container, search, system status, and profile/settings actions. Preserve existing routes and authorization behavior while migrating the shell.

## 7. Page templates

All modules use the same page-header hierarchy, spacing, action placement, search/filter patterns, content width, and responsive behavior.

- Dashboard: concise useful metrics, recent activity, important notices, and practical shortcuts only.
- Registry: primary action, search/filter row, data table, pagination, record detail/edit actions.
- Import/export: file selection, validation, sheet selection, table detection, column mapping, preview, confirmation, progress, result report.
- Annual tasks: structured list/timeline with task, due date, recurrence, status, and relevant record.
- Settings: consistent section headers, form layouts, and save/cancel patterns.

## 8. Responsive and accessibility requirements

- Mobile <640px: single column, touch-first, no hover-only actions.
- Tablet 640–1023px: compact navigation and flexible columns.
- Desktop >=1024px: full application shell.
- Wide desktop >=1440px: constrain content to shared max width.
- Tables use controlled horizontal scrolling or a purpose-built mobile representation.
- Touch targets should generally be at least 44px.
- Target WCAG 2.2 AA: contrast, keyboard focus, semantic controls, labels, dialog focus management, and accessible icon names.

## 9. System-first change protocol

1. Classify the request as token, shared component, shell/template, or page-specific behavior.
2. Inspect all consumers and existing overrides before editing.
3. Change the authoritative shared source, not a local copy.
4. Migrate all affected consumers.
5. Check all pages, modals, responsive states, and keyboard states.
6. Confirm business logic, auth, D1, CRUD, and import/export behavior remain intact.
7. Run typecheck/build and relevant tests.
8. Verify the real deployment before reporting it live.

## 10. Current migration status

The design-system foundation and first component migrations are in place:

- `src/design-system/tokens.css` is the central color, typography, spacing, shape, and layout token source.
- `src/design-system/components.css` defines shared button, field, select, textarea, badge, and page-header styles.
- `src/design-system/components.tsx` exports reusable React primitives: `DSButton`, `DSBadge`, `DSInput`, `DSSelect`, `DSTextarea`, and `DSPageHeader`.
- `src/design-system/index.css` is loaded once from the application entry point.
- The business theme and legacy M101 theme aliases now consume the global tokens.
- The application is standardized on the requested clean light theme; the conflicting dark-mode toggle is removed and stale dark preference is cleared.
- Annual Tasks, Add Business, Edit Business, and Bulk Delete dialogs use the shared React primitives.
- The business registry uses shared buttons, search input, status badges, and the shared table style contract.
- Excel/CSV mapping, duplicate-conflict, and import landing flows use shared buttons, selects, badges, and preview-table styles.
- Business detail and settings screens now use the shared page header, badges, and action buttons; settings text inputs also use shared fields.
- Admin Control Center navigation, global toast actions, and fiscal-year management controls now use the shared button, badge, input, select, and dialog styling contracts.
- Bulk Delete now uses tokenized modal surfaces, shared danger semantics, neutral row selection, and responsive dialog sizing; its selection and deletion behavior is unchanged.
- Add Business and Edit Business forms now use the shared modal surface, labels, fields/selects, section panels, error states, and responsive sizing; validation and save behavior are unchanged.
- Dialog overlays and panels across add/edit/detail/delete, import mapping, conflict resolution, and annual tasks now share tokenized surfaces, borders, shadows, radii, and subtle backdrop treatment.
- The legacy global palette and former green/blue accent treatments have been converted to monochrome grayscale; primary actions are black, surfaces are white/gray, and the novelty colored cursor has been removed.
- Excel/CSV sheet selection, table selection, mapping progress, empty-table guidance, and duplicate-resolution summaries now use neutral monochrome states without changing import logic.

Migration is not yet complete:

- `src/m101-redesign.css` remains a large legacy stylesheet. Do not delete it until every selector has been mapped to actual consumers and replacement styles have been verified.
- Remaining admin subviews, import progress/result states, and any unconverted utility actions still need component-by-component migration.
- Login, business-detail, settings, and dashboard screens have had their remaining emerald, rose, amber, and sky utility accents converted to grayscale; this was a visual-only change.
- The legacy redesign stylesheet still contains page-level color values that need a route-by-route audit against Modern Navy tokens.
- The global shell, all page templates, responsive states, and accessibility behavior still require a route-by-route audit.
- Deployment build success is not equivalent to full visual QA or functional regression testing.

Next migration sequence: finish import progress/result and remaining utility controls; then audit the global shell and every route at mobile/tablet/desktop widths. Remove dead legacy selectors only after verifying their consumers.

## 11. Definition of done

- [ ] One authoritative token source is used.
- [ ] Shared components do not have conflicting page-level copies.
- [ ] All affected pages follow the same hierarchy and spacing.
- [ ] Tables, forms, dialogs, badges, and buttons are consistent.
- [ ] Mobile/tablet/desktop have been checked.
- [ ] Accessibility and reduced-motion behavior have been checked.
- [ ] Existing application behavior remains intact.
- [ ] Typecheck and production build pass.
- [ ] Deployment status is verified when deployment is requested.

**Non-negotiable:** A change is not complete because one page looks correct. It is complete when every affected consumer follows the shared system.
