# M101 Design System — Premium Minimal

Status: Phase 1 foundation  
Product: M101 Business Operations Workspace  
Direction: Premium Minimal (C) · Balanced information density

## Design principles
1. Calm hierarchy: content first, decoration last.
2. Consistent scale: controls are comfortable to use, not miniature and not oversized.
3. High information utility: retain business fields and operational context while removing redundant explanatory copy.
4. Quiet confidence: warm neutral surfaces, restrained earthy accent, fine borders, minimal shadow.
5. Predictable behavior: shared patterns for actions, forms, tables, dialogs, status, focus, and feedback.
6. Responsive by intent: desktop density remains balanced; mobile reorganizes content instead of shrinking it.

## Color roles
| Role | Token | Value |
|---|---|---|
| Canvas | --ds-bg | #F7F6F2 |
| Surface | --ds-surface | #FFFFFF |
| Subtle surface | --ds-surface-subtle | #FBFAF7 |
| Primary text | --ds-text | #292923 |
| Secondary text | --ds-text-secondary | #55544D |
| Muted text | --ds-text-muted | #858278 |
| Border | --ds-border | #E8E5DC |
| Strong border | --ds-border-strong | #DCD8CD |
| Brand | --ds-brand | #76634D |
| Success | --ds-success | #587653 |
| Warning | --ds-warning | #987342 |
| Danger | --ds-danger | #A65F52 |

## Typography
- Inter for Latin/numeric UI; IBM Plex Sans Thai for Thai UI.
- Body: 14px; secondary: 12px; metadata: 11px.
- Section heading: 18px; page heading: 28px; large display values: 32px.
- Numeric values use tabular numerals where appropriate.

## Layout and density
- 4px base spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48px.
- Default control height: 40px; compact action: 32px; large form action: 44px.
- Border radius: 4 / 6 / 8 / 12px.
- Default content max width: 1760px; comfortable desktop gutters 32–36px, mobile 13–20px.
- Avoid card nesting. Use flat sections and tables where they communicate structure better.

## Component contracts
- Buttons: primary, neutral, quiet, destructive, compact, icon-only. Each must have a clear accessible name.
- Forms: persistent labels, 40px controls, visible focus, inline validation, no placeholder-only labels.
- Tables: semantic headers, 12px readable body, 11px metadata, sticky header only when useful, horizontal overflow contained to table.
- Status: semantic color plus text; never communicate status by color alone.
- Dialogs: restrained overlay, clear title, predictable footer actions, close/cancel behavior.
- Feedback: visible loading, success, empty, and error states; do not silently discard input.
- Accessibility: keyboard focus, reduced-motion support, contrast, and touch targets.

## Phase 1 deliverables
- Shared design tokens and compatibility aliases.
- Global typography and browser baseline.
- Reusable button, icon-button, form, badge, table, progress, surface, menu, and dialog primitives.
- No business logic, API contract, database schema, authentication, or production configuration changes.

## Rollout
Phase 1 establishes the shared visual language. Phase 2 applies the system consistently to the application shell and navigation; subsequent phases redesign each page and verify behavior in Cloudflare Pages Preview. Production remains unchanged until explicit approval.
