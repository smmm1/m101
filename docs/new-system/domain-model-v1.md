# M101 — Domain Model v1 (Conceptual)

**Status:** Working proposal incorporating confirmed owner + team support — not a database schema  
**Date:** 2026-11-10  
**Product direction:** Hybrid business portfolio + annual-work management  
**Priority entity types:** Thai limited companies and partnerships  
**Design direction:** Modern Navy

---

## 1. Modeling principles

1. A workspace owns its own business records, users, configuration, and work.
2. A business entity is an independent record. A relationship never merges two entities.
3. Each entity owns its own registration identity, accounting context, obligations, documents, and activity.
4. Work is a first-class record linked to one primary entity and, where needed, supporting entities.
5. Templates describe reusable work rules; work instances represent actual work for a specific entity and period.
6. Unknown, not applicable, not started, in progress, completed, and overdue are distinct concepts.
7. Dashboard totals must be reproducible from underlying records and explicit filters.
8. Important changes are auditable; deleting or changing a relationship must not erase historical work.
9. Legal classifications and filing deadlines must be validated against authoritative Thai sources before being encoded as rules.
10. This model is intentionally technology-neutral. It does not prescribe D1 tables, SQL, API routes, or UI components.

## 2. Core conceptual entities

### Workspace

The tenant and configuration boundary. **Confirmed user requirement:** M101 must support both an owner managing a portfolio alone and a team collaborating on that portfolio. It must not be designed as a single-user-only application.

Key concepts:
- Stable workspace ID and display name.
- Workspace timezone and locale.
- Workspace-level settings and numbering preferences.
- Members, roles, and permissions.
- Configurable relationship types, work categories, and work templates.

A workspace must not expose another workspace's records.

### Business Entity

A distinct legal or operating entity managed in the workspace.

Common identity fields:
- Stable entity ID.
- Entity type / legal form.
- Display name and registered name.
- Registration number, where applicable.
- Registration jurisdiction and registered date, where applicable.
- Lifecycle status (for example active, inactive, dissolved, archived).
- Registered address and contact details.
- Accounting-period configuration.
- Internal reference code and notes.
- Created/updated metadata.

Initial legal-form coverage should prioritize:
- Thai limited company (บริษัทจำกัด).
- Registered ordinary partnership (ห้างหุ้นส่วนสามัญนิติบุคคล), if in the user's managed portfolio.
- Limited partnership (ห้างหุ้นส่วนจำกัด).

The product should distinguish a registered partnership from an informal business label. A sole proprietor or other organization type can be added later without redesigning the entity model.

Do not assume all entity types have the same registration fields, legal duties, reporting periods, or deadline rules. Use type-specific sections and validation.

### Entity Relationship

A typed connection between two distinct business entities.

Key concepts:
- Relationship ID.
- Source entity and target entity.
- Relationship type selected from workspace-configured definitions.
- Directionality / reciprocal-display rule.
- Effective start and end dates.
- Optional notes and supporting documents.
- Status and audit history.

Rules:
- One entity can have many relationships.
- A relationship does not imply ownership unless its type explicitly says so.
- Do not assume every relationship is reciprocal.
- Do not hard-code a single parent-child tree; support many-to-many relationships.
- Relationship changes must not rewrite historical obligations, accounting records, or documents.
- Portfolio rollups must state whether they include related entities and prevent double counting.

### Work Category

A classification for operational or statutory work.

Examples from the supplied reference that require validation before adoption:
- ภ.ง.ด.51
- ประชุมใหญ่
- บอจ.5
- ภ.ง.ด.50
- ส.บช.3

Categories must be configurable rather than embedded as fixed UI assumptions. Each category may define supported entity types, required information, evidence expectations, and applicable templates.

### Work Template / Obligation Rule

A reusable definition of a task or obligation.

Key concepts:
- Name, category, description, and version.
- Applicable entity types and conditions.
- Recurrence pattern or one-off trigger.
- Required period type and period-generation rule.
- Due-date calculation rule and rule version.
- Required checklist/evidence definitions.
- Default assignment behavior.
- Active/effective dates.

Important: a template is not itself a due task. A rule update must not silently alter already-issued work instances. Recalculation should be explicit, previewable, and audited.

### Reporting Period

A defined period to which a work item relates.

Key concepts:
- Period type (calendar year, accounting year, month, quarter, custom).
- Start and end dates.
- Display label.
- Entity-specific accounting-year basis where applicable.
- Reporting-year mapping rule and version.

Do not treat calendar year and accounting year as interchangeable. Cross-year periods need a documented mapping rule.

### Work Item

An actionable task or obligation for a specific entity and period.

Key concepts:
- Work item ID.
- Primary business entity.
- Work category and template/rule version, if generated from a template.
- Reporting period.
- Due date, due-date basis, and confidence/validation state.
- Status.
- Priority and notes.
- Created source (manual, generated, imported).
- Completion timestamp and completion actor.
- Evidence links.
- Created/updated metadata.

A work item may optionally reference supporting entities, but it must have one clear primary entity for ownership and reporting.

Suggested lifecycle states:
- Not started.
- In progress.
- Waiting / blocked.
- Completed.
- Not applicable (requires reason).
- Cancelled (requires reason and permission).

Overdue should normally be a derived condition: a non-completed, non-cancelled applicable work item whose due date has passed in the relevant timezone. It should not overwrite the underlying workflow status.

Missing status is a data-quality condition, not a synonym for pending or overdue.

### Work Assignment

An explicit link between a work item and one or more responsible users.

Key concepts:
- Work item ID and user ID.
- Assignment role (primary, contributor, reviewer, observer).
- Assignment dates and state.

