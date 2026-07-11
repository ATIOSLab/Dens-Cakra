# DENS CAKRA UI Layout & Visual Rules

| Field | Value |
|---|---|
| Version | v1.0 |
| Date | 11 July 2026 |
| Status | Draft for UI Implementation |
| Scope | Global visual language for all roles and all Next.js App Router pages |
| Reference direction | Dark command-center dashboard supplied by the user |

## Revision History

| Version | Date | Description |
|---|---|---|
| v1.0 | 11 July 2026 | Global UI shell, design tokens, card taxonomy, page layouts, map rules, states, responsiveness, and page-level layout mapping. |

## 1. Design Intent

DENS CAKRA SHALL use one consistent visual language across Admin System, Executive, Regional Commander, OIM, Field Coordinator, and Field Officer. The reference image establishes the direction: dark operational dashboard, narrow left navigation, compact topbar, bordered cards, green status accents, high information density, and command-center readability.

The implementation SHOULD be inspired by the reference, not copied pixel-for-pixel. The product identity must remain DENS CAKRA.

### 1.1 UX Principles

1. **Critical information first.** Urgent alerts, approval queues, overdue tasks, and emergency actions appear before secondary analytics.
2. **One visual grammar.** Every role uses the same shell, spacing, card hierarchy, table patterns, and states.
3. **Dense but scannable.** Operational users should understand page state in under three seconds.
4. **Action is contextual.** Primary actions appear near the affected resource and come from server-provided `availableActions`.
5. **Maps support decisions.** Maps are not decorative; they always include filters, legend, scope, time range, and a detail path.

## 2. Global Application Shell

### 2.1 Desktop Structure

```text
┌────────────────────────────────────────────────────────────────────┐
│ Sidebar 232 px │ Topbar 60 px                                      │
│                ├────────────────────────────────────────────────────┤
│ Brand          │ Page title + subtitle       Status / Bell / Avatar │
│ Main nav       ├────────────────────────────────────────────────────┤
│ Section labels │ Breadcrumb / filters / actions                    │
│ Secondary nav  ├────────────────────────────────────────────────────┤
│                │ 12-column content grid                            │
│ User footer    │                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Shell Rules

- Expanded sidebar width: **232 px**; collapsed: **72 px**.
- Topbar height: **60 px** desktop, **56 px** mobile.
- Main content max-width: **1792 px** with fluid width below it.
- Page gutter: **24 px** desktop, **16 px** tablet, **12 px** mobile.
- Sidebar remains fixed on desktop and becomes a drawer on tablet/mobile.
- Field Officer mobile MAY use a five-item bottom navigation for the most frequent tasks: Dashboard, Tugas, Inbox Jaring, Baket, Darurat.
- The current role, active position, and unit appear in the lower sidebar account block.
- `SYSTEM ONLINE`, degraded integration, and offline states use a compact topbar status pill.

### 2.3 Page Header

Every page header contains:

- Eyebrow/module label.
- H1 page title.
- One-line purpose or active scope.
- Optional breadcrumb for deep routes.
- Primary action on the right.
- Secondary actions in an overflow menu.
- Active area/period scope indicator.

## 3. Visual Language

### 3.1 Color Tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#090E0B` | Application background |
| Sidebar | `#0C130F` | Navigation background |
| Surface | `#111A15` | Standard card |
| Raised Surface | `#17231C` | Hover, selected, drawer |
| Border | `#2B3A31` | Card and divider |
| Primary Text | `#F4F8F5` | Main text |
| Secondary Text | `#B6C2BA` | Labels and supporting copy |
| Muted Text | `#849289` | Metadata and captions |
| Primary Green | `#39D982` | Primary action, active nav, online |
| Warning | `#F4B844` | High priority and caution |
| Danger | `#FF6565` | Urgent, error, destructive action |
| Info | `#64B5F6` | Informational state |

Body text contrast is designed to meet WCAG AA on the standard dark surface.

### 3.2 Typography

- Primary font: **Geist Sans** or equivalent neutral sans-serif.
- Telemetry, codes, timestamps, counters, and eyebrow labels: **Geist Mono**.
- H1: 32–36 px, semibold, line-height 1.2.
- H2: 24–28 px, semibold.
- H3/card title: 18–20 px, semibold.
- Body: 14–16 px, line-height 1.5.
- Metadata/caption: 12–13 px.
- Avoid all-uppercase paragraph text. Uppercase is reserved for short telemetry labels.

### 3.3 Shape and Elevation

