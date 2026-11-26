# ChallanOS — Design Direction & Token System

> **Source of truth** for all Unslop passes across `css/`, `index.html`, and `js/`.

---

## 1. Five-Line Direction

- **Product:** Commercial fleet traffic-challan adjudication and statutory settlement ledger for Indian logistics operators (Apex Fleet).
- **Character:** Authoritative, unhurried, forensic.
- **World:** Indian legal-financial ledgers, stamped Parivahan tax vouchers, and highway corridor dispatch boards.
- **Moments:**
  1. Live-computed **Monthly Exposure & Settlement Chart** paired beside a ranked **Corridor & Liability Breakdown**.
  2. **Parivahan Settlement Receipt Voucher** styled like an authentic physical statutory document.
- **Signature:** Commercial registration plates set in `Geist Mono` with a `3px` amber left rule (`DL-01-AB-1234`), used consistently across every notice, vehicle row, drawer, and receipt.

---

## 2. Color & Neutral Ramp

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Page Canvas | `--canvas` / `--bg-app` | `#F7F7F5` | Warm paper application background |
| Surface | `--surface` | `#FFFFFF` | Primary ledger panels, cards, modals |
| Sunken Surface | `--surface-2` | `#F4F4F2` | Utility strips, table headers, subtle fills |
| Hover Surface | `--surface-3` | `#ECECE8` | Interactive hover states |
| Hairline | `--hairline` | `#E4E4E7` | `1px` structural borders everywhere |
| Strong Hairline | `--hairline-medium` | `#D4D4D8` | Input borders, active dividers |
| Primary Ink | `--ink` | `#111827` | Headings, monetary figures, primary copy |
| Secondary Ink | `--ink-muted` | `#4B5563` | Supporting descriptions, table metadata |
| Muted Ink | `--ink-faint` | `#52525B` | Captions, axis ticks, timestamps (`>= 4.5:1`) |
| Primary Accent | `--accent` / `--color-primary` | `#1D4ED8` | Primary CTA, active nav/tab selection, current-month bar |
| Accent Hover | `--accent-hover` | `#1E40AF` | Primary button hover |

### Semantic Status Colors
- **Paid / Settled:** `--status-paid: #15803D`, bg `rgba(16, 185, 129, 0.10)`, border `rgba(16, 185, 129, 0.25)`
- **Pending:** `--status-pending: #92400E`, bg `rgba(245, 158, 11, 0.12)`, border `rgba(180, 83, 9, 0.28)`
- **Unassigned / Overdue:** `--status-unassigned: #B91C1C`, bg `rgba(239, 68, 68, 0.10)`, border `rgba(185, 28, 28, 0.28)`
- **Court / Sub-Judice:** `--status-court: #4338CA`, bg `rgba(99, 102, 241, 0.09)`, border `rgba(99, 102, 241, 0.22)`

### Forbidden Color & Surface Patterns
- Zero multi-stop `linear-gradient`, `radial-gradient`, or `repeating-linear-gradient` on UI surfaces or text.
- Zero colored `box-shadow` glows (`rgba(9, 104, 246, ...)`, `rgba(30, 96, 255, ...)`). Only neutral `rgba(17, 24, 39, ...)` shadows or `1px solid var(--hairline)` borders.
- Zero `backdrop-filter: blur(...)` glassmorphism on UI chrome.

---

## 3. Typography & Copy

- **Families:** `--font-family-base` (`Inter`, system sans) and `--font-family-mono` (`Geist Mono`, monospace for plates, INR amounts, challan IDs, and timestamps). Never use `'SF Pro Text'` or `'Plus Jakarta Sans'` fallbacks in SVG/inline styles.
- **Weights:** `400` (regular), `500` (medium), `600` (semibold) only. No `700`/`800`/`900` weights.
- **Scale:** `12px` (meta/badges), `13px–14px` (body/nav/buttons), `16px` (section heads), `20px–28px` (page titles/KPIs), `32px` (hero figures). No text smaller than `11px`.
- **Casing:** Sentence case everywhere (`Navigation`, `Paid this month`, `Search`). No `text-transform: uppercase` with wide letter-spacing on labels or section headers (except legal/plate identifiers like `.reg-plate-chip` where uppercase reflects real plate formatting).
- **Copy:** Short labels (`Search`), no exclamation marks, no ellipsis on search placeholders.

---

## 4. Spacing, Layout & Primitives

- **4px Grid:** All margins, paddings, gaps, and heights sit on multiples of `4px` (`4, 8, 12, 16, 20, 24, 32, 40, 48`).
- **Sidebar & Topbar:** Sidebar `248px` wide; nav rows `32–36px` tall (`padding: 8px 12px; gap: 8px;`); section labels `24px` above and `8px` below; topbar `64px` tall.
- **Buttons:** `36px` default height (`8px 16px` padding), `32px` small (`4px 12px` padding), `8px` radius.
- **Cards:** `20px–24px` padding, `12px` radius, `1px solid var(--hairline)` border.
- **Inputs:** `36px` height, `8px 12px` padding, `8px` radius, `1px solid var(--hairline-medium)`.
- **Badges:** `12px` font-size, `4px 8px` padding, `500` weight, `6px` or `9999px` radius.
- **Icons:** Single `16px` SVG line icon set (`1.5px` stroke, `currentColor`). Zero raw emojis (`🚐`) or raw `✓` glyphs.
- **Motion:** Zero infinite/looping pulse or spin animations on idle UI elements.
