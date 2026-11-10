# M101 — New System Blueprint v1

**Status:** Product direction selected — Option C (hybrid); detailed scope and architecture still require approval  
**Date:** 2026-11-10  
**Repository:** `smmm1/m101`  
**Design direction:** Modern Navy  
**Working branch:** `product/m101-new-system-blueprint`

---

## 1. Product reset

M101 is being redesigned as a new business-management system. This is not a visual refresh of the legacy application.

### Explicit direction

- Do not carry the old feature set forward by default.
- Do not reproduce old screens, navigation, tables, forms, or workflows merely because they exist.
- Design the product structure, domain model, user journeys, and UX/UI as a coherent new system.
- Modern Navy is the visual direction, not a constraint to preserve old interaction patterns.
- Treat existing application code and data structures as legacy references only. Reuse is allowed only after a deliberate fit-and-safety review.
- No production deployment, destructive data operation, or database migration until the new product and data strategy are approved.

## 2. Confirmed product direction — Option C (hybrid)

M101 combines two connected capabilities:

1. **Business management foundation:** prioritize limited companies and partnerships (ห้างหุ้นส่วน) as the primary supported entity types. Maintain each entity's profile, relationships, and separate records. Other entity types, such as sole proprietors/individual merchants, may be supported where appropriate, but are not equal first-priority targets.
2. **Work and annual-obligation operations:** plan, assign, monitor, complete, and review recurring and one-off work for those entities, including an executive dashboard similar in information purpose to the supplied Team1 reference.

The two capabilities are parts of one system, not separate products. Business/entity records provide the context for work; work records link back to the relevant entity; portfolio dashboards summarize progress across entities without merging their underlying records.

The supplied Team1 dashboard is the reference for the annual-work overview concept and information hierarchy, not for M101's visual design. M101 retains its own Modern Navy design direction.

### Product hierarchy

- **Portfolio layer:** cross-entity overview, relationship context, aggregate metrics, risks, and upcoming work.
- **Entity layer:** one business profile with its own details, obligations, documents, history, and activity. The initial domain model and UX should fit limited companies and partnerships first, while remaining extensible to other entity types.
- **Work layer:** an actionable work item with period, category, deadline, assignee, status, evidence, and history.
- **Administration layer:** workspace configuration, users, permissions, work categories, and deadline rules.

### Core navigation proposal

1. Command Center
2. Business Portfolio
3. Work & Annual Obligations
4. Calendar / Deadlines
5. Documents
6. Reports & Insights
7. Activity & Audit
8. Administration

Navigation labels and release grouping remain subject to UX review; this is not a final menu specification.

## 3. Proposed product concept

**M101 — Business Portfolio Workspace**

A single workspace for understanding and operating a portfolio of businesses: what entities exist, how they relate, who is responsible, what obligations are approaching, which documents support the records, and what needs attention.

The product should answer five questions quickly:

1. What businesses and legal entities do I manage?
2. How are those entities related — and which relationships are user-defined?
3. What requires action, by whom, and by when?
4. Where is the supporting information and document history?
5. What is the current state of the whole portfolio and each individual entity?

This is a proposed product definition, not a claim that these modules already exist.

## 4. Proposed information architecture

| Workspace area | Purpose | New-system behavior |
|---|---|---|
| Command Center | Portfolio-wide overview | Prioritized actions, risk/attention signals, upcoming obligations, recent changes |
| Business Portfolio | Browse and understand entities | Rich entity profiles, flexible saved views, clear lifecycle/status |
| Relationship Map | Understand ownership and operational links | User-defined relationship types, many-to-many links, visual graph and list views |
| Obligations | Manage recurring and one-off responsibilities | Rules, deadlines, assignments, evidence, completion history |
| Document Vault | Store and retrieve evidence | Entity-linked documents, metadata, versions, expiry dates, access rules |
| Activity & Audit | Explain what changed and why | Timeline, actor, timestamp, before/after values, source |
| Insights | Understand portfolio condition | Explicitly defined metrics and drill-down to source records |
| Administration | Configure the workspace | Users, roles, permissions, categories, templates, system settings |

These are candidate areas for discussion. They are not a commitment to implement every area in the first release.

## 5. New domain model — proposal

### Core records

- **Workspace** — the top-level tenant and configuration boundary.
- **Business Entity** — an independently identifiable business/legal/operating entity.
- **Relationship** — a typed connection between entities, with direction and optional effective dates.
- **Obligation** — a responsibility or required action with a rule, due date, owner, status, and evidence.
- **Document** — a file with metadata, version history, and explicit links to entities or obligations.
- **Activity Event** — an append-only record of meaningful changes and actions.
- **User / Role / Permission** — identities and scoped access rules.

### Business entity independence

Every Business Entity retains its own identity and its own records. Relationships do not silently merge businesses.