- Standard radius: **10 px**.
- Large panel/map radius: **14 px**.
- Pills/status badges: fully rounded.
- Cards use a 1 px border; shadows stay subtle on dark backgrounds.
- Selected cards use stronger border plus surface elevation, not a strong glow.

## 4. Navigation Rules

### 4.1 Sidebar

- Active item: green left rail, slightly raised background, primary text.
- Hover: raised surface and visible icon/text contrast.
- Section labels use muted mono 11–12 px uppercase.
- Badge colors follow severity. A red badge is reserved for urgent counts.
- Collapsed sidebar shows icons and tooltips.
- Keyboard focus must remain visible.

### 4.2 Topbar

- Left: page context/breadcrumb on wide screens.
- Right: system status, notifications, user menu.
- Avoid adding page-specific filters to the topbar; filters belong below the page header.

## 5. Card Taxonomy

### 5.1 KPI Card

- Height: 112–136 px.
- Eyebrow label at top.
- Large numeric value in mono font.
- Trend and comparison below.
- Optional icon aligned right.
- One card communicates one metric only.

### 5.2 Priority Queue Card

- Displays 3–7 urgent items.
- Every item contains title, severity, area, age, and owner/status.
- Ends with `Lihat semua`.
- Critical items may use a red left border; the entire card should not become red.

### 5.3 Activity Card

- Vertical event list with action code, actor, resource, and relative time.
- Use mono label for action type.
- Scroll only when the card has a fixed operational height.

### 5.4 Quick Access Card

- Compact 2–4 column row.
- Icon, label, and one-line supporting text.
- Entire card is clickable and keyboard accessible.

### 5.5 Map Card

- Minimum desktop height: **520 px** for a primary map.
- Compact dashboard preview: **320–420 px**.
- Always includes legend, last refresh, active scope, and unlocated count.

### 5.6 Form Section Card

- One meaningful topic per card.
- Header contains title, explanation, and completion state.
- Required and optional fields are visually distinguished without relying only on color.

### 5.7 Workflow Decision Card

- Sticky on desktop.
- Clearly separates informational review from irreversible action.
- Negative decisions require a reason field.

## 6. Grid and Spacing

- Desktop uses a 12-column grid with 16 px gaps.
- Tablet uses 8 columns.
- Mobile uses one column.
- Internal card padding: 20–24 px desktop, 16 px mobile.
- Section spacing: 24–32 px.
- Do not place more than four KPI cards in one desktop row.
- Do not place more than one visually dominant primary card per viewport.

## 7. Standard Page Layouts

### `dashboard-grid`

- **Desktop:** 12-column grid: 4 KPI cards; 8-col primary panel + 4-col priority queue; full-width activity/map; quick links row
- **Tablet:** 8-column grid: 2 KPI cards per row; primary panel full width; queue and map stacked
- **Mobile:** 1-column stack; urgent card first; quick actions sticky at bottom
- **Primary components:** KPI, Priority queue, Map preview, Activity, Quick access, System status

### `list-table`

- **Desktop:** Page header; horizontal filter bar; data table; pagination; optional detail drawer
- **Tablet:** Filter drawer; reduced columns; row actions in overflow menu
- **Mobile:** Card list; bottom-sheet filters; single primary action
- **Primary components:** Filter bar, Table/card list, Bulk action bar, Empty state

### `detail-two-column`

- **Desktop:** 8-col main content + 4-col sticky metadata/actions rail
- **Tablet:** Main content full width; metadata below; sticky action bar
- **Mobile:** Single column; bottom sticky primary action
- **Primary components:** Summary, Metadata, Timeline, Attachments, Map, Available actions

### `master-detail`

- **Desktop:** 5-col searchable master list + 7-col selected detail
- **Tablet:** Master list then detail route
- **Mobile:** Separate list/detail routes
- **Primary components:** Master list, Detail panel, Status, History

### `tree-detail`

- **Desktop:** 4-col hierarchy tree + 8-col detail
- **Tablet:** Tree drawer + detail
- **Mobile:** Separate hierarchy and detail pages
- **Primary components:** Tree, Detail, Relations, Validation

### `audit-investigation`

- **Desktop:** Full-width filter bar; 7-col audit table + 5-col immutable event detail
- **Tablet:** Table and detail stacked
- **Mobile:** Audit event cards
- **Primary components:** Audit table, Before/after diff, Actor/device, Export action

### `settings-sections`

- **Desktop:** 3-col settings navigation + 9-col grouped forms
- **Tablet:** Horizontal tabs + form sections
- **Mobile:** Accordion groups
- **Primary components:** Setting section, Secret indicator, Change confirmation

