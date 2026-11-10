# M101 — Modern Navy Screen Wireframes (Draft 01)

> Status: visual/interaction proposal only. No application code, database schema, production data, Cloudflare configuration, or deployment is changed by this document.
> Branch: `design/m101-modern-navy-ux-blueprint`
> Direction: Modern Navy; compact sidebar + one unified workspace bar; balanced overview; complete business data remains visible.

## 1. Design constraints

- Keep the interface calm and uncluttered. Use whitespace and alignment, not nested cards or decorative panels, to create hierarchy.
- Sidebar is the only primary navigation. Do not duplicate the same navigation in a second horizontal menu.
- The workspace bar is one continuous row containing page context, year selector, global search, and account menu. At narrow widths, controls may collapse into accessible compact actions, but must remain discoverable.
- Every page has one clear primary action. Secondary actions are quieter and compact.
- Tables retain the full useful field set. Do not remove columns merely to make the page look minimal; use horizontal scrolling, column controls, or a complete mobile record presentation.
- Business relationships are associations. They never merge business identity, accounting, compliance, or revenue records.
- No invented metrics, task statuses, due dates, user roles, or data fields. Only show values supported by persisted data.

## 2. Shared shell

### Desktop (conceptual layout)

```text
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│ M101                 │ ภาพรวม                         ปีบัญชี [2569 ▾] [ค้นหาทั้งระบบ…] [บัญชี ▾] │
│                      ├────────────────────────────────────────────────────────────────────────────┤
│ WORKSPACE            │                                                                            │
│  ภาพรวม              │  Page title                                              [Primary action]  │
│                      │  Short page description                                                   │
│ BUSINESS             │                                                                            │
│  ทะเบียนกิจการ       │  Page-specific content                                                     │
│  กลุ่ม/ความสัมพันธ์  │                                                                            │
│                      │                                                                            │
│ WORK MANAGEMENT     │                                                                            │
│  งานประจำปี          │                                                                            │
│                      │                                                                            │
│ DATA                 │                                                                            │
│  นำเข้า / ส่งออก     │                                                                            │
│                      │                                                                            │
│ ───────────────────  │                                                                            │
│  ตั้งค่า              │                                                                            │
│  ผู้ใช้ / ออกจากระบบ │                                                                            │
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘
```

Rules:
- Sidebar width should be stable and modest; labels remain visible on desktop. Avoid a permanent icon-only rail on wide screens.
- Active navigation uses a restrained navy surface/indicator, not a large bright block.
- Workspace bar is visually unified with the content frame; avoid detached floating search and account cards.
- Page title in the bar reflects the current destination. The page heading below may carry a short description and action, but must not repeat a second oversized title.
- Account controls stay at the far end of the same bar on desktop.

### Mobile (conceptual layout)

```text
┌────────────────────────────────────────┐
│ [☰] M101      [ปี 2569 ▾] [ค้นหา] [บัญชี]│
├────────────────────────────────────────┤
│ ภาพรวม                                 │
│ สรุปงานและกิจการในปีที่เลือก            │
│                                        │
│ [Metric]             [Metric]          │
│                                        │
│ งานประจำปี                            │
│ …                                      │
└────────────────────────────────────────┘
```

- Navigation opens as a drawer; the current section is clear.
- Search can open a focused search panel instead of squeezing a long input into the header.
- Tables may scroll horizontally with a visible scroll cue. Provide a row-to-detail path so all fields can be read on a phone.
- Do not hide important fields without an alternative way to inspect them.

## 3. Screen A — Executive overview

### Information hierarchy

1. Page heading and concise context.
2. Small metric strip: business count, annual-work completion, outstanding work — only if the underlying data supports each measure.
3. Main panel: annual-work progress and next/overdue work.
4. Secondary panel: business portfolio snapshot or recent activity.
5. Direct links to the filtered work list and business directory.

### Desktop wireframe

