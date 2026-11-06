# ChallanOS — Enterprise Fleet & Traffic Challan Management System

> *"A challan is a decision to be made, not a record to be stored."*

ChallanOS is a dedicated fleet compliance and traffic challan decision platform engineered specifically for Indian commercial fleet operators, vehicle leasing enterprises, and corporate logistics providers (such as **Apex Fleet Pvt Ltd**, Delhivery, Zomato Hyperpure, and Blinkit).

---

## 1. Technology Compliance & Framework Restrictions

This project strictly adheres to the requested technology boundaries:

- **Structure:** 100% Semantic HTML5 (native dialogs, accessible forms, tables, semantic tags).
- **Styling:** 100% Native CSS3 (CSS custom properties / design tokens, Flexbox, Grid, native animations, responsive queries).
- **Functionality:** 100% Pure Vanilla JavaScript (ES6+ native DOM APIs, hash router, custom event bus, native LocalStorage).
- **Zero Frontend Frameworks:** No React, Angular, Vue, Next.js, Svelte, or TypeScript.
- **Zero CSS Frameworks:** No Tailwind CSS, Bootstrap, Bulma, or Material-UI.
- **Zero External Dependencies / Build Tools:** No Webpack, Vite, npm packages, or Node.js runtime required to run.
- **Native Browser APIs:** Built using native FileReader and Blob APIs for CSV import and export.
- **Spreadsheet Import Note:** In strict compliance with zero external dependencies, CSV format (`.csv`) is natively supported with a complete 7-step mapping and validation wizard. Proprietary binary Excel (`.xlsx`) parsing would require external bundle libraries (e.g., `xlsx.js`), so CSV was purposefully implemented as the standard interchange format.

---

## 2. Modular Architecture & Project Structure

The project avoids giant monolithic files and is structured into clean, decoupled, single-responsibility modules:

```text
ChallanOS/
│
├── index.html               # Semantic Application Shell & Modals (HTML5)
│
├── assets/
│   ├── icons/               # SVG icon assets
│   └── images/              # Proof and vehicle assets
│
├── css/
│   ├── variables.css        # Enterprise design tokens (Colors, Spacing, Typography, Shadows)
│   ├── reset.css            # Base CSS reset, typography system, and utility classes
│   ├── layout.css           # Shell layout: Collapsible Sidebar, Topbar, Breadcrumbs & Content Grid
│   ├── components.css       # Atomic UI: Buttons, Badges, KPI Cards, Tables, Forms, Modals, Toasts
│   └── responsive.css       # Breakpoints for Desktop (>1024px), Tablet (<=1024px) & Mobile (<=640px)
│
├── js/
│   ├── data.js              # Authentic Indian fleet dataset (22 Vehicles, 32 Challans, Drivers, Lessees)
│   ├── storage.js           # LocalStorage reactive persistence layer & EventBus (state:updated, state:reset)
│   ├── utils.js             # Formatting (INR ₹, Indian dates), Toasts, Modal helpers, CSV exporter
│   ├── responsibility.js    # Priority 1-5 evaluation engine, conflict handling & suggestion banner
│   ├── dashboard.js         # Executive Dashboard, KPI cards, native SVG Donut, Needs Attention work queue
│   ├── vehicles.js          # Vehicle directory, CSV import wizard, profile details & responsibility timeline
│   ├── challans.js          # Challan listing grid, saved views, bulk actions, flagship two-column details
│   ├── payments.js          # Payment lifecycle, multi-rail simulation, printable receipt voucher, recovery ledger
│   ├── disputes.js          # Administrative grievance dockets, virtual court compounding, court stay lock
│   ├── reports.js           # Challan summary, vehicle compliance index, payment ledger, payroll schedule
│   ├── settings.js          # Workspace profile, rules engine policies, role switcher simulation, reset demo
│   └── app.js               # Shell coordinator, hash router, global search (⌘K), notifications flyout
│
└── README.md                # Architectural documentation & user journey guide
```

---

## 3. Design System & Visual Hierarchy

The interface reflects the visual polish, simplicity, and density of modern enterprise software (Linear, Stripe, Ramp):