### `tabbed-workspace`

- **Desktop:** Page header + tab bar + tab-specific workspace
- **Tablet:** Scrollable tabs
- **Mobile:** Select/dropdown tab switcher
- **Primary components:** Tab navigation, Tab content, Context summary

### `tree-map-split`

- **Desktop:** 4-col organization/area tree + 8-col map/detail; resizable split
- **Tablet:** Tree drawer + full map
- **Mobile:** Tree screen and map screen separated
- **Primary components:** Hierarchy tree, Boundary map, Coverage metadata, Import status

### `permission-matrix`

- **Desktop:** Sticky first column; horizontally scrollable permission matrix; impact summary rail
- **Tablet:** Role tabs + grouped permission switches
- **Mobile:** Role accordion with grouped permissions
- **Primary components:** Matrix, Impact preview, Save bar

### `analytics-grid`

- **Desktop:** Filter bar; KPI row; 8-col main chart + 4-col breakdown; detail table
- **Tablet:** Charts stacked
- **Mobile:** KPI carousel; one chart per section
- **Primary components:** KPI, Trend chart, Breakdown, Comparison, Data table

### `analytics-map`

- **Desktop:** 4-col analytics/filters + 8-col map; bottom data table
- **Tablet:** Map first, analytics below
- **Mobile:** Map/list toggle
- **Primary components:** Map, KPI, Trend, Area breakdown

### `map-workspace`

- **Desktop:** Full-height map; top filter bar; left layer control; right detail drawer
- **Tablet:** Full map; bottom-sheet details
- **Mobile:** Map/list toggle; bottom sheet; locate and layer controls
- **Primary components:** Map canvas, Layer control, Legend, Popup, Detail drawer, Unlocated list

### `map-command-center`

- **Desktop:** 9-col map + 3-col live critical queue; bottom incident timeline drawer
- **Tablet:** Map + bottom queue
- **Mobile:** Critical queue first, map second
- **Primary components:** Map, Critical queue, Incident timeline, Action panel

### `map-analytics`

- **Desktop:** 8-col choropleth/heatmap + 4-col metric panel; compare-period toolbar
- **Tablet:** Map and metric panel stacked
- **Mobile:** Map/list toggle and metric selector
- **Primary components:** Choropleth, Metric selector, Trend drawer, Legend

### `briefing-grid`

- **Desktop:** 12-col editorial grid; 8-col lead briefing + 4-col critical alerts; two 6-col supporting panels
- **Tablet:** Lead full width; supporting panels stacked
- **Mobile:** Prioritized briefing feed
- **Primary components:** Lead briefing, Critical alerts, Products, Directive progress, Trends

### `module-landing`

- **Desktop:** Module summary; quick actions; status cards; recent items
- **Tablet:** Two-column cards
- **Mobile:** Single-column action cards
- **Primary components:** Summary, Quick action, Recent records

### `queue-detail`

- **Desktop:** 4-col queue + 8-col selected detail/action workspace
- **Tablet:** Queue route then detail route
- **Mobile:** Separate list/detail pages
- **Primary components:** Queue, Detail, Timeline, Decision panel

### `list-detail`

- **Desktop:** 5-col list + 7-col detail or full detail route
- **Tablet:** List then detail
- **Mobile:** Card list then detail
- **Primary components:** List, Summary, Timeline, Related records

### `stepper-form`

- **Desktop:** 8-col form + 4-col sticky review/validation rail; horizontal stepper
- **Tablet:** Form full width; review below
- **Mobile:** One task per screen; bottom sticky next/save
- **Primary components:** Stepper, Form section, Validation summary, Review

### `dynamic-form`

- **Desktop:** 3-col section navigation + 6-col form + 3-col validation/source rail
- **Tablet:** Section tabs + form + validation
- **Mobile:** Accordion sections; bottom save/submit
- **Primary components:** Section navigation, Generated fields, Source selector, Validation panel

### `editor-workspace`

- **Desktop:** 3-col sources + 6-col editor + 3-col entities/validation
- **Tablet:** Editor first; sources and metadata in drawers
- **Mobile:** Editor sections stacked
- **Primary components:** Sources, Editor, Entities, Relationships, Validation

### `workflow-workspace`

- **Desktop:** 7-col evidence/content + 5-col sticky checklist/scoring/actions
- **Tablet:** Evidence then workflow controls
- **Mobile:** Single column; action bar at bottom
- **Primary components:** Evidence, Checklist, Scoring, Decision, Timeline

### `alert-queue`

