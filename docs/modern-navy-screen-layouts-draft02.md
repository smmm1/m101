# M101 — Modern Navy Screen Layouts (Draft 02)

> Design-only deliverable. No application code, D1 schema/data, Cloudflare configuration, or production deployment changed.
> Branch: `design/m101-modern-navy-ux-blueprint`
> Companion: `docs/modern-navy-reference-mapping-draft02.md`
> Visual direction: Mustang identity + Modern Navy. Reference structure is adapted, not copied.

## 0. Visual grammar

### Desktop frame

- Sidebar: 224–240 px, fixed, deep navy surface.
- Workspace: remaining width; cool off-white canvas.
- Unified top bar: 68–72 px, white surface, one subtle bottom border.
- Main content: max-width 1,520 px; 28–32 px horizontal breathing room.
- Page title: 24–28 px; section title: 16–18 px; supporting text: 12–14 px.
- Body text: dark slate; muted labels never below accessible contrast.
- Primary button: navy fill, compact 36–40 px height.
- Secondary button: white/transparent with quiet border; icon + concise label.
- Radius: 8–12 px; avoid oversized pill controls and nested cards.
- Use borders and spacing before shadows. No gradient backgrounds, glass effects, glowing edges, retro terminal styling, or excessive animation.

### Color tokens

| Token | Value | Use |
|---|---|---|
| Navy 950 | `#0B1F36` | Sidebar / deepest brand |
| Navy 900 | `#142B4A` | Active navigation / headings |
| Navy 700 | `#244B73` | Secondary navy emphasis |
| Blue 600 | `#3977B9` | Links / focus / interactive |
| Canvas | `#F4F7FB` | Main workspace background |
| Surface | `#FFFFFF` | Tables / panels / top bar |
| Border | `#DCE4EE` | Dividers / outlines |
| Text | `#172334` | Primary text |
| Muted | `#64748B` | Secondary text |
| Success | `#16835D` | Completed |
| Warning | `#B7791F` | Pending / attention |
| Danger | `#C24141` | Destructive actions |

## 1. Shared application shell

### Desktop layout

```text
┌───────────────────────┬──────────────────────────────────────────────────────────────────────┐
│  M  MUSTANG           │  ภาพรวม  /  ชื่อหน้าปัจจุบัน      ปีบัญชี ▾   ค้นหาทั้งระบบ…   บัญชี ▾ │
│  BUSINESS WORKSPACE   ├──────────────────────────────────────────────────────────────────────┤
│                       │                                                                      │
│  WORKSPACE            │  PAGE TITLE                                                           │
│  ▸ ภาพรวม             │  One concise line explaining what this screen is for                 │
│                       │                                                                      │
│  BUSINESS             │  SCREEN CONTENT                                                      │
│  ▸ ทะเบียนกิจการ      │                                                                      │
│  ▸ กลุ่มและ           │                                                                      │
│    ความสัมพันธ์      │                                                                      │
│                       │                                                                      │
│  OPERATIONS           │                                                                      │
│  ▸ งานประจำปี         │                                                                      │
│  ▸ นำเข้า / ส่งออก    │                                                                      │
│                       │                                                                      │
│  ───────────────────  │                                                                      │
│  ⚙ ตั้งค่า            │                                                                      │
│                       │                                                                      │
│  ● WORKSPACE ONLINE   │                                                                      │
└───────────────────────┴──────────────────────────────────────────────────────────────────────┘
```

**Rules**
- No second horizontal navigation bar.
- Top bar contains the current destination, year, one global search entry point, and account.
- Sidebar labels remain visible on desktop; do not collapse to icon-only by default.
- Do not put a second large page title in content if the top bar already shows the page name. The content heading can be a concise section heading.
- Activity history belongs inside the account/workspace menu or a small icon action in the same top bar; do not allocate a permanent dashboard-like card to a session-only log.

### Mobile shell

```text
┌──────────────────────────────────────┐
│ ☰   M MUSTANG      ปี 69 ▾    ◉       │
├──────────────────────────────────────┤
│ ภาพรวม                               │
│ ข้อมูลสำคัญของรอบปีที่เลือก          │
│                                      │
│ [ค้นหาทั้งระบบ]                      │
│                                      │
│ Screen content                       │
└──────────────────────────────────────┘
```

- Menu opens a left drawer with the same information architecture.
- Search opens a full-width search surface.
- Account action opens a compact sheet/menu.
- Year selector remains reachable without scrolling.
- Tables convert to compact rows or scroll horizontally with clear affordance; every field remains available from the detail view.