| Design Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary** | `#2F4BE0` | Deep blue for primary actions, active navigation, links |
| **Primary Light** | `#E8ECFD` | Subtle blue tint for active backgrounds and pills |
| **Primary Dark** | `#2339B8` | Hover state for buttons and critical CTAs |
| **Main Text** | `#111827` | High-contrast enterprise headings and table titles |
| **Secondary Text**| `#6B7280` | Subtitles, helper text, and secondary metadata |
| **Border** | `#E5E7EB` | Subtle dividers and clean card outlines |
| **App Background** | `#F6F7FB` | Very light grey background for high contrast with white cards |
| **White Surface** | `#FFFFFF` | Cards, modal dialogs, and table rows |
| **Unassigned** | `#B42318` | Critical attention: Infraction requires liability attribution |
| **Assigned** | `#1D4ED8` | Attributed to Driver, Lessee, Fleet Operator, or Owner |
| **Pending** | `#B45309` | Awaiting gateway settlement or HR payroll cycle |
| **Paid** | `#15803D` | Settled, reconciled, or compounded by court order |
| **Disputed** | `#6D28D9` | Grievance ticket filed on Parivahan traffic portal |
| **Virtual Court** | `#0369A1` | Case transferred to Special MM Traffic Court (Payment locked) |

---

## 4. The 10 Core Application Modules

### 1. Operational Dashboard (`#dashboard`)
- 5 Executive KPI cards (Open Challans: 1,284, Outstanding: ₹18.4L, Unassigned: 212, Due in 7 Days: 96, Disputed: 31).
- Native SVG Donut Chart with stroke-dasharray breakdown and interactive legend.
- Horizontal recovery allocation bars (Driver Payroll vs Corporate Lessee Invoicing vs Apex Fleet).
- Operational intelligence row (Top Motor Vehicles Act violations, risk watchlist, SLA triage gauge: 4.2h vs 72h).
- **Needs Attention Work Queue** with real-time category filtering pills.

### 2. Vehicle Directory & Import (`#vehicles`)
- Complete commercial vehicle asset table (Registration, Make/Model, Owner, Lessee, Driver, Challans, Sync status).
- Add/Edit Vehicle modal with Indian registration regex validation (`^[A-Z]{2}-[0-9]{2}-[A-Z]{1,2}-[0-9]{4}$`) and duplicate registration prevention.
- **7-Step CSV Import Wizard:** File selection, column auto-mapping, validation against schema, preview table, row-level error breakdown, import confirmation, and error CSV download.
- Instant CSV export for fleet audit.

### 3. Vehicle Profile & Responsibility Timeline (`#vehicles?id=<id>`)
- Asset header with RC, insurance, PUC, and FASTag balance indicators.
- 4 Functional tabs: *Challans*, *Responsibility History*, *Documents*, and *Activity*.
- **Interactive Responsibility Timeline:** Visual horizontal bar showing custody handovers, with red flag conflict detection for overlapping dates and pinpoints for offence timestamps.

### 4. Challan Listing Grid (`#challans`)
- Status tabs with real-time counters (*All, Unassigned, Assigned, Pending, Disputed, Virtual Court, Paid*).
- Saved view shortcuts: *Overdue Only*, *Due in 7 Days*, *High Value (> ₹2,000)*, *Unassigned Triage*.
- Multi-criteria filter toolbar: Full-text search, Offence category, Source gateway, Responsible party.
- Floating Bulk Action Bar for multi-selected rows (*Bulk Assign, Bulk Dispute, Bulk Pay, CSV Export*).

### 5. Flagship Two-Column Challan Details (`#challans?id=<id>`)
- **Left Column:** CCTV ANPR photographic evidence with camera HUD telemetry (`ANPR-DEL-DND-04`, radar speed: 78.4 km/h), zoomed license plate inset (`IND DL-01-AB-1234`), fee breakdown, and statutory countdowns.
- **Right Column:** Automated rule recommendation banner with confidence rating, conflict warning alert, party selector radios, split liability percentage controls, mandatory audit justification textarea, notification simulation toggle, and lifecycle activity ledger.

### 6. Responsibility Assignment Engine (`js/responsibility.js`)
- Strict 5-level priority evaluation:
  1. *Manual user override exists* → Manually selected party (100% confidence)
  2. *Driver trip duty allocation matches offence date/time* → Driver (94% confidence)
  3. *Active lease contract & liability clause* → Corporate Lessee citing **Clause 7.2** (88% confidence)
  4. *Fleet default rule* → Fleet Operator for paperwork lapses like PUC or fleet default asset (92% confidence)
  5. *No rule matches* → Unassigned / Triage required (25% confidence)
- Conflict handling engine flags overlapping custody periods, missing contract dates, and missing indemnity clauses, automatically halting automated attribution to prevent financial leakage.
- Split liability validation requiring exact 100% total with live rupee calculation.