- **Desktop:** 4-col severity queue + 8-col alert detail/map
- **Tablet:** Queue then detail
- **Mobile:** Severity-sorted cards
- **Primary components:** Alert queue, Map, Timeline, Action panel

### `alert-analytics`

- **Desktop:** Filter bar; trends; recurring areas; related formal products
- **Tablet:** Stacked charts
- **Mobile:** Metric selector + cards
- **Primary components:** Trend, Area concentration, Related products

### `command-board`

- **Desktop:** 12-col command board; active directives 7-col; emergency 5-col; regional map full width
- **Tablet:** Stacked command panels
- **Mobile:** Emergency and urgent actions first
- **Primary components:** Directives, UUK/STR, Tasks, Emergency, Map

### `analytics-table`

- **Desktop:** KPI row; filter bar; grouped table/tree; side summary
- **Tablet:** KPI + table
- **Mobile:** Summary cards + card list
- **Primary components:** KPI, Table, Progress, Overdue

### `assignment-builder`

- **Desktop:** 5-col task/context + 7-col eligible personnel and workload
- **Tablet:** Context then candidate list
- **Mobile:** Candidate cards with single-select/multi-select
- **Primary components:** Task context, Candidate list, Workload, Coverage, Assignment review

### `directory-map`

- **Desktop:** 5-col personnel directory + 7-col latest-location map
- **Tablet:** Map/list toggle
- **Mobile:** Directory first; map optional
- **Primary components:** Personnel list, Location map, Workload, Coverage

### `kanban-board`

- **Desktop:** Horizontal status columns; sticky filter bar; task detail drawer
- **Tablet:** Horizontally scrollable board
- **Mobile:** Status tabs + card list
- **Primary components:** Kanban column, Task card, Detail drawer

### `inbox-list`

- **Desktop:** Inbox list with read/priority indicators and filter sidebar
- **Tablet:** Full-width list
- **Mobile:** Message/task cards
- **Primary components:** Inbox, Read status, Quick actions

### `inbox-detail`

- **Desktop:** 4-col inbox + 8-col immutable source detail
- **Tablet:** List then detail
- **Mobile:** Separate routes
- **Primary components:** Message, Media, Location, Validation, Routing history

### `review-submit`

- **Desktop:** 8-col full preview + 4-col completeness and submit panel
- **Tablet:** Preview then submit panel
- **Mobile:** Summary sections + sticky submit
- **Primary components:** Preview, Completeness, Warnings, Submit confirmation

### `critical-action-form`

- **Desktop:** Centered max-width 640px critical form with strong status header
- **Tablet:** Full-width form
- **Mobile:** Full-screen one-task form; 56px submit button
- **Primary components:** Critical form, GPS state, Attachment, Confirmation

### `catalog-grid`

- **Desktop:** Filter bar; table/card view switch; 3-column cards or full table
- **Tablet:** 2-column cards
- **Mobile:** 1-column cards
- **Primary components:** Catalog card, Status, Metadata, Pagination

### `system-state`

- **Desktop:** Centered loading/access state
- **Tablet:** Centered state
- **Mobile:** Centered state
- **Primary components:** Loading, Access error

## 8. Dashboard Composition by Role

### 8.1 Admin System

```text
Row 1: System readiness | WA integration | Active users | Security alerts
Row 2: Integration health (8 col) | Pending provisioning (4 col)
Row 3: Audit activity (12 col)
Row 4: Quick access cards
```

Admin System SHALL not receive raw intelligence content by default.

### 8.2 Executive

```text
Row 1: Critical alerts | Pending approvals | Active directives | Approved products
Row 2: National situation map (8 col) | Executive priority queue (4 col)
Row 3: Strategic trends (8 col) | Regional exceptions (4 col)
Row 4: Briefing and recent approved products
```

### 8.3 Regional Commander

```text
Row 1: Regional risk | Pending approval | Task completion | Critical warning
Row 2: Regional map (8 col) | Approval/alert queue (4 col)
Row 3: Directive and UUK/STR progress
Row 4: Field outputs and product pipeline
```

### 8.4 OIM

```text
Row 1: Incoming Baket | Verification queue | Needs development | Product drafts
Row 2: Verification pipeline (8 col) | Priority Baket queue (4 col)
Row 3: Field monitoring map
Row 4: Analysis and product workspaces
```

### 8.5 Field Coordinator

```text
Row 1: Tasks received | In progress | Overdue | Emergency
Row 2: Field operations map (8 col) | Team workload (4 col)
Row 3: Recent field reports
Row 4: Quick assignment actions
```