```text
ภาพรวม
สรุปสถานะกิจการและงานประจำปี                         [ดูงานประจำปี]

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ กิจการทั้งหมด   │ │ งานที่เสร็จแล้ว │ │ งานที่ต้องติดตาม│
│       —         │ │       —         │ │       —         │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌──────────────────────────────────────────┐ ┌──────────────────────────────┐
│ ความคืบหน้างานประจำปี                    │ │ งานที่ใกล้ถึงกำหนด / ค้างอยู่ │
│                                          │ │                              │
│  สถานะงาน  [progress / compact chart]    │ │  • รายการงาน 1               │
│  [รายละเอียดตามสถานะ]                    │ │  • รายการงาน 2               │
│                                          │ │  • รายการงาน 3               │
│  [เปิดรายการงานทั้งหมด]                   │ │  [ดูทั้งหมด]                  │
└──────────────────────────────────────────┘ └──────────────────────────────┘

┌──────────────────────────────────────────┐ ┌──────────────────────────────┐
│ ภาพรวมกิจการ                             │ │ กิจกรรมล่าสุด (ถ้ามีข้อมูล)   │
│ ชื่อกิจการ | สถานะ | งานที่เกี่ยวข้อง      │ │ รายการกิจกรรม                 │
│ …                                        │ │ …                            │
│ [ไปทะเบียนกิจการ]                         │ │                              │
└──────────────────────────────────────────┘ └──────────────────────────────┘
```

Density rules:
- Use at most three metric tiles in the first row; avoid a dashboard made entirely of cards.
- The annual-work panel receives the strongest visual priority; the other panels remain secondary.
- Charts must answer a question and link to the corresponding filtered records. No decorative charts.
- If there is no activity history, omit that panel or show a clear empty state; do not fabricate events.

## 4. Screen B — Business directory

### Toolbar

- Search within business records.
- Filters relevant to existing fields.
- Sort control.
- Compact primary action: `+ เพิ่มกิจการ`.
- Compact secondary actions: import, mapping import, export (only actions that exist and are authorized).
- Keep toolbar on one or two deliberate rows depending on width; do not scatter controls into multiple page headers.

### Table principles

- Retain the current complete set of meaningful columns after verifying the actual production/main schema.
- Use a sticky header where appropriate, clear numeric alignment, restrained row separators, and consistent spacing.
- Business name is the primary visual anchor; identifiers and secondary metadata are quieter.
- Row actions should not dominate the table. Open the row/detail view; place edit and destructive actions in a compact action menu where permissions allow.
- Column visibility is an optional user preference, never a silent data-loss mechanism.

### Desktop wireframe

```text
ทะเบียนกิจการ                                             [+ เพิ่มกิจการ]
ค้นหาและจัดการข้อมูลกิจการทั้งหมด

[ค้นหาชื่อ / เลขทะเบียน…] [ตัวกรอง ▾] [เรียงตาม ▾] [นำเข้า ▾] [ส่งออก]

พบ N รายการ                                                   [คอลัมน์ ▾]

┌──────────────┬──────────────┬──────────────┬────────────┬─────────────┬───────┐
│ ชื่อกิจการ   │ เลขทะเบียน   │ ประเภท       │ สถานะ       │ ข้อมูลสำคัญ │ จัดการ│
├──────────────┼──────────────┼──────────────┼────────────┼─────────────┼───────┤
│ กิจการ A     │ …            │ …            │ …          │ …           │  ⋯    │
│ กิจการ B     │ …            │ …            │ …          │ …           │  ⋯    │
│ กิจการ C     │ …            │ …            │ …          │ …           │  ⋯    │
└──────────────┴──────────────┴──────────────┴────────────┴─────────────┴───────┘
                                      [pagination]
```

> The column labels above are illustrative only. The final columns must be taken from the real current M101 records and existing table, not assumed from this drawing.

### Mobile behavior

- Show a readable business summary row/card with the same key fields, plus a clear “ดูรายละเอียด” action.
- Offer “ข้อมูลทั้งหมด” in the record detail; never truncate the record permanently.
- Filters open in a compact sheet/drawer; selected filters remain visible as removable chips.

## 5. Screen C — Business detail

### Header

- Business name and its primary identifier.
- Clear status, only when an actual status exists.
- Compact actions: edit, more actions.
- Relationship summary displayed as linked associations, not as parent-owned financial data.

### Proposed content sections

1. **ข้อมูลกิจการ** — identity and registration/profile fields.
2. **บัญชีและภาษี** — business-specific accounting/compliance information already supported by the application.
3. **งานประจำปี** — tasks for this business and selected year.
4. **กลุ่มและความสัมพันธ์** — associations to one or more groups/relationship labels.

Do not create new data fields or tabs until current schema and existing workflows have been inspected.

### Desktop wireframe

