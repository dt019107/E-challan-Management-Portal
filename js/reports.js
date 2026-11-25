/**
 * ChallanOS - Enterprise Executive Reports & Fleet Analytics Module (js/reports.js)
 * 
 * Provides 6 Executive Fleet Compliance Reports:
 * 1. Challan Summary (Infractions by MV Act section, issuing authority, fine amount & status)
 * 2. Vehicle Summary (Asset-level risk scoring, open fine density, and document validity)
 * 3. Payment Summary (Settlement volume across rails, gateway fees, and payer distribution)
 * 4. Outstanding Summary (Aging liability analysis, impoundment risk, and upcoming deadlines)
 * 5. Recovery Ledger (Pre-funded cash-out vs Driver Payroll / Lessee Invoice / Write-off)
 * 6. Responsibility Summary (5-Tier custody engine audit, auto-attribution rate, and conflict quarantine)
 * 
 * Features:
 * - Dynamic filtering by Reporting Period (All Time, 30 Days, Q3, YTD)
 * - Secondary status, category, rail, and aging bucket filters
 * - Real-time KPI aggregate cards
 * - Native responsive SVG/CSS charts without external dependencies
 * - Full data tables
 * - 1-Click authentic CSV download for all 6 reports
 */

let reportsViewState = {
  activeReportType: "challan_summary",
  dateRange: "ytd",
  secondaryFilter: "all",
  searchQuery: ""
};

/**
 * Main View Renderer
 */
