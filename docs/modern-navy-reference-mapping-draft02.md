# M101 — Modern Navy UX/UI Reference Mapping (Draft 02)

> Status: design proposal only. This document does not change application code, D1 schema/data, Cloudflare configuration, or production deployment.
> Branch: `design/m101-modern-navy-ux-blueprint`
> Reference: user-provided Team1 Executive HTML and URL, used only as a functional/structural reference. The Team1 visual identity, component styling, and page composition are not to be copied.
> Product direction: Mustang / M mark; Modern Navy; Thai-first; simple to scan; preserve M101 capabilities and complete business data.

## 1. What Draft 02 corrects

Draft 01 described a generic executive workspace. Draft 02 maps the reference's actual information architecture to M101's current code and data model, and separates:
- capabilities already present in M101;
- reference patterns that can be adapted;
- proposed capabilities that need product/data-model work before implementation.

The design is not a Team1 reskin. M101 will have its own Mustang identity, layout proportions, typography, navy usage, component language, and interaction details.

## 2. Reference-to-M101 mapping

| Reference principle | M101 adaptation | Current evidence / boundary |
|---|---|---|
| Sidebar navigation | One compact left sidebar grouped by workspace, business, work, and administration | Current app already has a sidebar, but navigation and content shell need a coherent rebuild |
| Global search in shared top bar | One global search field in the unified top bar; search businesses and provide command navigation separately | Existing global business search and Ctrl/Cmd+K command palette are separate behaviors; unify their visual placement without conflating their results |
| Executive KPI row | Four compact metrics: total businesses, completed, in progress, pending/unknown | These four counts are already calculated from current-year BusinessRecord data |
| Workload/status visualization | Show business-record status separately from annual statutory task status | Current overview has a business status distribution and a breakdown by business type; AnnualTasksView has its own task counts and task-type breakdown |
| Five recurring work categories | Use the five current built-in task types as the initial categories | Current codes: PND50, SBCH3, PND51, DBD_FS, AGM; custom task types are also supported |
| Overdue / upcoming deadlines | A focused list driven by saved annual-task dueDate and status | Annual task model stores dueDate; overdue is derived when status is not completed and dueDate is before today. No fabricated dates |
| Fiscal year filter | Keep year selector in the same top workspace bar | Existing selectedYear and availableYears are supplied by App state and D1-backed data |
| Reports / print | Design a report entry point only after available data and export behavior are confirmed | Current code has Excel export/JSON backup in settings and import workflows; a dedicated PDF report workflow is not confirmed by this inspection |
| Responsive workspace | Sidebar drawer on mobile; preserve all important data via responsive table or full detail view | Existing directory table has a wide minimum width and a selected-record detail panel |

## 3. M101 data model facts used in this design

### Business record

The current `BusinessRecord` interface contains:

- `id`, `sequenceNo`, `companyName`, `type`
- `taxId`, `eFilingCode`, `ssoCode`
- `auditorDate`, `password`, `remark`
- `status`, `isVerifiedDbd`
- optional `topic`, `sourceType`, `sourceFileName`
- `createdAt`, `updatedAt`

Business types currently defined: company, partnership, individual.
Business statuses currently defined: pending, in_progress, completed.

**Directory presentation rule:** the new table must not lose the current searchable and operational fields. The default table should make sequence, business name/type, tax ID, E-Filing, social-security code, verification state, and work status easy to scan. Auditor/date information, remarks, source metadata, and the remaining fields must remain immediately inspectable in a full-width detail panel or record view. Sensitive credentials such as `password` must not be exposed as a normal table column; show them only in a permission-checked detail area with masking/reveal and copy controls.

### Annual task record

The current annual-task view defines:
- `id`, `fiscalYear`, `businessId`, `businessName`
- `taskCode`, `taskName`, `status`, `dueDate`, `note`
- `createdAt`, `updatedAt`

Built-in task categories:
1. ภ.ง.ด.50 (`PND50`)
2. ส.บ.ช.3 (`SBCH3`)
3. ภ.ง.ด.51 (`PND51`)
4. นำส่งงบการเงินต่อ DBD (`DBD_FS`)
5. ประชุมสามัญผู้ถือหุ้น (`AGM`)

Custom task types are supported. The dashboard should show categories that actually exist in saved tasks, not force empty categories or invent completion totals. Task status and business-record status are separate concepts and must never be combined into one misleading KPI.

## 4. Revised information architecture

### Sidebar

Keep the sidebar compact and shallow; avoid nested navigation trees.

- **ภาพรวม**
- **ทะเบียนกิจการ**
- **กลุ่ม / ความสัมพันธ์** — proposed capability; show only when implemented
- **งานประจำปี**
- **นำเข้า / ส่งออก**
- Divider
- **ตั้งค่า**

Use the M mark and Mustang name as the brand lockup. Do not use the legacy SchoolHub name or M101 as the primary brand wordmark. M101 may remain as the internal project identifier where needed.

### Unified top workspace bar

One aligned horizontal surface:
- current page name / breadcrumb;
- selected accounting year;
- global search;
- activity/history access only if backed by persistent or clearly session-scoped data;
- account/avatar menu.

Do not create a second detached toolbar for year, search, or account. On small screens, collapse search to an explicit search action and place navigation in a drawer.

## 5. Screen specifications — revised

### A. Executive overview

**Top:** “ภาพรวม” and a short contextual line; primary quick actions remain compact.

**KPI row (four):**
- กิจการทั้งหมด
- เสร็จสิ้น
- กำลังดำเนินการ
- รอดำเนินการ / ยังไม่ระบุ

