# M101 — Modern Navy UX/UI Blueprint (Draft 01)

> Status: design proposal only. This document does not change application code, production data, Cloudflare configuration, or the production deployment.
> Base: `main` at the time this branch was created.
> Direction approved by product owner: Modern Navy; rebuild the M101 experience around the working principles and information architecture of the reference product, without copying its visual design.

## 1. Product design goals

1. Make M101 feel like a coherent professional business-workspace, not a collection of unrelated screens.
2. Make the most frequent work — finding a business, opening its record, reviewing annual work, and updating its status — direct and predictable.
3. Preserve complete, readable business data. Redesign the presentation; do not simplify away existing columns or fields.
4. Keep each business as an independent record with its own accounting, compliance, and revenue information.
5. Allow a business to be independent or associated with one or more user-defined groups/relationships. A relationship must not merge the underlying business records or their financial/compliance data.
6. Use clear Thai-first labels, restrained visual hierarchy, accessible contrast, and responsive layouts.
7. Preserve existing data and working workflows during the redesign. No destructive database migration is implied by this design document.

## 2. Proposed application shell

### Desktop

- **Left navigation rail/sidebar:** M101 mark and workspace identity at the top; grouped navigation below; current section clearly highlighted; account/settings controls anchored at the bottom.
- **Top workspace bar:** current page title/breadcrumb on the left; fiscal/accounting year selector, global search, and account menu on the right. Keep these controls in one aligned bar rather than scattering them across separate headers.
- **Main content area:** page-specific content with consistent page heading, concise description, and compact primary actions.
- **Content width:** fluid with a readable maximum width for forms and detail views; wide tables may use the full available content width.

### Mobile

- Sidebar becomes a compact drawer; the active page remains obvious.
- Keep the year selector and account actions reachable without forcing a wide desktop header.
- Tables retain all fields through horizontal scrolling, column visibility controls, or a deliberate mobile record layout. Never silently omit important fields.
- Touch targets remain comfortable; toolbar actions become compact icon-plus-label controls or icon-only controls with accessible names where space is tight.

## 3. Proposed information architecture

| Navigation group | Destination | Primary purpose |
|---|---|---|
| Overview | Executive overview | Current-year workload, key counts, upcoming/overdue work, and recent activity derived from saved data |
| Business workspace | Business directory | Search, filter, sort, add, edit, view, archive/delete according to existing permissions |
| Business workspace | Groups & relationships | Create and manage user-defined groupings/relationships without combining business records |
| Work management | Annual work | Track annual tasks and compliance progress by business and accounting year |
| Data operations | Import & export | Existing Excel/CSV import, mapping, preview, duplicate resolution, and supported exports |
| Administration | Settings & access | Account, roles, workspace configuration, backup/restore, and security controls permitted to the current role |

Navigation names and the final placement of destinations are proposals pending owner review. Existing features must not be removed simply because they are not shown in this draft.

## 4. Core page layouts

### 4.1 Executive overview

- Page heading: “ภาพรวม” with selected accounting year visible in the shared workspace bar.
- First row: a small set of high-value metrics, sourced only from persisted records.
- Main area: annual-work status and workload by month/category, plus overdue and due-soon items.
- Secondary area: recent activity and quick links to the directory or annual work.
- Do not invent assignees, exempt/not-required statuses, statutory due dates, or sample counts when the data model does not contain those facts.
- Clicking a metric or status should lead to a filtered view, not a dead-end decorative card.

### 4.2 Business directory

- Preserve the completeness of the existing table as the baseline.
- Use a clean table with strong column hierarchy, readable spacing, consistent row height, and restrained separators.
- Keep search, filters, year context, and compact actions together above the table.
- Support row-level open/view and permitted edit/delete actions without crowding every row.
- Provide a clear empty state, loading state, error state, and no-results state.
- For smaller screens, expose the same data through responsive table behavior or a complete record view.

### 4.3 Business detail

- Present the business identity and key identifiers first.
- Use clearly named sections/tabs for profile, accounting/compliance, annual work, and relationships where supported by actual data.
- Keep each business's own accounting, compliance, and revenue records scoped to that business.
- Show linked groups/relationships as associations, with navigation to the other business record; do not imply shared financial data.

### 4.4 Groups & relationships

- Allow one business to be independent or associated with multiple user-defined groups/relationships.
- A group is an organizational relationship, not a merged legal/business entity.
- Each member retains its own identifier, record, accounting, compliance, and revenue history.
- Group-level summaries may aggregate only when explicitly defined and clearly labeled as calculated summaries; they must never overwrite or replace individual records.
- The exact group types, fields, and permissions require product-owner confirmation before database design.

### 4.5 Annual work