```text
ทะเบียนกิจการ / [ชื่อกิจการ]

[ชื่อกิจการ]  [เลขทะเบียน/รหัสหลัก]                         [แก้ไข] [เพิ่มเติม ▾]
[สถานะจริง ถ้ามี]  [ประเภทกิจการ ถ้ามี]

[ข้อมูลกิจการ] [บัญชีและภาษี] [งานประจำปี] [กลุ่ม/ความสัมพันธ์]

┌────────────────────────────────────────────────────────────────────────────┐
│ ข้อมูลกิจการ                                                               │
│                                                                            │
│ ชื่อจดทะเบียน        …                 เลขทะเบียน          …               │
│ ประเภทธุรกิจ         …                 วันที่/ข้อมูลอื่น    …               │
│ ที่อยู่               …                 ช่องทางติดต่อ        …               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ความสัมพันธ์                                                               │
│ กลุ่ม/ประเภทความสัมพันธ์: [ชื่อกลุ่ม]                                      │
│ สมาชิกที่เกี่ยวข้อง: [กิจการอื่น]  → เปิดระเบียนของกิจการนั้น              │
│ หมายเหตุ: ข้อมูลบัญชี ภาษี และรายได้ยังแยกตามกิจการ                         │
└────────────────────────────────────────────────────────────────────────────┘
```

## 6. Screen D — Groups & relationships

- A business can belong to zero, one, or multiple user-defined groups/relationships.
- Start with useful suggested labels such as “กลุ่มกิจการ”, “บริษัทในเครือ”, “ผู้ถือหุ้นร่วม”, and “สำนักงาน/สาขา”; allow the workspace owner to add custom labels.
- A label describes the relationship; it does not automatically assert legal ownership, consolidation, or shared accounting.
- Group view lists member businesses and links to each individual record.
- Any group-level total must be explicitly defined, calculated, and labeled as an aggregate. It must not overwrite individual business records.
- Exact relationship directionality, permissions, and any financial aggregation rules remain subject to domain-model review before implementation.

## 7. Screen E — Annual work

- Default to the selected year from the shared workspace bar.
- Provide a concise progress summary, then a complete filterable task list.
- Group by business or task category only when this improves scanning.
- Show due dates only when stored or reliably derived from an approved rule.
- Each task opens its source business record.
- Do not invent assignment, exemption, or completion metadata that the current model does not support.

## 8. Screen F — Import & export

Preserve the established safe sequence:

```text
เลือกไฟล์ → เลือกชีต/ตาราง → จับคู่คอลัมน์ → ดูตัวอย่าง → ตรวจรายการซ้ำ → ยืนยันนำเข้า
```

- Standard import remains separate from the mapping workflow where they are distinct existing actions.
- Show the target year and target record type before confirmation.
- Preview must show enough columns and rows to catch mapping errors.
- Explain conflicts and duplicates before writing.
- Success appears only after the server confirms persistence.

## 9. Screen G — Settings & access

- Organize by task: workspace preferences, account/security, user access, and data operations.
- Keep destructive or security-sensitive controls separate from ordinary preferences.
- Do not show settings or controls that are not implemented or not permitted to the current user.

## 10. Component and spacing direction

- Typography: clear Thai-first type scale; page title, section title, body, metadata, and numeric values have distinct but restrained hierarchy.
- Buttons: one primary style, quiet secondary style, and compact icon action. Avoid oversized action bars.
- Surfaces: white content surface on a very light cool-gray canvas; subtle borders; minimal shadow.
- Navy is for navigation, selected states, headings, and primary emphasis — not a full-page dark background.
- Status badges use semantic colors sparingly and always include readable text.
- Forms align labels and controls consistently; long forms are divided into meaningful sections.
- Dialogs should be sized to the task and should not become nested panels inside panels.

## 11. Review checklist before implementation

- [ ] Desktop shell reads as one coherent workspace, not multiple disconnected bars.
- [ ] Mobile navigation and search remain discoverable.
- [ ] Business directory retains every important existing field.
- [ ] No key information is hidden just to make the screen look minimal.
- [ ] Every metric and status is grounded in persisted data.
- [ ] Relationship membership does not merge underlying business records.
- [ ] Existing import flows remain available and unchanged in behavior.
- [ ] Loading, empty, error, no-results, and permission states are designed.
- [ ] Keyboard focus, contrast, and touch targets are adequate.
- [ ] No production changes occur before explicit review and implementation approval.

## 12. Approval boundary

This wireframe document is a proposal for review. It is not an instruction to merge, deploy, change the D1 schema, or alter production records. Before implementation, inspect the actual current table columns and all existing page workflows, then reconcile the final design against those facts.