function renderReportsView(container, actions) {
  actions.innerHTML = `
    <button class="btn btn--primary btn--sm" onclick="exportCurrentReportCSV()">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      Export Report CSV
    </button>
  `;

  const reportData = getActiveReportData();

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: var(--space-4);">
      
      <!-- Report Type Selector & Filter Bar -->
      <div class="card" style="padding: var(--space-4) var(--space-6);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3);">
          
          <!-- 6 Report Sub-Tabs -->
          <div class="nav-tabs" style="border-bottom: none; margin-bottom: 0; flex-wrap: wrap;">
            <button class="nav-tab ${reportsViewState.activeReportType === 'challan_summary' ? 'active' : ''}" onclick="switchReportType('challan_summary')">
              1. Challan Summary
            </button>
            <button class="nav-tab ${reportsViewState.activeReportType === 'vehicle_compliance' ? 'active' : ''}" onclick="switchReportType('vehicle_compliance')">
              2. Vehicle Summary
            </button>
            <button class="nav-tab ${reportsViewState.activeReportType === 'payment_ledger' ? 'active' : ''}" onclick="switchReportType('payment_ledger')">
              3. Payment Summary
            </button>
            <button class="nav-tab ${reportsViewState.activeReportType === 'outstanding_summary' ? 'active' : ''}" onclick="switchReportType('outstanding_summary')">
              4. Outstanding Summary
            </button>
            <button class="nav-tab ${reportsViewState.activeReportType === 'recovery_ledger' ? 'active' : ''}" onclick="switchReportType('recovery_ledger')">
              5. Recovery Ledger
            </button>
            <button class="nav-tab ${reportsViewState.activeReportType === 'responsibility_summary' ? 'active' : ''}" onclick="switchReportType('responsibility_summary')">
              6. Responsibility Summary
            </button>
          </div>

          <!-- Filter Controls -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <!-- Date Filter -->
            <select class="form-select" style="width: 160px; font-size: 12px;" id="reportPeriodSelect" onchange="switchReportDateRange(this.value)" aria-label="Select report date range">
              <option value="30days" ${reportsViewState.dateRange === '30days' ? 'selected' : ''}>Last 30 Days</option>
              <option value="quarter" ${reportsViewState.dateRange === 'quarter' ? 'selected' : ''}>This Quarter (Q4)</option>
              <option value="ytd" ${reportsViewState.dateRange === 'ytd' ? 'selected' : ''}>FY 2025-26 (YTD)</option>
              <option value="all" ${reportsViewState.dateRange === 'all' ? 'selected' : ''}>All Historical</option>
            </select>

            <!-- Secondary Filter (Dynamic per report) -->
            ${reportData.secondaryFilterHTML}

            <!-- Search Filter -->
            <input type="text" class="form-input form-input--search" placeholder="Search report..." style="width: 180px; font-size: 12px;" value="${reportsViewState.searchQuery}" oninput="handleReportSearch(this.value)">
          </div>
        </div>
      </div>

      <!-- Report KPI Summary Cards -->
      <div class="kpi-grid">
        ${reportData.kpis.map(kpi => `
          <div class="kpi-card">
            <span class="kpi-label">${kpi.label}</span>
            <div class="kpi-value" style="${kpi.color ? `color: ${kpi.color};` : ''}">${kpi.value}</div>
            <div class="kpi-subtext">${kpi.subtext}</div>
          </div>
        `).join("")}
      </div>

      <!-- Visual Chart Section -->
      ${reportData.chartHTML}

      <!-- Report Data Table -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <div class="card-title">${reportData.title}</div>
            <div class="card-subtitle">${reportData.subtitle}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge--neutral">${reportData.filteredCount} / ${reportData.totalCount} Records</span>
            <button class="btn btn--outline btn--sm" onclick="exportCurrentReportCSV()">
              Download CSV
            </button>
          </div>
        </div>

        <div class="card-body" style="padding: 0;">
          <table class="data-table" style="width: 100%; min-width: 900px;">
            <thead>
              <tr>
                ${reportData.columns.map(c => `<th>${c}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${reportData.rowsHTML}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

/**
 * Filter Date Utilities
 */
function isDateInReportRange(dateStr, range) {
  if (!dateStr || range === "all") return true;
  const d = new Date(dateStr).getTime();
  const now = new Date("2026-11-06T20:00:00").getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (range === "30days") {
    return (now - d) <= (30 * oneDay) && (now - d) >= 0;
  }
  if (range === "quarter") {
    return (now - d) <= (90 * oneDay) && (now - d) >= 0;
  }
  if (range === "ytd") {
    const startOfYear = new Date("2026-01-01T00:00:00").getTime();
    return d >= startOfYear;
  }
  return true;
}

/**
 * Switch Report Sub-Tab
 */
function switchReportType(type) {
  reportsViewState.activeReportType = type;
  reportsViewState.secondaryFilter = "all";
  renderReportsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.switchReportType = switchReportType;

/**
 * Switch Date Range
 */
function switchReportDateRange(range) {
  reportsViewState.dateRange = range;
  renderReportsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.switchReportDateRange = switchReportDateRange;

/**
 * Switch Secondary Filter
 */
function switchSecondaryReportFilter(val) {
  reportsViewState.secondaryFilter = val;
  renderReportsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.switchSecondaryReportFilter = switchSecondaryReportFilter;

/**
 * Handle Search Input
 */
function handleReportSearch(q) {
  reportsViewState.searchQuery = q.toLowerCase().trim();
  renderReportsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.handleReportSearch = handleReportSearch;

/**
 * Compute Active Report Payload
 */
function getActiveReportData() {
  const type = reportsViewState.activeReportType;
  const dateRange = reportsViewState.dateRange;
  const secFilter = reportsViewState.secondaryFilter;
  const query = (reportsViewState.searchQuery || "").toLowerCase().trim();

  const allChallans = StorageManager.getChallans();
  const allVehicles = StorageManager.getVehicles();
  const allPayments = StorageManager.getPayments();
  const allRecoveries = StorageManager.getRecoveries();

  // --------------------------------------------------------------------------
  // 1. CHALLAN SUMMARY REPORT
  // --------------------------------------------------------------------------
  if (type === "challan_summary") {
    let records = allChallans.filter(c => isDateInReportRange(c.offenceDate, dateRange));
    const totalCount = records.length;

    if (secFilter !== "all") {
      records = records.filter(c => c.status === secFilter);
    }
    if (query) {
      records = records.filter(c =>
        c.challanNumber.toLowerCase().includes(query) ||
        c.vehicleReg.toLowerCase().includes(query) ||
        c.offence.toLowerCase().includes(query)
      );
    }

    const totalAmount = records.reduce((sum, c) => sum + (c.amount || 0), 0);
    const unassignedCount = records.filter(c => c.status === "unassigned").length;
    const paidCount = records.filter(c => c.status === "paid").length;
    const avgFine = records.length > 0 ? Math.round(totalAmount / records.length) : 0;

    // Build Structured Infraction Categories Analysis
    const categoryStats = {};
    records.forEach(c => {
      // Clean full category name without artificial 24-character substring truncation
      let cleanName = c.offence.split("(")[0].split("/")[0].trim();
      if (!cleanName) cleanName = "General Traffic Violation";
      
      let section = c.mvActSection ? c.mvActSection.replace(/Motor Vehicles Act.*/i, "").trim() : "MV Act";
      if (!section) section = "MV Act";

      if (!categoryStats[cleanName]) {
        categoryStats[cleanName] = {
          name: cleanName,
          section: section,
          count: 0,
          totalAmount: 0
        };
      }
      categoryStats[cleanName].count += 1;
      categoryStats[cleanName].totalAmount += (c.amount || 0);
    });

    const sortedCategories = Object.values(categoryStats).sort((a, b) => b.count - a.count).slice(0, 5);
    const totalSetCount = records.length || 1;

    function getCategoryVisualMeta(name) {
      const lower = name.toLowerCase();
      if (lower.includes("speed")) {
        return { icon: Utils.icon('sliders', 13), color: "#1D4ED8", bg: "rgba(29, 78, 216, 0.08)", label: "Speed Compliance" };
      }
      if (lower.includes("dangerous") || lower.includes("red light") || lower.includes("signal")) {
        return { icon: Utils.icon('alert', 13), color: "#B91C1C", bg: "rgba(185, 28, 28, 0.08)", label: "Critical Safety" };
      }
      if (lower.includes("seat") || lower.includes("belt") || lower.includes("helmet")) {
        return { icon: Utils.icon('shield', 13), color: "#6D28D9", bg: "rgba(109, 40, 217, 0.08)", label: "Occupant Safety" };
      }
      if (lower.includes("weight") || lower.includes("overload") || lower.includes("axle")) {
        return { icon: Utils.icon('scale', 13), color: "#B45309", bg: "rgba(180, 83, 9, 0.08)", label: "Payload Limit" };
      }
      if (lower.includes("parking") || lower.includes("obstruct")) {
        return { icon: Utils.icon('truck', 13), color: "#0369A1", bg: "rgba(3, 105, 161, 0.08)", label: "Parking & Transit" };
      }
      if (lower.includes("puc") || lower.includes("pollution") || lower.includes("smoke")) {
        return { icon: Utils.icon('check', 13), color: "#15803D", bg: "rgba(21, 128, 61, 0.08)", label: "Emissions" };
      }
      return { icon: Utils.icon('shield', 13), color: "#52525B", bg: "rgba(82, 82, 91, 0.08)", label: "Regulatory" };
    }

    // Circumference for r=38 circle: 2 * pi * 38 = 238.761
    const circumference = 2 * Math.PI * 38;
    let cumulativeOffset = 0;
    const slices = [...sortedCategories];
    const topSum = slices.reduce((s, c) => s + c.count, 0);
    const otherCount = records.length - topSum;

    if (otherCount > 0) {
      const otherAmount = records.reduce((s, c) => s + (c.amount || 0), 0) - slices.reduce((s, c) => s + c.totalAmount, 0);
      slices.push({
        name: "Other Infractions",
        section: "Various",
        count: otherCount,
        totalAmount: Math.max(0, otherAmount),
        isOther: true
      });
    }

    const donutArcsHTML = records.length === 0 ? "" : slices.map(slice => {
      const meta = slice.isOther ? { color: "#D1D5DB" } : getCategoryVisualMeta(slice.name);
      const ratio = slice.count / totalSetCount;
      const strokeLength = ratio * circumference;
      const strokeGap = circumference - strokeLength;
      const offset = -cumulativeOffset;
      cumulativeOffset += strokeLength;
      return `<circle cx="50" cy="50" r="38" fill="none" stroke="${meta.color}" stroke-width="11" stroke-dasharray="${strokeLength.toFixed(2)} ${strokeGap.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" stroke-linecap="butt" />`;
    }).join("");

    const rowsHTML = sortedCategories.length === 0 ? `
      <div style="color: var(--text-3); font-size: 12px; padding: 14px 0;">No infractions recorded for current filters.</div>
    ` : sortedCategories.map(cat => {
      const meta = getCategoryVisualMeta(cat.name);
      const truePct = Math.round((cat.count / totalSetCount) * 100);
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 3px 0; font-size: 12px;">
          <!-- Category Icon + Full Name + Section Tag -->
          <div style="display: flex; align-items: center; gap: 7px; width: 220px; flex-shrink: 0; min-width: 0;">
            <span style="font-size: 13px; line-height: 1; flex-shrink: 0;">${meta.icon}</span>
            <span style="font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;" title="${cat.name}">
              ${cat.name}
            </span>
            <span class="badge badge--neutral" style="font-size: 9.5px; padding: 1px 5px; font-family: var(--font-family-mono); flex-shrink: 0; line-height: 1.2;">
              ${cat.section}
            </span>
          </div>

          <!-- Scalable Proportional Bar -->
          <div style="flex: 1; height: 5px; background: var(--surface-3); border-radius: 9999px; overflow: hidden; min-width: 50px;">
            <div style="width: ${truePct}%; height: 100%; background: ${meta.color}; border-radius: 9999px;"></div>
          </div>

          <!-- Counts & Amount -->
          <div style="display: flex; align-items: center; gap: 8px; width: 145px; justify-content: flex-end; flex-shrink: 0; font-variant-numeric: tabular-nums;">
            <span style="font-size: 11.5px; color: var(--text-2); font-weight: 500;">
              ${cat.count} <span style="font-size: 10px; color: var(--text-3);">${cat.count === 1 ? 'ticket' : 'tickets'}</span> <strong style="color: var(--ink);">(${truePct}%)</strong>
            </span>
            <span style="font-size: 11.5px; font-weight: 700; color: var(--ink); min-width: 50px; text-align: right;">
              ${Utils.formatINR(cat.totalAmount)}
            </span>
          </div>
        </div>
      `;
    }).join("");

    const chartHTML = `
      <div class="card" style="padding: 14px 18px; border-radius: var(--radius-card); border: 1px solid var(--line); background: var(--surface); margin-bottom: var(--space-3);">
        
        <!-- Compact Header Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--line); flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13.5px; color: var(--ink); letter-spacing: -0.01em;">
              Top Infraction Categories Distribution
            </span>
            <span class="badge badge--neutral" style="font-size: 10px; padding: 2px 7px; border-radius: 9999px;">
              ${records.length} Filtered Violations
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 11.5px; color: var(--text-2);">
            <span>Avg Fine: <strong style="color: var(--ink);">${Utils.formatINR(avgFine)}</strong></span>
            <span>•</span>
            <span>Total Exposure: <strong style="color: var(--color-primary);">${Utils.formatINR(totalAmount)}</strong></span>
          </div>
        </div>

        <!-- Scalable Donut + Mini Gauges Split View -->
        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          
          <!-- Left: SVG Mini Donut (92x92px) -->
          <div style="position: relative; width: 92px; height: 92px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
            <svg width="92" height="92" viewBox="0 0 100 100" style="transform: rotate(-90deg); transform-origin: 50% 50%;">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--surface-3)" stroke-width="11" />
              ${donutArcsHTML}
            </svg>
            <div style="position: absolute; text-align: center; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span style="font-size: 17px; font-weight: 800; color: var(--ink); line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums;">
                ${records.length}
              </span>
              <span style="font-size: 8px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;">
                TOTAL
              </span>
            </div>
          </div>

          <!-- Right: Compact Scalable Bars -->
          <div style="flex: 1; min-width: 320px; display: flex; flex-direction: column; gap: 4px;">
            ${rowsHTML}
          </div>

        </div>

      </div>
    `;

    return {
      title: "Challan Summary & Infraction Breakdown",
      subtitle: "Aggregated violation metrics across statutory sections, authorities, and liability",
      totalCount: totalCount,
      filteredCount: records.length,
      columns: ["Challan Number", "Vehicle Reg", "Infraction", "MV Act Section", "Offence Date", "Amount", "Status", "Attributed Party"],
      secondaryFilterHTML: `
        <select class="form-select" style="width: 140px; font-size: 12px;" onchange="switchSecondaryReportFilter(this.value)">
          <option value="all" ${secFilter === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="unassigned" ${secFilter === 'unassigned' ? 'selected' : ''}>Unassigned</option>
          <option value="assigned" ${secFilter === 'assigned' ? 'selected' : ''}>Assigned</option>
          <option value="pending" ${secFilter === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="disputed" ${secFilter === 'disputed' ? 'selected' : ''}>Disputed</option>
          <option value="court" ${secFilter === 'court' ? 'selected' : ''}>Court</option>
          <option value="paid" ${secFilter === 'paid' ? 'selected' : ''}>Paid</option>
        </select>
      `,
      kpis: [
        { label: "Total Infractions", value: records.length, subtext: "In selected time horizon" },
        { label: "Gross Fine Volume", value: Utils.formatINR(totalAmount), subtext: "Cumulative statutory fine" },
        { label: "Unassigned Triage", value: unassignedCount, color: "var(--status-unassigned)", subtext: "Awaiting liability sign-off" },
        { label: "Average Penalty", value: Utils.formatINR(avgFine), color: "var(--color-primary)", subtext: "Per infraction ticket" }
      ],
      chartHTML: chartHTML,
      rows: records,
      exportFilename: "challan-summary-report.csv",
      rowsHTML: records.map(c => `
        <tr>
          <td><strong style="color: var(--ink); font-family: var(--font-family-mono); font-size: 12.5px;">${c.challanNumber}</strong></td>
          <td><span class="plate-chip plate-chip--commercial">${c.vehicleReg}</span></td>
          <td>${c.offence}</td>
          <td class="font-mono text-xs">${c.mvActSection || 'Sec 183'}</td>
          <td>${Utils.formatDate(c.offenceDate)}</td>
          <td><strong>${Utils.formatINR(c.amount)}</strong></td>
          <td>${Utils.getStatusBadgeHTML(c.status)}</td>
          <td><span class="badge ${c.responsibleParty === 'Driver' ? 'badge--assigned' : 'badge--pending'}">${c.responsibleParty || 'Unassigned'}</span></td>
        </tr>
      `).join("")
    };
  }

  // --------------------------------------------------------------------------
  // 2. VEHICLE SUMMARY REPORT
  // --------------------------------------------------------------------------
  if (type === "vehicle_compliance") {
    let records = allVehicles;
    const totalCount = records.length;

    if (secFilter !== "all") {
      records = records.filter(v => v.category === secFilter);
    }
    if (query) {
      records = records.filter(v =>
        v.regNumber.toLowerCase().includes(query) ||
        v.makeModel.toLowerCase().includes(query) ||
        (v.ownerName && v.ownerName.toLowerCase().includes(query))
      );
    }

    const cleanVehicles = records.filter(v => (v.openChallans || 0) === 0).length;
    const totalOutstanding = records.reduce((sum, v) => sum + (v.outstandingAmount || 0), 0);
    const avgFinePerVehicle = records.length > 0 ? Math.round(totalOutstanding / records.length) : 0;

    // Chart: Top High-Risk Vehicles by Outstanding Fines
    const topRiskVehicles = [...records].sort((a, b) => (b.outstandingAmount || 0) - (a.outstandingAmount || 0)).slice(0, 5);
    const maxRiskFine = topRiskVehicles.length > 0 && topRiskVehicles[0].outstandingAmount > 0 ? topRiskVehicles[0].outstandingAmount : 1;

    const chartHTML = `
      <div class="card" style="padding: 16px 20px;">
        <div style="font-weight: 700; font-size: 13px; color: var(--color-text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          ${Utils.icon('truck', 14)} Highest Fine Exposure Vehicles (Top Risk Assets)
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${topRiskVehicles.map(v => {
            const fine = v.outstandingAmount || 0;
            const pct = Math.round((fine / maxRiskFine) * 100);
            return `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                  <span style="font-weight: 600; color: var(--color-primary);">${v.regNumber} (${v.makeModel})</span>
                  <strong style="color: #B42318;">${Utils.formatINR(fine)} (${v.openChallans || 0} open fines)</strong>
                </div>
                <div style="height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: #B42318; border-radius: 4px;"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    return {
      title: "Vehicle Fleet Compliance & Fine Exposure",
      subtitle: "Asset-level fine concentration, vehicle documentation fitness, and fleet risk rating",
      totalCount: totalCount,
      filteredCount: records.length,
      columns: ["Registration No", "Make & Model", "Category", "Open Fines", "Outstanding Amount", "PUC Expiry", "Insurance Expiry", "Compliance Health"],
      secondaryFilterHTML: `
        <select class="form-select" style="width: 150px; font-size: 12px;" onchange="switchSecondaryReportFilter(this.value)">
          <option value="all" ${secFilter === 'all' ? 'selected' : ''}>All Categories</option>
          <option value="Light Commercial Vehicle (LCV)" ${secFilter === 'Light Commercial Vehicle (LCV)' ? 'selected' : ''}>LCV</option>
          <option value="Mini Truck" ${secFilter === 'Mini Truck' ? 'selected' : ''}>Mini Truck</option>
          <option value="Pickup Truck" ${secFilter === 'Pickup Truck' ? 'selected' : ''}>Pickup Truck</option>
          <option value="Delivery Van" ${secFilter === 'Delivery Van' ? 'selected' : ''}>Delivery Van</option>
        </select>
      `,
      kpis: [
        { label: "Monitored Fleet Assets", value: records.length, subtext: "Active commercial vehicles" },
        { label: "Zero-Violation Assets", value: `${Math.round((cleanVehicles / (records.length || 1)) * 100)}%`, color: "var(--status-paid)", subtext: `${cleanVehicles} vehicles clean` },
        { label: "Total Fleet Liability", value: Utils.formatINR(totalOutstanding), color: "#B42318", subtext: "Aggregated outstanding fines" },
        { label: "Avg Fine / Asset", value: Utils.formatINR(avgFinePerVehicle), subtext: "Target benchmark: < ₹1,500" }
      ],
      chartHTML: chartHTML,
      rows: records,
      exportFilename: "vehicle-compliance-summary.csv",
      rowsHTML: records.map(v => {
        const score = Math.max(30, 100 - (v.openChallans || 0) * 20);
        return `
          <tr>
            <td><strong style="color: var(--color-primary);">${v.regNumber}</strong></td>
            <td>${v.makeModel}</td>
            <td><span class="badge badge--neutral">${v.category}</span></td>
            <td><strong>${v.openChallans || 0}</strong></td>
            <td style="font-weight: 600; color: ${(v.outstandingAmount || 0) > 0 ? '#B42318' : 'inherit'};">
              ${Utils.formatINR(v.outstandingAmount || 0)}
            </td>
            <td>${Utils.formatDate(v.pucExpiry)}</td>
            <td>${Utils.formatDate(v.insuranceExpiry)}</td>
            <td>
              <span class="badge ${score >= 80 ? 'badge--paid' : (score >= 60 ? 'badge--pending' : 'badge--unassigned')}">
                ${score}% Health
              </span>
            </td>
          </tr>
        `;
      }).join("")
    };
  }

  // --------------------------------------------------------------------------
  // 3. PAYMENT SUMMARY REPORT
  // --------------------------------------------------------------------------
  if (type === "payment_ledger") {
    let records = allChallans.filter(c => (c.status === "paid" || c.paymentStatus === "Paid") && isDateInReportRange(c.paymentDate || c.offenceDate, dateRange));
    const totalCount = records.length;

    if (secFilter !== "all") {
      records = records.filter(c => (c.paymentMethod || "UPI").toLowerCase().includes(secFilter.toLowerCase()));
    }
    if (query) {
      records = records.filter(c =>
        c.challanNumber.toLowerCase().includes(query) ||
        c.vehicleReg.toLowerCase().includes(query) ||
        (c.receiptNumber && c.receiptNumber.toLowerCase().includes(query)) ||
        (c.transactionReference && c.transactionReference.toLowerCase().includes(query))
      );
    }

    const totalSettled = records.reduce((sum, c) => sum + (c.totalPayable || c.amount || 0), 0);
    const totalFees = records.reduce((sum, c) => sum + (c.convenienceFee || 25), 0);
    const avgSettled = records.length > 0 ? Math.round(totalSettled / records.length) : 0;

    // Chart: Rail Distribution
    const railCounts = {};
    records.forEach(c => {
      const rail = c.paymentMethod || "UPI";
      railCounts[rail] = (railCounts[rail] || 0) + 1;
    });

    const chartHTML = `
      <div class="card" style="padding: 16px 20px;">
        <div style="font-weight: 700; font-size: 13px; color: var(--color-text-main); margin-bottom: 12px;">
          💳 Settlement Rail Volume Breakdown
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          ${Object.entries(railCounts).map(([rail, count]) => `
            <div style="padding: 12px; background: var(--color-bg-app); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
              <span class="text-xs text-muted" style="display: block;">${rail}</span>
              <strong style="font-size: 18px; color: var(--color-primary);">${count} transactions</strong>
              <div class="text-xs text-muted">${Math.round((count / (records.length || 1)) * 100)}% of total settlements</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    return {
      title: "Payment Settlement & Gateway Summary",
      subtitle: "Verified statutory transaction records, convenience fees, and settlement rails",
      totalCount: totalCount,
      filteredCount: records.length,
      columns: ["Receipt Number", "Challan No", "Vehicle Asset", "Settled Date", "Paid Amount", "Payment Rail", "Transaction Ref", "Payer Entity", "Recovery Allocation"],
      secondaryFilterHTML: `
        <select class="form-select" style="width: 140px; font-size: 12px;" onchange="switchSecondaryReportFilter(this.value)">
          <option value="all" ${secFilter === 'all' ? 'selected' : ''}>All Rails</option>
          <option value="UPI" ${secFilter === 'UPI' ? 'selected' : ''}>UPI</option>
          <option value="Net Banking" ${secFilter === 'Net Banking' ? 'selected' : ''}>Net Banking</option>
          <option value="Corporate Card" ${secFilter === 'Corporate Card' ? 'selected' : ''}>Card</option>
          <option value="Prepaid Fleet Credit" ${secFilter === 'Prepaid Fleet Credit' ? 'selected' : ''}>Prepaid</option>
        </select>
      `,
      kpis: [
        { label: "Total Settled (Direct)", value: Utils.formatINR(totalSettled), color: "var(--status-paid)", subtext: "Cash settled to authorities" },
        { label: "Settlement Vouchers", value: records.length, subtext: "Digitally certified receipts" },
        { label: "Gateway Fees Paid", value: Utils.formatINR(totalFees), subtext: "Statutory portal fees" },
        { label: "Average Settlement", value: Utils.formatINR(avgSettled), subtext: "Per resolved infraction" }
      ],
      chartHTML: chartHTML,
      rows: records,
      exportFilename: "payment-settlement-summary.csv",
      rowsHTML: records.map(c => `
        <tr>
          <td><strong style="color: var(--color-primary); cursor: pointer;" onclick="openReceiptModal('${c.id}')">${c.receiptNumber || 'RCPT-2026-000'}</strong></td>
          <td><strong>${c.challanNumber}</strong></td>
          <td><strong>${c.vehicleReg}</strong></td>
          <td>${Utils.formatDate(c.paymentDate || c.offenceDate, true)}</td>
          <td><strong>${Utils.formatINR(c.totalPayable || c.amount)}</strong></td>
          <td><span class="badge badge--neutral">${c.paymentMethod || 'UPI'}</span></td>
          <td class="font-mono text-xs">${c.transactionReference || 'TXN-PARIVAHAN-000'}</td>
          <td>${c.payerType || 'Apex Fleet Pvt Ltd'}</td>
          <td><span class="badge badge--assigned">${c.recoveryParty || c.responsiblePartyName || 'Driver'}</span></td>
        </tr>
      `).join("")
    };
  }

  // --------------------------------------------------------------------------
  // 4. OUTSTANDING SUMMARY REPORT
  // --------------------------------------------------------------------------
  if (type === "outstanding_summary") {
    let records = allChallans.filter(c => c.status !== "paid");
    const totalCount = records.length;

    if (secFilter === "due_7_days") {
      records = records.filter(c => {
        const days = Utils.getDaysRemaining(c.dueDate);
        return days <= 7 && days >= 0;
      });
    } else if (secFilter === "overdue") {
      records = records.filter(c => Utils.getDaysRemaining(c.dueDate) < 0);
    } else if (secFilter === "court") {
      records = records.filter(c => c.status === "court");
    }

    if (query) {
      records = records.filter(c =>
        c.challanNumber.toLowerCase().includes(query) ||
        c.vehicleReg.toLowerCase().includes(query) ||
        c.offence.toLowerCase().includes(query)
      );
    }

    const totalOutstanding = records.reduce((sum, c) => sum + (c.totalPayable || c.amount || 0), 0);
    const urgentCount = records.filter(c => Utils.getDaysRemaining(c.dueDate) <= 7 && Utils.getDaysRemaining(c.dueDate) >= 0).length;
    const overdueCount = records.filter(c => Utils.getDaysRemaining(c.dueDate) < 0).length;
    const courtStayCount = records.filter(c => c.status === "court").length;

    const chartHTML = `
      <div class="card" style="padding: 16px 20px;">
        <div style="font-weight: 700; font-size: 13px; color: var(--color-text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          ${Utils.icon('clock', 14)} Outstanding Liability Aging &amp; Impoundment Risk Horizon
        </div>
        <div style="display: flex; gap: 8px; height: 28px; border-radius: 6px; overflow: hidden; background: var(--color-border);">
          <div style="width: ${Math.max(15, Math.round((urgentCount / (records.length || 1)) * 100))}%; background: #F79009; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;" title="Urgent (< 7 Days)">
            Urgent (${urgentCount})
          </div>
          <div style="width: ${Math.max(15, Math.round((overdueCount / (records.length || 1)) * 100))}%; background: #D92D20; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;" title="Overdue">
            Overdue (${overdueCount})
          </div>
          <div style="flex: 1; background: #475467; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;" title="Court / Future Due">
            Court Stay / Standard (${records.length - urgentCount - overdueCount})
          </div>
        </div>
      </div>
    `;

    return {
      title: "Outstanding Liability & Aging Analysis",
      subtitle: "Impoundment risk monitoring, upcoming statutory deadlines, and court-frozen fines",
      totalCount: totalCount,
      filteredCount: records.length,
      columns: ["Challan Number", "Vehicle Reg", "Infraction", "Base Fine", "Late Fee", "Total Payable", "Statutory Due Date", "Deadline Urgency", "Responsible Party", "Action"],
      secondaryFilterHTML: `
        <select class="form-select" style="width: 160px; font-size: 12px;" onchange="switchSecondaryReportFilter(this.value)">
          <option value="all" ${secFilter === 'all' ? 'selected' : ''}>All Outstanding</option>
          <option value="due_7_days" ${secFilter === 'due_7_days' ? 'selected' : ''}>Due in < 7 Days</option>
          <option value="overdue" ${secFilter === 'overdue' ? 'selected' : ''}>Overdue Penalties</option>
          <option value="court" ${secFilter === 'court' ? 'selected' : ''}>Under Court Stay</option>
        </select>
      `,
      kpis: [
        { label: "Active Liability", value: Utils.formatINR(totalOutstanding), color: "#B42318", subtext: "Total unpaid fine exposure" },
        { label: "Critical (< 7 Days)", value: urgentCount, color: "#F79009", subtext: "Impoundment risk notices" },
        { label: "Overdue Notices", value: overdueCount, color: "#D92D20", subtext: "Late fees accumulating" },
        { label: "Court Stay Frozen", value: courtStayCount, color: "var(--status-court)", subtext: "Sub-judice court dockets" }
      ],
      chartHTML: chartHTML,
      rows: records,
      exportFilename: "outstanding-liability-summary.csv",
      rowsHTML: records.map(c => {
        const daysLeft = Utils.getDaysRemaining(c.dueDate);
        const isCourt = c.status === "court";
        return `
          <tr>
            <td><strong style="color: var(--color-primary);">${c.challanNumber}</strong></td>
            <td><strong>${c.vehicleReg}</strong></td>
            <td>${c.offence}</td>
            <td>${Utils.formatINR(c.amount)}</td>
            <td style="color: (c.lateFee || 0) > 0 ? '#B42318' : 'inherit';">${Utils.formatINR(c.lateFee || 0)}</td>
            <td><strong>${Utils.formatINR(c.totalPayable || (c.amount + (c.lateFee || 0) + (c.convenienceFee || 25)))}</strong></td>
            <td>${Utils.formatDate(c.dueDate)}</td>
            <td>
              ${isCourt ? `
                <span class="badge badge--court">Court Stay Active</span>
              ` : (daysLeft < 0 ? `
                <span class="badge badge--unassigned">Overdue (${Math.abs(daysLeft)}d)</span>
              ` : (daysLeft <= 7 ? `
                <span class="badge badge--pending">Due in ${daysLeft}d</span>
              ` : `
                <span class="text-xs text-muted">${daysLeft} days left</span>
              `))}
            </td>
            <td><span class="badge badge--assigned">${c.responsibleParty || 'Unassigned'}</span></td>
            <td>
              ${isCourt ? `
                <button class="btn btn--outline btn--sm" onclick="openCourtCaseModal('${c.id}')">Court Order</button>
              ` : `
                <button class="btn btn--primary btn--sm" onclick="openPaymentModal('${c.id}')">Settle</button>
              `}
            </td>
          </tr>
        `;
      }).join("")
    };
  }

  // --------------------------------------------------------------------------
  // 5. RECOVERY LEDGER REPORT
  // --------------------------------------------------------------------------
  if (type === "recovery_ledger") {
    let records = allRecoveries;
    const totalCount = records.length;

    if (secFilter !== "all") {
      records = records.filter(r => r.recoveryMethod === secFilter);
    }
    if (query) {
      records = records.filter(r =>
        r.challanNumber.toLowerCase().includes(query) ||
        r.vehicleReg.toLowerCase().includes(query) ||
        r.responsiblePartyName.toLowerCase().includes(query) ||
        (r.cycleRef && r.cycleRef.toLowerCase().includes(query))
      );
    }

    const totalRecoverable = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const payrollAmount = records.filter(r => r.recoveryMethod === "Payroll deduction").reduce((sum, r) => sum + (r.amount || 0), 0);
    const invoiceAmount = records.filter(r => r.recoveryMethod === "Invoice").reduce((sum, r) => sum + (r.amount || 0), 0);
    const writeOffAmount = records.filter(r => r.recoveryMethod === "Write-off" || r.recoveryStatus === "Written Off").reduce((sum, r) => sum + (r.amount || 0), 0);

    const chartHTML = `
      <div class="card" style="padding: 16px 20px;">
        <div style="font-weight: 700; font-size: 13px; color: var(--color-text-main); margin-bottom: 12px;">
          📈 Recovery Channel Allocation Breakdown
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div style="padding: 12px; background: #FEF8E8; border-radius: 6px; border: 1px solid #FCE4A6;">
            <span class="text-xs" style="color: #B7791F; font-weight: 600;">Driver Payroll Recovery</span>
            <div style="font-size: 20px; font-weight: 800; color: #B7791F; margin: 4px 0;">${Utils.formatINR(payrollAmount)}</div>
            <div class="text-xs text-muted">${Math.round((payrollAmount / (totalRecoverable || 1)) * 100)}% of total recovery</div>
          </div>
          <div style="padding: 12px; background: #EEF4FF; border-radius: 6px; border: 1px solid #D0E1FD;">
            <span class="text-xs" style="color: var(--color-primary); font-weight: 600;">Corporate Lessee Invoicing</span>
            <div style="font-size: 20px; font-weight: 800; color: var(--color-primary); margin: 4px 0;">${Utils.formatINR(invoiceAmount)}</div>
            <div class="text-xs text-muted">${Math.round((invoiceAmount / (totalRecoverable || 1)) * 100)}% of total recovery</div>
          </div>
          <div style="padding: 12px; background: var(--color-bg-app); border-radius: 6px; border: 1px solid var(--color-border);">
            <span class="text-xs text-muted font-medium">Fleet Absorbed / Written-off</span>
            <div style="font-size: 20px; font-weight: 800; color: var(--color-text-main); margin: 4px 0;">${Utils.formatINR(writeOffAmount)}</div>
            <div class="text-xs text-muted">${Math.round((writeOffAmount / (totalRecoverable || 1)) * 100)}% non-recoverable</div>
          </div>
        </div>
      </div>
    `;

    return {
      title: "Downstream Financial Recovery Ledger",
      subtitle: "Tracks recovery of upfront pre-funded fines via driver payroll deduction or corporate invoicing",
      totalCount: totalCount,
      filteredCount: records.length,
      columns: ["Recovery ID", "Challan Number", "Vehicle Asset", "Payer (Apex Fleet)", "Recovery Target", "Channel", "Billing / Salary Cycle", "Recoverable Amount", "Status"],
      secondaryFilterHTML: `
        <select class="form-select" style="width: 170px; font-size: 12px;" onchange="switchSecondaryReportFilter(this.value)">
          <option value="all" ${secFilter === 'all' ? 'selected' : ''}>All Channels</option>
          <option value="Payroll deduction" ${secFilter === 'Payroll deduction' ? 'selected' : ''}>Payroll Deduction</option>
          <option value="Invoice" ${secFilter === 'Invoice' ? 'selected' : ''}>Corporate Invoice</option>
          <option value="Write-off" ${secFilter === 'Write-off' ? 'selected' : ''}>Write-off / Absorbed</option>
        </select>
      `,
      kpis: [
        { label: "Total Pre-Funded", value: Utils.formatINR(totalRecoverable), subtext: "Settled upfront by Apex Fleet" },
        { label: "Queued for Payroll", value: Utils.formatINR(payrollAmount), color: "#B7791F", subtext: "Driver salary recovery" },
        { label: "Lessee Invoiced", value: Utils.formatINR(invoiceAmount), color: "var(--color-primary)", subtext: "Corporate leasing billing" },
        { label: "Written Off", value: Utils.formatINR(writeOffAmount), subtext: "Absorbed operational fine" }
      ],
      chartHTML: chartHTML,
      rows: records,
      exportFilename: "recovery-ledger-report.csv",
      rowsHTML: records.map(r => `
        <tr>
          <td><strong class="font-mono text-xs" style="color: var(--color-primary);">${r.id}</strong></td>
          <td><strong>${r.challanNumber}</strong></td>
          <td><strong style="color: var(--color-primary);">${r.vehicleReg}</strong></td>
          <td>${r.payer || 'Apex Fleet Pvt Ltd'}</td>
          <td><strong>${r.responsiblePartyName}</strong></td>
          <td><span class="badge ${r.recoveryMethod === 'Payroll deduction' ? 'badge--assigned' : 'badge--pending'}">${r.recoveryMethod}</span></td>
          <td class="font-mono text-xs">${r.cycleRef || 'Nov 2026'}</td>
          <td><strong>${Utils.formatINR(r.amount)}</strong></td>
          <td><span class="badge ${r.recoveryStatus === 'Deducted' || r.recoveryStatus === 'Invoiced' ? 'badge--paid' : 'badge--neutral'}">${r.recoveryStatus}</span></td>
        </tr>
      `).join("")
    };
  }

  // --------------------------------------------------------------------------
  // 6. RESPONSIBILITY SUMMARY REPORT
  // --------------------------------------------------------------------------
  let records = allChallans;
  const totalCount = records.length;

  if (secFilter === "conflicts") {
    records = records.filter(c => c.hasConflict || c.status === "unassigned");
  } else if (secFilter === "driver") {
    records = records.filter(c => c.responsibleParty === "Driver");
  } else if (secFilter === "lessee") {
    records = records.filter(c => c.responsibleParty === "Lessee");
  }

  if (query) {
    records = records.filter(c =>
      c.challanNumber.toLowerCase().includes(query) ||
      c.vehicleReg.toLowerCase().includes(query) ||
      (c.responsiblePartyName && c.responsiblePartyName.toLowerCase().includes(query))
    );
  }

  const driverCount = records.filter(c => c.responsibleParty === "Driver").length;
  const lesseeCount = records.filter(c => c.responsibleParty === "Lessee").length;
  const fleetCount = records.filter(c => c.responsibleParty === "Fleet Operator").length;
  const unassignedCount = records.filter(c => !c.responsibleParty || c.responsibleParty === "Unassigned").length;

  const chartHTML = `
    <div class="card" style="padding: 16px 20px;">
      <div style="font-weight: 700; font-size: 13px; color: var(--color-text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        ${Utils.icon('scale', 14)} 5-Tier Responsibility Engine Attribution Distribution
      </div>
      <div style="display: flex; gap: 8px; height: 28px; border-radius: 6px; overflow: hidden; background: var(--color-border);">
        <div style="width: ${Math.max(10, Math.round((driverCount / (records.length || 1)) * 100))}%; background: var(--color-primary); color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
          Driver (${driverCount})
        </div>
        <div style="width: ${Math.max(10, Math.round((lesseeCount / (records.length || 1)) * 100))}%; background: #7452C8; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
          Lessee (${lesseeCount})
        </div>
        <div style="width: ${Math.max(10, Math.round((fleetCount / (records.length || 1)) * 100))}%; background: #475467; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
          Fleet (${fleetCount})
        </div>
        <div style="flex: 1; background: #D92D20; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
          Unassigned (${unassignedCount})
        </div>
      </div>
    </div>
  `;

  return {
    title: "Responsibility Engine Audit & Attribution Summary",
    subtitle: "5-Tier decision hierarchy audit trail, automated attribution confidence, and conflict quarantine",
    totalCount: totalCount,
    filteredCount: records.length,
    columns: ["Challan Number", "Vehicle Reg", "Offence Date", "Assigned Party", "Responsible Target Name", "Confidence Score", "Priority Tier", "Conflict Flag", "Audit Log Action"],
    secondaryFilterHTML: `
      <select class="form-select" style="width: 150px; font-size: 12px;" onchange="switchSecondaryReportFilter(this.value)">
        <option value="all" ${secFilter === 'all' ? 'selected' : ''}>All Attributions</option>
        <option value="conflicts" ${secFilter === 'conflicts' ? 'selected' : ''}>Quarantined Conflicts</option>
        <option value="driver" ${secFilter === 'driver' ? 'selected' : ''}>Driver Attributions</option>
        <option value="lessee" ${secFilter === 'lessee' ? 'selected' : ''}>Lessee Attributions</option>
      </select>
    `,
    kpis: [
      { label: "Custody Decisions", value: records.length, subtext: "Audited against duty logs" },
      { label: "Driver Attributed", value: driverCount, color: "var(--color-primary)", subtext: "Priority 2 trip allocations" },
      { label: "Lessee Contracted", value: lesseeCount, color: "#7452C8", subtext: "Priority 3 Clause 7.2 indemnity" },
      { label: "Quarantined Gaps", value: unassignedCount, color: "#D92D20", subtext: "Pending human sign-off" }
    ],
    chartHTML: chartHTML,
    rows: records,
    exportFilename: "responsibility-engine-summary.csv",
    rowsHTML: records.map(c => `
      <tr>
        <td><strong style="color: var(--color-primary);">${c.challanNumber}</strong></td>
        <td><strong>${c.vehicleReg}</strong></td>
        <td>${Utils.formatDate(c.offenceDate)}</td>
        <td><span class="badge ${c.responsibleParty === 'Driver' ? 'badge--assigned' : (c.responsibleParty === 'Lessee' ? 'badge--pending' : 'badge--neutral')}">${c.responsibleParty || 'Unassigned'}</span></td>
        <td><strong>${c.responsiblePartyName || 'Unassigned Triage'}</strong></td>
        <td><strong>${c.confidenceLevel || 88}%</strong></td>
        <td><span class="badge badge--neutral">${c.isManualOverride ? 'Priority 1 (Override)' : 'Priority 2/3 (Auto)'}</span></td>
        <td>${c.hasConflict ? '<span class="badge badge--unassigned">Conflict Quarantined</span>' : '<span class="badge badge--paid">Clean Attribution</span>'}</td>
        <td><span class="text-xs text-muted">${c.status}</span></td>
      </tr>
    `).join("")
  };
}

/**
 * Universal CSV Exporter for Active Report with Visual Loading State (Frontend Implementation Skill)
 */
function exportCurrentReportCSV(btn) {
  const triggerBtn = btn || document.querySelector("button[onclick*='exportCurrentReportCSV']");
  const origHTML = triggerBtn ? triggerBtn.innerHTML : "";
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `
      <svg class="sync-icon" width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="animation: spin 1s linear infinite;"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
      <span>Generating CSV...</span>
    `;
  }

  setTimeout(() => {
    const reportData = getActiveReportData();
    if (!reportData.rows || reportData.rows.length === 0) {
      Utils.showToast("No Data", "No report rows available to export.", "warning");
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = origHTML;
      }
      return;
    }
    Utils.exportToCSV(reportData.rows, reportData.exportFilename);
    Utils.showToast("Export Ready", `Generated official ledger: ${reportData.exportFilename}`, "success");
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = origHTML;
    }
  }, 350);
}
window.exportCurrentReportCSV = exportCurrentReportCSV;