### 8.6 Field Officer

```text
Row 1: My tasks | Jaring inbox | Draft Baket | Revision requests
Row 2: Primary task/Baket action
Row 3: My task map
Row 4: Emergency action and recent reports
```

## 9. Table and List Rules

- Header remains sticky inside long operational tables.
- First column identifies the resource; status and actions remain visible where practical.
- Default page size: 20; options: 20, 50, 100 for administrative tables.
- Operational feeds use cursor pagination.
- Column visibility may be customized, but mandatory identity/status columns cannot be hidden.
- Use row click for detail and a separate overflow button for secondary actions.
- On mobile, tables become cards rather than horizontal-scroll data grids unless comparison is essential.

## 10. Form Rules

- Labels are always visible; placeholders never replace labels.
- Error text explains what happened and how to fix it.
- Required fields use text/symbol and accessible description.
- Destructive actions require confirmation and reason when audited.
- Draft forms expose Save Draft and primary next/submit action.
- Immutable resources never render editable controls.
- Buttons have default, hover, pressed, focus, disabled, loading, and success states.
- Mobile tap targets are at least 44×44 px.

## 11. Map Rules with mapcn

### 11.1 Map Shell

- Use a controlled map component.
- Keep viewport, selected area, layers, and period synchronized with URL state.
- Debounce pan/zoom requests by 300–500 ms.
- Load boundaries separately from reports, alerts, emergencies, and personnel.
- Use server-side clusters at low zoom or large result counts.
- DOM markers are reserved for selected points or small result sets.

### 11.2 Map Controls

- Top-left: zoom and compass.
- Top-right: layer switcher and base-style selector.
- Bottom-left: legend and active scope.
- Bottom-right: locate/fullscreen.
- Right side desktop: selected-resource drawer.
- Mobile: bottom-sheet details.

### 11.3 Marker Semantics

- Red: urgent/critical.
- Amber: high/warning.
- Green: normal/resolved/active depending on layer.
- Blue: informational or personnel/self-location.
- Shape/icon differentiates resource type so color is never the only cue.

### 11.4 Popup Content

A popup contains only:

- Short title.
- Status/severity.
- Time.
- Administrative area.
- One source/category label.
- `Buka Detail` action.

Sensitive Jaring identity does not appear in a general map popup.

## 12. Interaction States

| State | Visual rule |
|---|---|
| Default | Subtle border and standard surface |
| Hover | Raised surface and stronger border |
| Active/Pressed | 1 px visual depression or darker primary |
| Focus | 2 px green focus ring with offset |
| Selected | Strong border plus soft primary background |
| Disabled | Reduced contrast; no hover; reason available when relevant |
| Loading | Skeleton matching final dimensions |
| Empty | Explanation, relevant illustration/icon, one recovery action |
| Error | Local error card with retry; preserve successful regions |
| Conflict | Warning panel with Reload and Compare options |
| Success | Inline confirmation and updated timestamp |

## 13. Responsive Rules

### Desktop ≥ 1280 px

- Expanded sidebar.
- Dense 12-column grid.
- Sticky metadata/action rails are allowed.
- Master-detail and queue-detail split views are preferred.

### Tablet 768–1279 px

- Collapsed or drawer sidebar.
- 8-column grid.
- Detail panels become separate routes or bottom sheets.
- Filters move into a drawer when the horizontal bar becomes crowded.

### Mobile < 768 px

- One-column layout.
- One primary task per screen.
- Sticky bottom action bar.
- Tables become cards.
- Maps use map/list toggle.
- Avoid hover dependency.
- Emergency action remains reachable within two interactions.

## 14. Accessibility

- WCAG AA minimum contrast.
- Full keyboard navigation.
- Visible focus indicators.
- `aria-label` for icon-only buttons and map controls.
- Status is communicated with text/icon in addition to color.
- Form errors use `aria-describedby` and an error summary.
- Motion respects `prefers-reduced-motion`.
- Map features must have a list/table alternative.

## 15. Page-Level Layout Mapping