## 2. Screen 01 — Executive overview

### Desktop composition

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ภาพรวม                                                                 [ + เพิ่มกิจการ ]      │
│ สรุปทะเบียนและงานประจำปี · ปีบัญชี 69                                                        │
├────────────────┬────────────────┬────────────────┬─────────────────────────────────────────┤
│ กิจการทั้งหมด  │ เสร็จสิ้น      │ กำลังดำเนินการ │ รอดำเนินการ / ยังไม่ระบุ                │
│      128       │      74        │      21        │      33                                 │
└────────────────┴────────────────┴────────────────┴─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┬───────────────────────────────┐
│ สถานะทะเบียนกิจการ                                           │ งานที่ต้องติดตาม               │
│                                                             │                               │
│  ความคืบหน้ารวม                                              │  เกินกำหนด                    │
│  ███████████████████░░░░░░░░░░░░  58%                        │  • กิจการ A · ภ.ง.ด.50         │
│                                                             │  • กิจการ B · DBD              │
│  เสร็จแล้ว 74     กำลังทำ 21     รอดำเนินการ 33              │                               │
│                                                             │  ใกล้ถึงกำหนด                 │
│  แยกตามประเภทกิจการ                                         │  • กิจการ C · ส.บ.ช.3         │
│  บริษัท           █████████████░░░░                           │  • กิจการ D · AGM             │
│  ห้างหุ้นส่วน     ███████░░░░░░░░                           │                               │
│  บุคคลธรรมดา     ███░░░░░░░░░░░░                           │  [ดูงานประจำปีทั้งหมด →]       │
└─────────────────────────────────────────────────────────────┴───────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ความคืบหน้างานประจำปี                                                                       │
│                                                                                              │
│ ภ.ง.ด.50       ███████████░░░░░   เสร็จ  / ทั้งหมด                                           │
│ ส.บ.ช.3        █████████░░░░░░░   เสร็จ  / ทั้งหมด                                           │
│ ภ.ง.ด.51       ██████░░░░░░░░░░   เสร็จ  / ทั้งหมด                                           │
│ งบการเงิน DBD  ████████████░░░░   เสร็จ  / ทั้งหมด                                           │
│ AGM            ███████░░░░░░░░░   เสร็จ  / ทั้งหมด                                           │
│                                                                                              │
│ [เปิดงานประจำปี]                                                                            │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ กิจการที่แก้ไขล่าสุด                                                        [ดูทะเบียนทั้งหมด] │
│ ลำดับ | ชื่อกิจการ | เลขผู้เสียภาษี | E-Filing | SSO | สถานะ | เปิดดู                         │
│ …                                                                                            │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Behavior**
- KPI values are based on current selected-year business records, not annual task counts.
- Clicking a business KPI opens the directory with the matching status filter.
- “งานที่ต้องติดตาม” is calculated from actual task records and due dates; overdue first, upcoming next. If no due date exists, do not invent one or classify it as upcoming.
- The five task bars use actual task totals/statuses for each type. Custom task types appear below or under “งานอื่น ๆ” only when present.
- Hide sections that cannot be populated reliably; show a useful empty state rather than fake sample values.
- The graphic above is a layout illustration only. The numbers are placeholders and must never be displayed as live values.

### Mobile composition

```text
ภาพรวม · ปีบัญชี 69

[กิจการทั้งหมด       128] [เสร็จสิ้น             74]
[กำลังดำเนินการ      21] [รอดำเนินการ          33]

สถานะทะเบียนกิจการ
████████████████░░░░░░░░ 58%
เสร็จ 74 · กำลังทำ 21 · รอ 33

งานที่ต้องติดตาม
เกินกำหนด
• กิจการ A · ภ.ง.ด.50
• กิจการ B · DBD
ใกล้ถึงกำหนด
• กิจการ C · ส.บ.ช.3
[ดูทั้งหมด]

ความคืบหน้างานประจำปี
ภ.ง.ด.50       ███████░░
ส.บ.ช.3        █████░░░░
…
```

## 3. Screen 02 — Business directory

### Desktop composition