The system must define counting rules for workload charts. A work item assigned to three people must not accidentally count as three separate obligations in portfolio totals.

### Checklist Item / Work Progress

A structured step within a work item.

Key concepts:
- Label, order, required/optional flag.
- State, completion actor, and timestamp.
- Notes and evidence links.

Checklist completion does not automatically mean the overall work item is complete unless the template explicitly defines that behavior.

### Document and Document Version

A stored file and its version history.

Key concepts:
- Document ID, filename, media type, size, checksum.
- Storage reference (never expose raw storage credentials).
- Metadata, tags, and sensitivity classification.
- Links to one or more entities and/or work items.
- Version ID, uploader, timestamp, and change note.
- Optional expiry/renewal date.

A document linked to two entities remains one file reference with explicit links; it does not merge those entities' document records or permissions. Access must be checked through every linked record's policy.

### Activity Event / Audit Record

An append-only record of a meaningful action or change.

Key concepts:
- Actor (user or system).
- Action and affected record.
- Timestamp.
- Before/after values or structured change summary where appropriate.
- Reason/comment where required.
- Source (UI, automation, import, API).
- Correlation/request identifier.

Audit records must be protected from ordinary editing and deletion. Sensitive values and secrets must never be copied into audit payloads.

### User, Membership, Role, Permission

- **User:** authenticated identity, independent of any one workspace.
- **Workspace Membership:** connects a user to a workspace, with membership status, invitation/acceptance lifecycle, and assigned role(s).
- **Role:** named permission bundle, configurable or selected from safe built-in defaults.
- **Permission:** explicit allowed action scoped to workspace, entity, or record.
- **Entity Access Grant:** optional narrower access boundary where a member may access only selected entities within a workspace.
- **Assignment:** operational responsibility for a work item; assignment does not automatically grant broad access to unrelated entities or workspace administration.

Confirmed operating modes:
- An owner can manage a portfolio alone without needing to create fake team members.
- An owner can invite team members and assign work when collaboration is needed.
- The data model supports multiple members from the beginning, even if the first deployment initially has one owner.
- Authorization must be enforced server-side for every read and write; hiding a button in the UI is not access control.
- Workspace-level administration, entity-level access, and work-item assignment are separate concepts.
- Membership removal or role changes must be auditable and must not erase the member's historical actions or completed work.

Candidate built-in role concepts for review (not yet approved): Owner, Administrator, Manager/Reviewer, Staff, Read-only. Final permissions and whether custom roles are needed remain open.

## 3. Key relationships (conceptual)

- Workspace 1 → many Business Entities.
- Workspace 1 → many Users through Memberships.
- Business Entity many ↔ many Business Entities through typed Entity Relationships.
- Business Entity 1 → many Work Items.
- Work Template 1 → many generated Work Items (each instance keeps the template/rule version used).
- Work Item 1 → many Work Assignments.
- Work Item 1 → many Checklist Items.
- Work Item many ↔ many Documents through explicit document links.
- Business Entity many ↔ many Documents through explicit document links.
- Any auditable record 1 → many Activity Events.

## 4. Portfolio and dashboard calculation rules

Every metric must declare:
- What is counted: entities, work items, checklist items, or assignments.
- Period and timezone.
- Entity inclusion rules and relationship scope.
- Status inclusion/exclusion rules.
- Treatment of cancelled, not-applicable, and missing-status records.
- Whether counts are distinct by work item ID.
- Data freshness and last successful calculation/update time.

Suggested top-level views:
- Entity count by legal form and lifecycle status.
- Work items due in selected period.
- Completed work items.
- Open work items not yet overdue.
- Overdue work items.
- Work items with missing or unvalidated due dates.
- Workload by primary assignee, with separate contributor visibility.

All charts and KPI cards must drill down to the exact filtered record set. Portfolio-level totals must never imply that connected legal entities are a single entity.

## 5. Duplicate detection and identity

Potential duplicate matching may use registration number plus jurisdiction and entity type, but a match should be presented for human review. Do not auto-merge entities.

For entities without a formal registration number, use cautious candidate matching on name and other available attributes. Similar names are not proof of identity.

A merge operation, if ever supported, requires a separate audited workflow and explicit user confirmation. It is not part of the initial scope.

## 6. Open decisions before physical schema design

1. **Entity coverage:** confirm whether the first release includes only limited companies and registered partnerships, or also sole proprietors.
2. **Workspace model:** one workspace for the user, or multiple workspaces / client portfolios?
3. **Role matrix:** define exact permissions for Owner, Administrator, Manager/Reviewer, Staff, and Read-only; decide whether custom roles and entity-scoped access are required.
4. **Relationship defaults:** which relationship types are needed initially, and which are user-defined?
5. **Work categories:** are the five Team1 reference categories required for the first release, or illustrative examples?
6. **Work lifecycle:** are waiting/blocked and cancelled required, and who may mark work not applicable?
7. **Assignment semantics:** one primary assignee plus contributors/reviewers, or multiple equal owners?
8. **Period rules:** how should each entity's accounting year map to reporting years?
9. **Evidence policy:** which work categories require documents/checklists, and what retention rules apply?
10. **Legacy data:** clean start, selective migration, or validated mapping from current production?

## 7. Explicitly out of scope at this stage

- Physical database schema and migrations.
- Production data changes.
- Legal deadline automation before rule validation.
- Automatic consolidation of related entities' financial or compliance records.
- Automatic entity merging.
- A full accounting ledger or tax calculation engine unless separately approved.
- Carrying old M101 modules forward without product review.

---

## Review checkpoint

This conceptual model is ready for product review. It is not approval to implement the database or deploy. The next step is to resolve the open decisions, then produce an entity lifecycle/workflow map and a physical schema proposal for review.