- Show progress by business and year, with clear states and due-date context only where dates are stored or reliably calculated.
- Provide a compact overview and a detailed task list.
- Keep task creation/editing distinct from executive reporting.
- Do not show unimplemented dimensions such as assignee or exemption status as if they exist.

### 4.6 Import & export

- Preserve the current safe import sequence: choose file → choose sheet/table → map columns → preview rows → resolve duplicates → confirm save.
- Keep the standard import and mapping import pathways distinct where they currently serve different purposes.
- Make it explicit which accounting year receives imported records.
- Show success only after persistence and duplicate resolution have completed.

### 4.7 Settings & access

- Separate ordinary workspace preferences from sensitive administration.
- Show role and access state clearly.
- Keep backup/restore and destructive actions behind explicit confirmation and appropriate permissions.
- Do not expose hidden admin controls as ordinary navigation.

## 5. Modern Navy visual system — initial proposal

These are starting tokens for review, not a final locked palette.

| Token | Proposed value | Usage |
|---|---|---|
| Navy 950 | `#0B1F36` | Brand anchor, deep navigation surfaces |
| Navy 900 | `#142B4A` | Primary brand and active navigation |
| Navy 700 | `#244B73` | Secondary emphasis |
| Blue 600 | `#3977B9` | Primary actions and links |
| Canvas | `#F4F7FB` | Application background |
| Surface | `#FFFFFF` | Tables, forms, and content surfaces |
| Border | `#DCE4EE` | Dividers and control outlines |
| Text | `#172334` | Primary text |
| Muted | `#64748B` | Secondary text |
| Success | `#16835D` | Completed/success state |
| Warning | `#B7791F` | Due soon/attention state |
| Danger | `#C24141` | Error/destructive state |

### Visual rules

- Professional, calm, and modern; no retro terminal aesthetic, no decorative gradients as the dominant surface, and no oversized ornamental cards.
- Use navy selectively for structure and emphasis; keep large reading surfaces light.
- Prefer typography, alignment, spacing, and subtle borders over heavy shadows.
- Use status color semantically and consistently; never rely on color alone.
- Use one consistent icon family and compact action sizing.
- Use Thai-first typography with clear numeric alignment for IDs, years, and financial values.
- Respect reduced-motion preferences and provide visible keyboard focus.

## 6. Shared interaction patterns

- Consistent page heading: title, short description, and primary action.
- Consistent filters/search placement across list pages.
- Confirm before destructive actions; explain what will be affected.
- Preserve user input on recoverable errors.
- Distinguish loading, empty, error, success, and permission-denied states.
- Use accessible labels for icon-only controls.
- Do not report a save/import as successful until the server confirms persistence.

## 7. Data and migration guardrails

- Cloudflare Pages remains the production target; Cloudflare D1 remains the intended persistent data source.
- No Vercel or Supabase dependency is introduced by this design.
- No production schema or records are changed by this blueprint.
- Before any schema migration: map current entities and relationships, identify existing records, write a reversible migration/backup plan, and validate against a non-production environment.
- Existing business records, annual-task records, import behavior, authentication, and role restrictions must be regression-tested before release.

## 8. Delivery sequence

1. **Approve information architecture and shared shell** — navigation, header, year selector, global search, account area.
2. **Approve page wireframes** — overview, directory, business detail, groups/relationships, annual work, import/export, settings.
3. **Approve visual tokens and components** — typography, color, buttons, fields, table, badges, dialogs, responsive behavior.
4. **Implement the shell and one representative page** — behind a dedicated design branch; no production deployment.
5. **Review on desktop and mobile** — verify complete data visibility, accessibility, and existing workflows.
6. **Migrate page-by-page** — preserve data and test each workflow before moving on.
7. **Validate Cloudflare build, D1 behavior, authentication, and production preview** before any merge/deploy.

## 9. Decisions required before implementation

1. **Groups/relationships:** What relationship types should be available initially (for example, “กลุ่มกิจการ”, “บริษัทในเครือ”, “ผู้ถือหุ้นร่วม”, “สำนักงาน/สาขา”), and should users be able to create arbitrary custom labels? The data model should not assume these are equivalent.
2. **Executive overview:** Should the first screen prioritize (A) annual compliance/workload, (B) business portfolio/organization, or (C) a balanced split? Draft recommendation: balanced, with annual work as the main panel.
3. **Directory default:** Should the directory open as the default landing page after login, or should the executive overview be the landing page? Draft recommendation: executive overview for admin; directory for members, subject to role requirements.

## 10. Approval boundary

This blueprint is a proposal. Do not merge, deploy, alter production data, or run a destructive migration based solely on this document. Implementation begins after the owner approves the shell and the three decisions above.