```text
ทะเบียนกิจการ                                                   [ + เพิ่มกิจการ ]

จัดการข้อมูลกิจการทั้งหมดในรอบปีที่เลือก

[ ค้นหาชื่อ / เลขผู้เสียภาษี / E-Filing… ] [ตัวกรอง ▾] [เรียงลำดับ ▾]

128 รายการ                                           [คอลัมน์ ▾] [นำเข้า ▾] [ส่งออก ▾]

┌──────┬──────────────────────────┬──────────────┬────────────┬──────────────┬───────────┬──────┐
│ ลำดับ│ กิจการ                   │ เลขผู้เสียภาษี│ E-Filing   │ ประกันสังคม  │ สถานะ     │ ⋯    │
├──────┼──────────────────────────┼──────────────┼────────────┼──────────────┼───────────┼──────┤
│ 001  │ บริษัท ตัวอย่าง จำกัด     │ …            │ …          │ …            │ เสร็จสิ้น  │ ⋯    │
│      │ บริษัท                   │              │            │              │           │      │
├──────┼──────────────────────────┼──────────────┼────────────┼──────────────┼───────────┼──────┤
│ 002  │ หจก. ตัวอย่าง             │ …            │ —          │ …            │ กำลังทำ   │ ⋯    │
│      │ ห้างหุ้นส่วน              │              │            │              │           │      │
└──────┴──────────────────────────┴──────────────┴────────────┴──────────────┴───────────┴──────┘

Selected record (drawer / split pane on wide screen):
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ บริษัท ตัวอย่าง จำกัด                                                [แก้ไข] [เพิ่มเติม ▾]    │
│ ลำดับ 001 · บริษัท · สถานะงาน: เสร็จสิ้น                                                     │
│                                                                                              │
│ ข้อมูลระบุตัวตน         เลขผู้เสียภาษี · E-Filing · SSO                                       │
│ ข้อมูลการทำงาน          ผู้ตรวจสอบ/วันที่ · หมายเหตุ · หัวข้องาน                              │
│ แหล่งข้อมูล              ประเภทไฟล์ · ชื่อไฟล์ต้นทาง · วันที่เพิ่ม/แก้ไข                       │
│ ข้อมูลการเข้าถึง          รหัสผ่าน (ซ่อนค่าเป็นค่าเริ่มต้น) · เปิดเผย/คัดลอกตามสิทธิ์            │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Preserve from current M101**
- Sequence, company name, business type, tax ID, E-Filing code, SSO code, status.
- DBD verification flag, auditor/date, remark, topic, source type/file name, created/updated timestamps remain inspectable in the expanded record detail.
- Password is sensitive: never place it in a table column or global search results. Keep it masked by default in a permission-checked detail section.
- Preserve search, E-Filing filters, sorting, row selection, authorized drag-reorder, edit, detail, bulk delete, normal import, and mapping import.
- Add column visibility only as a user-controlled view preference. Hidden columns must remain accessible and must not affect data/export.

**Actions**
- Primary: add business.
- Secondary compact actions: standard import, mapping import, export, bulk delete (destructive separated).
- No oversized colored action cluster. Use one icon size and 36 px compact controls.

### Mobile composition

Each business becomes a compact list row:
- business name + type;
- sequence and status;
- tax ID partially masked for visitor mode;
- one “เปิดรายละเอียด” affordance.
The detail page shows all remaining fields. Do not attempt to cram the desktop table into a 360 px viewport.

## 4. Screen 03 — Annual work

### Desktop composition

```text
งานประจำปี                                           ปีบัญชี 69 ▾   [ + เพิ่มงาน ]

[ทั้งหมด] [รอดำเนินการ] [กำลังทำ] [เสร็จสิ้น] [เกินกำหนด]

┌───────────────┬───────────────┬───────────────┬──────────────┐
│ งานทั้งหมด    │ เสร็จสิ้น     │ กำลังทำ       │ เกินกำหนด    │
│     —         │     —         │     —         │     —        │
└───────────────┴───────────────┴───────────────┴──────────────┘

ประเภทงาน
[ทั้งหมด ▾] [กิจการ ▾] [สถานะ ▾] [ช่วงกำหนดส่ง ▾]

┌────────────┬──────────────────────┬──────────────────┬──────────────┬───────────────┬──────┐
│ ประเภทงาน  │ กิจการ               │ กำหนดส่ง         │ สถานะ        │ หมายเหตุ      │ ⋯    │
├────────────┼──────────────────────┼──────────────────┼──────────────┼───────────────┼──────┤
│ ภ.ง.ด.50   │ บริษัท ตัวอย่าง       │ วันจริงจากข้อมูล │ รอดำเนินการ  │ …             │ ⋯    │
│ DBD        │ หจก. ตัวอย่าง         │ วันจริงจากข้อมูล │ กำลังทำ      │ …             │ ⋯    │
└────────────┴──────────────────────┴──────────────────┴──────────────┴───────────────┴──────┘
```

**Behavior**
- Counts are computed from the selected year's persisted AnnualTask records.
- Overdue means dueDate is earlier than today AND status is not completed.
- A missing dueDate is “ไม่ระบุกำหนดส่ง”, not overdue.
- Task types use the five built-ins plus custom task types that exist in saved data.
- Keep task status independent from BusinessRecord.status.
- Filter and sort must not mutate records. Edit/status changes use the existing save flow.

## 5. Screen 04 — Groups & relationships (new capability proposal)

```text
กลุ่มและความสัมพันธ์                                             [ + สร้างกลุ่ม ]