- A business may exist independently.
- A business may be connected to one or more other businesses.
- Relationship types are configurable by the workspace rather than hard-coded to a single parent-child hierarchy.
- Each relationship has an explicit type and direction; optional notes and effective dates can be recorded.
- Financial, revenue, tax, compliance, and document records remain entity-specific by default.
- Portfolio-level rollups are permitted only as explicit, traceable views with clear inclusion rules. Never imply that related entities are one legal or accounting entity.

### Relationship model questions still open

- Which relationship types should ship as defaults?
- Can users define arbitrary relationship types?
- Are relationships directional, reciprocal, or both depending on type?
- Can a relationship have an owner, date range, evidence, or notes?
- Who may create, edit, and remove relationships?
- What should happen to historical reports when a relationship changes?

Do not implement relationship semantics until these rules are agreed.

## 6. Proposed key journeys

### A. Create a business entity

1. User chooses the entity category.
2. System asks only for the minimum identity fields required for that category.
3. User adds optional registration, contact, responsible-person, and operational details in progressive sections.
4. System checks for possible duplicates and explains the match.
5. User reviews and creates the entity.
6. System opens the entity profile with a clear next-step checklist.

### B. Connect related entities

1. User opens an entity and chooses “Add relationship”.
2. User selects another entity and a relationship type.
3. System explains direction and whether the relationship is reciprocal.
4. User sets optional effective dates, notes, or evidence.
5. User reviews the impact preview.
6. System records the relationship and an audit event without merging entity data.

### C. Complete an obligation

1. User sees a prioritized action in Command Center or the entity profile.
2. User opens the obligation and sees the reason, due date, owner, and required evidence.
3. User records progress and attaches supporting evidence.
4. User confirms completion.
5. System preserves completion history and evidence references.

These journeys are proposals and need validation against actual work practices.

## 7. UX/UI principles

- Modern Navy palette with restrained contrast and clear hierarchy.
- A purposeful workspace shell, not a direct port of the legacy sidebar or topbar.
- Start from user tasks and decision points, not from the old menu.
- Entity profile is the central context; related actions and records should be discoverable from it.
- Dense information should use progressive disclosure and user-controlled views, not simplified tables that hide data.
- Prefer clear lists, timelines, maps, and focused detail panels where each suits the task.
- Every metric must explain its definition and link to the records behind it.
- Every important action needs a clear result, error state, and audit trail.
- Mobile workflows should be designed deliberately, not squeezed desktop layouts.
- Accessibility: keyboard navigation, visible focus, readable contrast, and reduced-motion support.

## 8. Technical direction — decision pending

Do not assume the legacy implementation architecture is the new architecture.

Candidate constraints to validate before choosing the stack:
- Existing production is hosted on Cloudflare Pages at `https://m101-directory.pages.dev/`.
- Cloudflare D1 has been the preferred production data store for M101.
- The new system must define tenant boundaries, authorization, auditability, file storage, backups, and migration before production rollout.
- Avoid coupling the domain model directly to UI components or database-specific structures.
- Define stable IDs, schema versioning, migration strategy, and recovery plan.
- Treat sensitive credentials and documents as protected data; do not expose secrets in list views, logs, exports, or analytics.

No infrastructure, database, or production settings were changed as part of this blueprint.

## 9. Data transition — intentionally undecided

The user has not yet selected how existing business records should be handled.

Until that decision is made:
- Keep the current production database and records untouched.
- Do not delete, overwrite, migrate, or transform legacy records.
- Do not make the new domain model depend on legacy field names.
- Prepare a field-mapping and data-quality assessment only after the user chooses a transition approach.

Possible approaches:
1. Keep existing records and map them into the new model after validation.
2. Start with a clean database and leave legacy records read-only.
3. Selectively migrate approved fields and records into a new schema.

## 10. Release strategy proposal

1. **Product definition** — confirm the product purpose, users, permissions, and primary workflows.
2. **Domain model** — settle entity identity, relationship semantics, obligations, documents, and audit events.
3. **UX architecture** — approve navigation, command center, entity profile, relationship map, and mobile journeys.
4. **Technical foundation** — choose schema, authorization, storage, audit, backups, and deployment flow.
5. **Vertical slice** — implement one complete workflow end-to-end in an isolated branch and test environment.
6. **Feature expansion** — add modules based on validated workflows.
7. **Migration and release** — only after data strategy, backup, rollback, and acceptance tests are approved.

## 11. Decisions required before implementation

1. **Initial entity coverage:** limited companies and partnerships are the primary target; confirm whether sole proprietors/individual merchants are included in the first release or deferred.
2. **Data transition:** preserve/map, clean start, or selective migration?
3. **Primary users:** only the owner, an internal team, or multiple organizations with separate workspaces?
4. **First-release priority:** which complete workflow should be delivered first across the business-management and annual-work capabilities?
5. **Relationship types:** fully user-defined, or a small set of defaults plus custom types?
6. **Permissions:** single owner initially, or role-based access from the first release?
7. **Work taxonomy:** are the five Team1 reference categories the initial required categories, or examples only?

No old feature is assumed to be carried forward merely because it exists in the current app.