All four are filtered to the selected fiscal year and derived from BusinessRecord. Clicking a KPI opens the directory with the corresponding filter.

**Main content:**
- Left / wide: business-record status distribution and business-type comparison.
- Right / narrow: annual task attention list — overdue first, then upcoming by due date — based only on saved annual tasks.
- Lower area: annual-task progress by the five built-in categories plus any custom category present in the data.
- Recent businesses / recent activity may appear as a compact list only when the timestamp/activity source is reliable.

**Important distinction:** the four top KPIs describe business records. Annual-task counts describe tax/accounting work. Label both clearly and do not merge them.

### B. Business directory

The existing table + selected-record detail pattern is the starting point, not something to discard. Recompose it into a calmer workspace:
- heading and count;
- compact action group: add, standard import, column-mapping import, bulk delete;
- one search/filter row;
- complete, readable table;
- selected record detail panel that can expand or become a drawer.

The default table should include the operational identifiers and statuses. Provide column settings and horizontal scrolling rather than deleting information. Preserve sorting, E-Filing filters, row selection, drag reorder (when permitted), and edit/detail actions.

### C. Business detail

Use a dedicated record view/drawer with clear sections:
- ข้อมูลหลัก;
- รหัสและการเข้าถึงข้อมูลสำคัญ;
- งานประจำปี;
- แหล่งที่มาและประวัติ;
- กลุ่ม / ความสัมพันธ์ (once implemented).

Do not expose credentials in list views or broad overview cards. Do not infer a legal registration number field that is not in the current interface.

### D. Groups & relationships

This is a new product capability, not a current BusinessRecord field. Design for:
- user-defined relationship/group labels;
- one business can belong to multiple groups;
- independent businesses remain independent records;
- accounting, compliance, revenue, identifiers, and task histories remain scoped to each business;
- group summaries, if later supported, are explicit calculated aggregates only.

No schema implementation is authorized by this document. Domain model, membership rules, directionality, permissions, and aggregation rules require a separate approved design before database work.

### E. Annual work

Use the existing annual-task record as the source:
- summary counts: total, completed, in progress, overdue, pending;
- category progress from actual saved task types;
- filter by year, business, task type, and status;
- full list with business, task, status, due date, and note;
- overdue calculated from dueDate + status only.

Do not imply assignment/owner fields or exemption states; they are not in the inspected task interface.

### F. Import & export

Keep both import pathways:
- standard import;
- sheet/table + column mapping import.

Preserve the existing safe flow: file → sheet/table → mapping → preview → duplicate resolution → explicit confirmation → server persistence. Keep the year destination visible. Export controls must clearly state file format and scope. Do not claim PDF reports are available until a real PDF workflow is verified or implemented.

### G. Settings & access

Organize settings by task, not by decorative cards:
- workspace identity/preferences;
- account/security;
- access/roles;
- data backup/restore and export.

Remove legacy SchoolHub branding from user-facing M101 identity. Do not change authentication, access rules, or backup semantics as part of a visual-only pass.

## 6. Visual direction — Mustang Modern Navy

- Brand anchor: deep navy, used for navigation, selected states, and primary emphasis.
- Reading surfaces: white / cool light gray; no full-page dark treatment by default.
- Distinct Mustang identity: M monogram, custom wordmark treatment, restrained line/icon language.
- Typography: Thai-first, highly legible, numeric alignment for IDs and years.
- Tables: flat, high-contrast, complete; subtle row separators; no alternating saturated fills.
- Buttons: compact icon + short label; one primary action per screen, secondary actions quiet.
- Cards: use only for meaningful summaries; avoid nested card-on-card layouts and ornamental gradients.
- Charts: minimal axes/labels and direct links to the underlying filtered records.
- Motion: subtle and optional; honor reduced-motion settings.

## 7. Implementation mapping and safeguards

| Area | Existing source to preserve | Redesign boundary |
|---|---|---|
| App state / authentication / year | `src/App.tsx` | Do not alter D1 source-of-truth or session logic during shell styling |
| Workspace shell / directory / overview | `src/components/DashboardView.tsx` | Rebuild presentation after approval; preserve handlers and navigation behavior |
| Business schema | `src/types/index.ts` | No destructive field rename/removal |
| Annual tasks | `src/components/AnnualTasksView.tsx` | Redesign views only; keep task API and date/status semantics |
| Business forms/details | Add/Edit/Detail modal components | Preserve validation and permission boundaries |
| Imports | `ImportDocumentView`, `ExcelMappingImportModal`, `ImportConflictModal` | Do not merge or replace the two import pathways |
| Theme styles | `src/index.css`, `src/m101-redesign.css`, `src/m101-business-theme.css` | Replace legacy visual language only after approved component plan |

## 8. Open items requiring later confirmation

These are not blockers for reviewing the visual structure, but must be resolved before the related feature is implemented:
1. Exact group/relationship model and whether relationship labels are directional.
2. Which fields should be visible by default in the directory versus the expanded detail view, especially credential handling.
3. Whether a formal PDF/report center is required, and which report types and data scopes it must contain.
4. Whether activity history should be persistent server-side or remain session-only.

## 9. Approval boundary

Draft 02 is a reference-grounded design proposal, not an implementation commit. No application code, D1 schema, production data, Cloudflare settings, or production deployment has been changed. The next implementation stage should begin only after this information architecture and the screen hierarchy are approved. Each screen should then be implemented and reviewed incrementally, with regression checks against the existing M101 workflows.
