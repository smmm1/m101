# M101 — Team1 Reference Structure Analysis

**Status:** Reference analysis for product and UX discovery  
**Date:** 2026-11-10  
**Reference URL:** https://team1-dashboard.pages.dev/c/MUdGss5W2BELQGGpogCpi1gmm1PeVmUY/  
**Reference material:** User-provided full-page HTML/Tailwind source in the conversation  
**Target:** M101 — https://m101-directory.pages.dev/

## 1. Confirmed role in M101 (Option C)

The user selected the hybrid direction for M101: business management is the foundation, with annual-work and obligation management integrated into the same system. This Team1 reference therefore informs the work-management and executive-dashboard side of M101; it does not define the whole product. Business portfolio, entity profiles, and entity relationships remain equally important parts of the product.

## 2. How to use this reference

Use the supplied Team1 page as a reference for the **information architecture, dashboard content, density, and work-management concepts**.

Do not copy its visual design, branding, colors, spacing, component styling, or page composition pixel-for-pixel. M101 must have its own visual identity and interaction design, using the previously selected **Modern Navy** direction.

This source is a reference sample with hard-coded demonstration values. It is not evidence of live Team1 data, validated business rules, or an implementation specification for M101.

## 3. Structure observed in the supplied page

### Application shell

- Left sidebar with brand identity, primary navigation, grouped secondary navigation, and system/data context.
- Top bar with global search, data freshness indicator, refresh action, and account menu.
- Scrollable central workspace.
- Page-level title, explanatory context, year selector, and print/export action.

### Navigation concepts

The supplied page exposes these areas:

1. Overview and charts
2. My tasks
3. Executive annual-work summary
4. Customer directory
5. Monthly accounting records
6. Monthly plan submission
7. Document in/out
8. Edit history

These labels are evidence of the reference's navigation structure, not a decision to preserve every legacy M101 menu or use the exact same labels.

### Executive annual-work dashboard

The main dashboard is organized into:

1. **Page context and period selection**
   - Annual tax/accounting period selector.
   - Explanation of the reporting basis and exclusions.
   - Print / save PDF action.

2. **Portfolio KPI summary**
   - Customers/entities requiring work.
   - Completed work and completion percentage.
   - Outstanding work that is not yet overdue.
   - Overdue work.

3. **Five work-category summaries**
   - ภ.ง.ด.51
   - ประชุมใหญ่
   - บอจ.5
   - ภ.ง.ด.50
   - ส.บช.3

   Each category includes a completion rate, explanatory deadline/rule text, completed-versus-total count, progress visualization, and status breakdown. Some cards also expose unfilled/unknown status.

4. **Workload analytics**
   - Monthly due-work distribution.
   - Outstanding work by responsible person.
   - Status composition, including completed, pending, overdue, and unassigned/unknown work.

5. **Action-oriented alerts**
   - Overdue work count.
   - Upcoming due work within a defined time window.
   - Clear invitation to open the underlying records.

## 4. Product concepts M101 should evaluate

### A. Work is a first-class object

The dashboard is not merely a directory of businesses. It summarizes obligations/work items that apply to a business for a defined period.

A candidate work record may need:
- Work category and applicable rule.
- Related business entity.
- Reporting/accounting period.
- Due date and deadline calculation basis.
- Responsible person(s), with explicit assignment semantics.
- Status and status history.
- Evidence/documents and submission details.
- Exemption / not-applicable reason.
- Source and last-updated information.

These are proposed fields for domain discovery, not finalized schema.

### B. Period-aware reporting

The reference makes the selected tax year and accounting-period interpretation prominent. M101 should define reporting periods explicitly and avoid treating calendar year and accounting year as interchangeable.

The rule for assigning a cross-year accounting period to a reporting year must be documented, tested, and visible to users.

### C. Distinguish unknown from incomplete

The reference separates states such as completed, in progress, not submitted, overdue, not applicable, and status not entered. M101 should not collapse missing data into pending work or silently count unknown status as a confirmed failure.

### D. Analytics must drill down

Every KPI, chart, and alert should open the exact set of underlying records used to calculate it. The system should show:
- Applied period and filters.
- Included and excluded record counts.
- Status definitions.
- Assignment counting rules (for example, first assignee versus all assignees).
- Data freshness and source.

### E. Alerts are actionable

Overdue and upcoming-work summaries should lead to a filtered work queue, not be decorative banners. Users should be able to identify the entity, work category, due date, responsible person, and next action.

## 5. Important ambiguities in the supplied HTML

The values are illustrative and contain inconsistencies that must not be copied as business logic:

- The KPI says 103 customers requiring filing while the explanatory line refers to 182 total tasks and 5 recurring work types.
- Category totals and status breakdowns do not consistently reconcile with the headline values.
- Some categories show 0 completed out of 0 while still displaying a large count of blank statuses.
- The monthly chart values and bar heights are manually hard-coded.
- The responsible-person chart does not fully define whether a task with multiple assignees is counted once or multiple times.
- The page mixes customer counts, entity counts, and work-item counts; M101 must label each unit explicitly.
- Deadline text (including e-filing extensions) must be validated against the applicable rules and configured period, not copied as static text.

Therefore, treat the page as a UX/content reference only. Do not import its sample numbers or assume its formulas are correct.

## 6. M101 UX translation — Modern Navy, not a clone

The new M101 design should preserve the useful conceptual hierarchy while creating its own design language:

- A compact, purposeful application navigation with clear active state and grouping.
- A unified workspace header with page identity, global search, period context, data status, and account controls arranged as one coherent system.
- A strong executive overview with clearly labeled KPI units and traceable definitions.
- Five-or-more work-category summaries only if confirmed by M101's actual supported work taxonomy.
- Charts designed for comparison and drill-down, not decorative resemblance.
- A clear work queue and alert treatment that prioritizes urgency and next action.
- Responsive layouts that reflow content intentionally on mobile.
- Accessible status colors paired with text and/or icons, never color alone.

Do not copy the Team1 blue/white styling or its emoji-based icon treatment. Do not reproduce the page's exact card styling.

## 7. Proposed first product workflow to validate

**Executive overview → identify risk → open work queue → update a work item → attach evidence → review history**

This may be the first vertical slice if the user confirms that annual obligations and work tracking are the primary purpose of M101.

## 8. Questions still requiring user decisions

1. Is M101 primarily for tracking annual statutory/accounting work, or should it cover broader day-to-day business operations as well?
2. Are the five categories shown in the reference the initial required work categories, or examples only?
3. Should M101 manage customers/business entities as well as the work performed for each one?
4. Should tasks support multiple responsible people, or one primary assignee with optional collaborators?
5. Should users configure deadline rules and reporting periods, or should M101 provide centrally maintained rules?

## 9. Explicit non-decisions

- No decision to copy Team1's visual design.
- No decision to preserve all existing M101 functions.
- No final database schema or migration plan.
- No verified tax/legal deadline rules in this document.
- No production code, live data, or deployment changes.