### 7. Payments & Reconciliation (`#payments`)
- Payer vs Responsible Party separation: Apex Fleet settles statutory portal, recovers from Driver or Lessee.
- 5-step payment lifecycle stepper (*Detected → Assigned → Payment Started → Paid → Reconciled*).
- Multi-rail simulation: UPI (Google Pay / PhonePe QR), Net Banking (HDFC / ICICI Corporate), Card, Prepaid Fleet Credit.
- 3 Payment simulation outcomes: *Success* (generates receipt), *Failed* (allows retry/alternate rail), *Pending*.
- **Printable Payment Receipt Voucher Modal (`#receiptModal`)** with verified digital reconciliation seal.

### 8. Disputes & Virtual Court Docket (`#disputes`)
- Two separate compliance streams: Administrative Grievances vs Virtual Court Proceedings.
- Statutory dispute contest workflow with grounds (cloned plate, radar calibration fault, emergency vehicle yield).
- Virtual Court docket tracker (Case number, jurisdiction bench, hearing date, advocate notes).
- **Court Stay Payment Lock:** Strict enterprise rule disabling payment when a case is pending court compounding order.
- Outcome recording: *Waived / Compounded* (zeroes penalty) or *Upheld*.

### 9. Compliance & Audit Reports (`#reports`)
- 6 Comprehensive Executive Business Reports:
  1. *Challan Summary Report* (Infraction distribution by MV Act section, status, and authority)
  2. *Vehicle Fleet Compliance Index* (Vehicle-level risk score, fine density, documentation validity)
  3. *Payment Settlement & Gateway Summary* (Verified statutory payments, rails, convenience fees)
  4. *Outstanding Liability & Aging Analysis* (Impoundment risk monitoring, upcoming statutory deadlines, court stay dockets)
  5. *Downstream Financial Recovery Ledger* (Pre-funded cash-out vs Driver Payroll / Lessee Invoice / Write-off)
  6. *Responsibility Engine Audit Summary* (5-Tier decision hierarchy audit trail, automated confidence, and conflict quarantine)
- Reporting period filter (YTD 2026, Last 30 Days, Current Quarter, All Historical Records).
- Secondary dynamic filters (Status, Category, Rail, Aging buckets, Recovery channel).
- Native responsive SVG/CSS charts without external charting libraries.
- Real-time aggregate KPI tiles and 1-click authentic CSV download for all 6 reports.

### 10. System Settings, Policies & Role Simulation (`#settings`)
- Enterprise workspace profile (Apex Fleet Pvt Ltd corporate registration, GSTIN, PAN, HQ, compliance desk contacts).
- Responsibility rules engine policies (confidence threshold slider 50-95%, mandatory audit justification toggle, strict Clause 7.2 validation, statutory paperwork fleet operator default, conflict auto-quarantine).
- **User Role Simulation & Frontend Permission Enforcement:**
  - 5 specific simulated personas: *Fleet Manager*, *Finance*, *Operations*, *Legal*, and *Read-only*.
  - Frontend permission matrix enforcing authorization boundaries (`canPay`, `canAssign`, `canDispute`, `canCourt`, `canAddVehicle`, `canWriteOff`, `canConfigureSettings`).
  - Action restriction notifications when a restricted persona attempts unauthorized operations.
- **Approval Settings & Maker-Checker Limits:**
  - Single-signer payment approval threshold (default ₹5,000; larger payments trigger dual sign-off).
  - High-exposure dispute threshold (default ₹10,000).
- **Notification Preferences & Simulation Playground:**
  - Automated alert preferences (Driver WhatsApp, Lessee Email, Urgent Impoundment Warning).
  - Simulated notification dispatch triggers displaying payload previews with explicit disclaimer (*No real messages sent externally*).
- **Reset Demo Data Control** with confirmation modal to restore pristine initial state anytime.

---

## 5. How to Run the Application

Because ChallanOS has zero build steps and uses pure native web standards:

1. **Direct Browser Execution:**
   Double-click `index.html` or open it directly in Google Chrome, Safari, Mozilla Firefox, or Microsoft Edge:
   ```bash
   open index.html
   ```

2. **Simple Local HTTP Server (Optional):**
   ```bash
   # Using Python 3:
   python3 -m http.server 8000
   
   # Then visit: http://localhost:8000
   ```

---

## 6. Verification and Quality Guarantees

All JavaScript files have been validated using Node.js syntax checkers and pass with 0 errors:
- `node -c js/data.js` (Verified)
- `node -c js/storage.js` (Verified)
- `node -c js/utils.js` (Verified)
- `node -c js/responsibility.js` (Verified)
- `node -c js/dashboard.js` (Verified)
- `node -c js/vehicles.js` (Verified)
- `node -c js/challans.js` (Verified)
- `node -c js/payments.js` (Verified)
- `node -c js/disputes.js` (Verified)
- `node -c js/reports.js` (Verified)
- `node -c js/settings.js` (Verified)
- `node -c js/app.js` (Verified)