| Role | Route | Page | Existing type | Required layout | Main cards/components |
|---|---|---|---|---|---|
| `GLOBAL` | `/dashboard` | Role Dashboard Redirect | `redirect` | `system-state` | Loading, Access error |
| `GLOBAL` | `/dashboard/notifications` | Notifications | `list` | `list-table` | Filter bar, Table/card list, Bulk action bar, Empty state |
| `GLOBAL` | `/dashboard/profil` | Profile & Security | `detail` | `detail-two-column` | Summary, Metadata, Timeline, Attachments, Map, Available actions |
| `ADMIN_SYSTEM` | `/dashboard/admin-system` | System Dashboard | `dashboard` | `dashboard-grid` | KPI, Priority queue, Map preview, Activity, Quick access, System status |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/integrasi-wa-center` | WA Center Integration | `master-detail` | `master-detail` | Master list, Detail panel, Status, History |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/jabatan-reporting-line` | Position & Reporting Line | `tree-table` | `tree-detail` | Tree, Detail, Relations, Validation |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/keamanan-audit` | Security & Audit | `investigation` | `audit-investigation` | Audit table, Before/after diff, Actor/device, Export action |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/konfigurasi-sistem` | System Configuration | `settings` | `settings-sections` | Setting section, Secret indicator, Change confirmation |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/master-data` | Reference & Master Data | `tabs` | `tabbed-workspace` | Tab navigation, Tab content, Context summary |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/organisasi-wilayah` | Organization & Administrative Area | `split-tree-map` | `tree-map-split` | Hierarchy tree, Boundary map, Coverage metadata, Import status |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/pengguna` | User Provisioning | `master-detail` | `master-detail` | Master list, Detail panel, Status, History |
| `ADMIN_SYSTEM` | `/dashboard/admin-system/role-hak-akses` | Roles & Permissions | `matrix` | `permission-matrix` | Matrix, Impact preview, Save bar |
| `EXECUTIVE` | `/dashboard/executive` | Executive Dashboard | `dashboard` | `dashboard-grid` | KPI, Priority queue, Map preview, Activity, Quick access, System status |
| `EXECUTIVE` | `/dashboard/executive/kinerja-evaluasi` | National Performance & Evaluation | `analytics` | `analytics-grid` | KPI, Trend chart, Breakdown, Comparison, Data table |
| `EXECUTIVE` | `/dashboard/executive/laporan-briefing` | Executive Briefing | `composition` | `briefing-grid` | Lead briefing, Critical alerts, Products, Directive progress, Trends |
| `EXECUTIVE` | `/dashboard/executive/monitoring-nasional` | National Monitoring | `analytics-map` | `analytics-map` | Map, KPI, Trend, Area breakdown |
| `EXECUTIVE` | `/dashboard/executive/persetujuan` | Approval Summary | `landing` | `module-landing` | Summary, Quick action, Recent records |
| `EXECUTIVE` | `/dashboard/executive/persetujuan-eksekutif` | Executive Approval Inbox | `queue-detail` | `queue-detail` | Queue, Detail, Timeline, Decision panel |
| `EXECUTIVE` | `/dashboard/executive/produk-intelijen` | Approved Intelligence Products | `catalog` | `catalog-grid` | Catalog card, Status, Metadata, Pagination |
| `EXECUTIVE` | `/dashboard/executive/pusat-komando` | Command Center | `landing` | `module-landing` | Summary, Quick action, Recent records |
| `EXECUTIVE` | `/dashboard/executive/pusat-komando/direktif` | Strategic Directives | `list-detail` | `list-detail` | List, Summary, Timeline, Related records |
| `EXECUTIVE` | `/dashboard/executive/pusat-komando/direktif-strategis` | Directive Builder | `wizard` | `stepper-form` | Stepper, Form section, Validation summary, Review |
| `EXECUTIVE` | `/dashboard/executive/pusat-komando/operasi-darurat` | Emergency Operations | `map-command` | `map-command-center` | Map, Critical queue, Incident timeline, Action panel |
| `EXECUTIVE` | `/dashboard/executive/situasi-nasional` | National Situation | `landing` | `module-landing` | Summary, Quick action, Recent records |
| `EXECUTIVE` | `/dashboard/executive/situasi-nasional/peringatan-dini` | National Early Warning | `alert-queue` | `alert-queue` | Alert queue, Map, Timeline, Action panel |
| `EXECUTIVE` | `/dashboard/executive/situasi-nasional/peta-kerawanan` | National Risk Map | `map` | `map-workspace` | Map canvas, Layer control, Legend, Popup, Detail drawer, Unlocated list |
| `EXECUTIVE` | `/dashboard/executive/situasi-strategis` | Strategic Situation | `analytics` | `analytics-grid` | KPI, Trend chart, Breakdown, Comparison, Data table |
| `EXECUTIVE` | `/dashboard/executive/situasi-strategis/peringatan-dini` | Strategic Warning Analysis | `analytics-alerts` | `alert-analytics` | Trend, Area concentration, Related products |
| `EXECUTIVE` | `/dashboard/executive/situasi-strategis/peta-kerawanan` | Strategic Risk Trend Map | `map-analytics` | `map-analytics` | Choropleth, Metric selector, Trend drawer, Legend |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator` | Field Coordination Dashboard | `dashboard` | `dashboard-grid` | KPI, Priority queue, Map preview, Activity, Quick access, System status |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/laporan-darurat` | Field Emergency Monitor | `queue-map` | `detail-two-column` | Summary, Metadata, Timeline, Attachments, Map, Available actions |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/laporan-lapangan` | Field Reports | `list-detail` | `list-detail` | List, Summary, Timeline, Related records |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/monitoring-tugas` | Task Monitoring | `analytics-table` | `analytics-table` | KPI, Table, Progress, Overdue |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/penugasan-field-officer` | Assign Field Officer | `assignment-builder` | `assignment-builder` | Task context, Candidate list, Workload, Coverage, Assignment review |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/personel-jaring` | Personnel & Jaring | `tabs` | `tabbed-workspace` | Tab navigation, Tab content, Context summary |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/personel-lapangan` | Field Personnel | `directory-map` | `directory-map` | Personnel list, Location map, Workload, Coverage |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/peta-lapangan` | Field Operations Map | `map` | `map-workspace` | Map canvas, Layer control, Legend, Popup, Detail drawer, Unlocated list |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/tugas-lapangan` | Field Task Workspace | `landing` | `module-landing` | Summary, Quick action, Recent records |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/tugas-lapangan/tugas-diterima` | Received Tasks | `inbox` | `inbox-list` | Inbox, Read status, Quick actions |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/tugas-lapangan/penugasan-tim` | Team Assignment | `assignment-builder` | `assignment-builder` | Task context, Candidate list, Workload, Coverage, Assignment review |
| `FIELD_COORDINATOR` | `/dashboard/field-coordinator/tugas-operasional` | Operational Task Board | `kanban` | `kanban-board` | Kanban column, Task card, Detail drawer |
| `FIELD_OFFICER` | `/dashboard/field-officer` | Field Officer Dashboard | `dashboard` | `dashboard-grid` | KPI, Priority queue, Map preview, Activity, Quick access, System status |
| `FIELD_OFFICER` | `/dashboard/field-officer/buat-baket` | Create Baket | `wizard` | `stepper-form` | Stepper, Form section, Validation summary, Review |
| `FIELD_OFFICER` | `/dashboard/field-officer/jaring-binaan` | Managed Jaring | `list-detail` | `list-detail` | List, Summary, Timeline, Related records |
| `FIELD_OFFICER` | `/dashboard/field-officer/kirim-baket` | Submit Baket | `review-submit` | `review-submit` | Preview, Completeness, Warnings, Submit confirmation |
| `FIELD_OFFICER` | `/dashboard/field-officer/kotak-masuk-jaring` | Jaring Inbox | `inbox-detail` | `inbox-detail` | Message, Media, Location, Validation, Routing history |
| `FIELD_OFFICER` | `/dashboard/field-officer/laporan-darurat` | Emergency Report | `quick-form` | `critical-action-form` | Critical form, GPS state, Attachment, Confirmation |
| `FIELD_OFFICER` | `/dashboard/field-officer/laporan-saya` | My Baket | `list-detail` | `list-detail` | List, Summary, Timeline, Related records |
| `FIELD_OFFICER` | `/dashboard/field-officer/peta-tugas` | My Task Map | `map` | `map-workspace` | Map canvas, Layer control, Legend, Popup, Detail drawer, Unlocated list |
| `FIELD_OFFICER` | `/dashboard/field-officer/tugas-saya` | My Tasks | `inbox-kanban` | `detail-two-column` | Summary, Metadata, Timeline, Attachments, Map, Available actions |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim` | OIM Dashboard | `dashboard` | `dashboard-grid` | KPI, Priority queue, Map preview, Activity, Quick access, System status |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/analisis-intelijen` | Intelligence Analysis | `workspace` | `editor-workspace` | Sources, Editor, Entities, Relationships, Validation |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/direktif-tugas` | Directive & Tasking | `list-builder` | `detail-two-column` | Summary, Metadata, Timeline, Attachments, Map, Available actions |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/laporan-masuk` | Incoming Baket | `queue-detail` | `queue-detail` | Queue, Detail, Timeline, Decision panel |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/monitoring-lapangan` | Field Monitoring | `analytics-map` | `analytics-map` | Map, KPI, Trend, Area breakdown |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/pengajuan-persetujuan` | Submission & Approval Tracking | `queue` | `detail-two-column` | Summary, Metadata, Timeline, Attachments, Map, Available actions |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/peta-situasi` | OIM Situation Map | `map` | `map-workspace` | Map canvas, Layer control, Legend, Popup, Detail drawer, Unlocated list |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/produk-intelijen` | Intelligence Products Workspace | `landing` | `module-landing` | Summary, Quick action, Recent records |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/produk-intelijen/buat-produk` | Product Builder | `dynamic-form` | `dynamic-form` | Section navigation, Generated fields, Source selector, Validation panel |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/produk-intelijen/daftar-produk` | Product List | `list-detail` | `list-detail` | List, Summary, Timeline, Related records |
| `OPERATIONAL_INTELLIGENCE_MANAGER` | `/dashboard/oim/verifikasi-neraca-penilaian` | Verification & Assessment Balance | `workspace` | `editor-workspace` | Sources, Editor, Entities, Relationships, Validation |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander` | Regional Command Dashboard | `dashboard` | `dashboard-grid` | KPI, Priority queue, Map preview, Activity, Quick access, System status |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/direktif-penjabaran-uuk-str` | UUK/STR Elaboration | `wizard-list` | `detail-two-column` | Summary, Metadata, Timeline, Attachments, Map, Available actions |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/jawaban-lapangan` | Field Answers | `list-detail` | `list-detail` | List, Summary, Timeline, Related records |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/komando-regional` | Regional Command Center | `command-board` | `command-board` | Directives, UUK/STR, Tasks, Emergency, Map |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/kpi-evaluasi` | Regional KPI & Evaluation | `analytics` | `analytics-grid` | KPI, Trend chart, Breakdown, Comparison, Data table |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/laporan-intelijen` | Regional Intelligence Findings | `catalog` | `catalog-grid` | Catalog card, Status, Metadata, Pagination |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/laporan-produk-intelijen` | Regional Intelligence Products | `catalog` | `catalog-grid` | Catalog card, Status, Metadata, Pagination |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/monitoring-tugas` | Regional Task Monitoring | `analytics-tree` | `detail-two-column` | Summary, Metadata, Timeline, Attachments, Map, Available actions |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/persetujuan-regional` | Regional Approval | `queue-detail` | `queue-detail` | Queue, Detail, Timeline, Decision panel |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/personel-jaring` | Regional Personnel & Jaring | `tabs` | `tabbed-workspace` | Tab navigation, Tab content, Context summary |
| `REGIONAL_COMMANDER` | `/dashboard/regional-commander/peta-peringatan-dini` | Regional Early Warning Map | `map` | `map-workspace` | Map canvas, Layer control, Legend, Popup, Detail drawer, Unlocated list |