กลุ่มทั้งหมด     12        กิจการที่เชื่อมโยง     34        กิจการอิสระ     8

ค้นหากลุ่มหรือกิจการ…                         [ประเภทความสัมพันธ์ ▾]

┌───────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ กลุ่ม / ความสัมพันธ์          │ รายละเอียดกลุ่ม                                               │
├───────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ กลุ่มธุรกิจครอบครัว           │ กลุ่มธุรกิจครอบครัว                              [แก้ไข]      │
│ บริษัทในเครือ                 │ สมาชิก 4 กิจการ                                               │
│ ผู้ถือหุ้นร่วม                │                                                              │
│                               │ สมาชิก                                                         │
│                               │ • บริษัท A  [เปิดกิจการ]                                      │
│                               │ • บริษัท B  [เปิดกิจการ]                                      │
│                               │ • หจก. C    [เปิดกิจการ]                                      │
│                               │ • บริษัท D  [เปิดกิจการ]                                      │
│                               │                                                              │
│                               │ ข้อมูลแต่ละกิจการยังแยกจากกัน                                 │
└───────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

**This is a proposed feature, not current functionality.** Before implementation, approve group membership rules, custom relationship labels, whether links are directional, duplicate membership behavior, deletion/unlinking behavior, access permissions, and any aggregate reporting. No group-level financial or compliance roll-up by default.

## 6. Screen 05 — Import / export

- Keep two clearly named entry paths:
  1. นำเข้าไฟล์ — existing standard import.
  2. จับคู่คอลัมน์ — sheet/table selection and mapping import.
- Do not combine their processing code or replace the existing standard import path.
- Mapping flow steps: select file → select sheet/table → map columns → preview → resolve duplicates → explicit confirm → save through the existing import callback / server-backed persistence.
- Keep selected fiscal year and target scope visible during the flow.
- Export format and data scope must be explicit before download.

## 7. Screen 06 — Settings

A plain settings page with a compact left sub-navigation or grouped headings:
- Workspace appearance and preferences.
- Account and authentication.
- Roles and access.
- Backup / restore / export.

Do not alter auth behavior or data backup semantics during the visual redesign. Remove legacy product identity from visible labels where appropriate, but preserve technical identifiers and migration safety.

## 8. Interaction and accessibility rules

- All interactive controls have visible focus, keyboard support, and clear labels.
- Status is conveyed by text and color, never color alone.
- Minimum comfortable hit area on touch targets; compact desktop buttons must remain touch-usable.
- Confirm destructive operations and make the affected record/count explicit.
- Mask credentials by default. Avoid copying credentials without a deliberate user action.
- Support reduced motion and avoid pointer-following or magnetic movement.
- Empty states explain the next useful action.
- Loading, permission denied, network failure, and D1 unavailable states must be designed, not hidden.

## 9. Review checklist before implementation

- [ ] Reference structure has been translated, not copied visually.
- [ ] Mustang/Modern Navy identity is distinct and consistent.
- [ ] Unified top bar really contains page context, year, search, and account.
- [ ] Sidebar is compact and not over-categorized.
- [ ] Four business KPIs are distinct from annual-task metrics.
- [ ] Five built-in annual work categories and custom types are represented from real data.
- [ ] Overdue/upcoming items are derived only from persisted due dates and status.
- [ ] Directory preserves the complete current record and all existing actions.
- [ ] Credentials are masked and permission protected.
- [ ] Relationships do not merge business records or financial/compliance data.
- [ ] Import workflows remain separate and regression-safe.
- [ ] Mobile layouts expose all fields and actions.
- [ ] Loading/error/empty states are included.

## 10. Approval gate

This is a screen-layout proposal only. No implementation or production deployment is authorized by the document itself. Once approved, implementation should proceed one screen at a time, starting with the shared shell and overview, then directory, annual work, and the new groups feature only after its domain model is approved.