## 16. Component Naming and Placement

```text
src/components/dens/
├── app-shell/
│   ├── app-sidebar.tsx
│   ├── app-topbar.tsx
│   ├── page-header.tsx
│   └── scope-indicator.tsx
├── cards/
│   ├── kpi-card.tsx
│   ├── queue-card.tsx
│   ├── activity-card.tsx
│   ├── quick-access-card.tsx
│   └── status-card.tsx
├── data/
│   ├── data-table.tsx
│   ├── filter-bar.tsx
│   ├── status-badge.tsx
│   └── empty-state.tsx
├── map/
│   ├── dens-map.tsx
│   ├── layer-control.tsx
│   ├── map-legend.tsx
│   ├── feature-popup.tsx
│   └── feature-drawer.tsx
└── workflow/
    ├── timeline.tsx
    ├── available-actions.tsx
    ├── decision-card.tsx
    └── completeness-panel.tsx
```

## 17. Acceptance Criteria

- **AC-UI-001:** All roles use the same application shell and design tokens.
- **AC-UI-002:** Every page uses one documented layout pattern.
- **AC-UI-003:** Critical information is visible without scrolling on desktop dashboards.
- **AC-UI-004:** Every card implements default, hover, active, focus, disabled, loading, empty, and error states where applicable.
- **AC-UI-005:** Every map provides legend, scope, last refresh, and a non-map fallback.
- **AC-UI-006:** Tables and filters remain usable at 768 px width.
- **AC-UI-007:** Field Officer critical actions are usable on mobile with 44×44 px minimum targets.
- **AC-UI-008:** Workflow buttons are rendered from backend `availableActions`.
- **AC-UI-009:** Status and severity are never communicated by color alone.
- **AC-UI-010:** All body text and interactive controls meet WCAG AA contrast.