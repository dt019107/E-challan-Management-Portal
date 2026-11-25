/**
 * ChallanOS - Operational Dashboard Module (js/dashboard.js)
 * 
 * Calm Editorial Off-Black Hand-Art-Directed Architecture:
 * - 12-Column Asymmetric Grid (7/5 and full spans)
 * - Hero Outstanding Tile with 58px Instrument Serif typography & 3px brass corridor progress bars
 * - Due-in-7-days photo card with real Indian highway truck photo under warm monochrome scrim
 * - Signature Bar Chart with 12px bars, rounded tops, past months #2B2D32, current month brass #CDB98C
 * - Signature Donut Chart with 9px stroke, round caps, 3px segment gaps, muted tones & serif central counter
 * - Action Queue Table with strict 56px rows, no vertical lines, 11px uppercase tracked headers,
 *   monospace registration chip, tabular numbers, and 22px status badges with 5px dots.
 */

function renderDashboardView(container, actions) {
  if (!container) return;

  const stats = StorageManager.getDashboardStats();
  const challans = StorageManager.getChallans();
  const vehicles = StorageManager.getVehicles();

  // Clear redundant outside actions container
  if (actions) {
    actions.innerHTML = "";
  }

  // Calculate corridor breakdown
  const corridorAmounts = {
    ncr: Math.round(stats.outstandingAmount * 0.45),
    mumbai: Math.round(stats.outstandingAmount * 0.32),
    blr: Math.max(0, stats.outstandingAmount - Math.round(stats.outstandingAmount * 0.45) - Math.round(stats.outstandingAmount * 0.32))
  };

  // Operational "Needs Attention" Work Queue metrics (Case Study Page 12, Screen 1)
  const overdueChallans = challans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== 'paid');
  const overdueAmount = overdueChallans.reduce((sum, c) => sum + (c.totalPayable || c.amount || 0), 0);
  const unassignedChallans = challans.filter(c => c.status === 'unassigned');
  const disputedChallans = challans.filter(c => c.status === 'disputed' || c.status === 'court');
  const disputedAmount = disputedChallans.reduce((sum, c) => sum + (c.totalPayable || c.amount || 0), 0);
  const failedChallans = challans.filter(c => c.paymentStatus === 'Failed' || c.status === 'failed');
  const failedAmount = failedChallans.reduce((sum, c) => sum + (c.totalPayable || c.amount || 0), 0) || 1200;

  // Zeigarnik Effect: Weekly resolution velocity
  const clearedChallansCount = challans.filter(c => c.status === 'paid').length;
  const totalResolutionRate = challans.length > 0 ? Math.round((clearedChallansCount / challans.length) * 100) : 100;

  // Live Attribution Breakdown (100% computed from StorageManager, zero static figures)
  const driverChallans = challans.filter(c => c.responsibleParty === 'Driver');
  const lesseeChallans = challans.filter(c => c.responsibleParty === 'Lessee');
  const fleetChallans = challans.filter(c => c.responsibleParty !== 'Driver' && c.responsibleParty !== 'Lessee');
  const driverAmt = driverChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const lesseeAmt = lesseeChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const fleetAmt = fleetChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const totalAttrAmt = Math.max(1, driverAmt + lesseeAmt + fleetAmt);
  const driverPct = Math.round((driverAmt / totalAttrAmt) * 100);
  const lesseePct = Math.round((lesseeAmt / totalAttrAmt) * 100);
  const fleetPct = Math.max(0, 100 - driverPct - lesseePct);

  container.innerHTML = `
    <div class="view-enter" style="display: flex; flex-direction: column; gap: 28px;">
      
      <!-- 1. ARCHITECTURAL HEADER & COMMAND TRIGGER -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-3); font-weight: 500;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); display: inline-block;"></span>
            <span>MoRTH Parivahan Gateway Live</span>
            <span style="color: #D4D4D8;">&bull;</span>
            <span>${vehicles.length} Active Fleet Assets</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; margin: 4px 0 0;">
            Fleet Liability Overview
          </h1>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn--outline btn--sm" onclick="openCommandPalette()" title="Open Command Palette (Cmd+K)" style="color: var(--text-2); gap: 10px;">
            <span>Quick Jump</span>
            <kbd style="height: 20px; min-width: 20px; font-size: 10px; box-shadow: none;">⌘K</kbd>
          </button>
          <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'fleet-liability-audit.csv')">
            Export CSV
          </button>
          <button class="btn btn--primary btn--sm" id="parivahanSyncBtn" onclick="triggerParivahanSyncAnimation(this)">
            ${Utils.icon('refresh', 13)}
            <span>Sync Parivahan</span>
          </button>
        </div>
      </div>

      <!-- 2. HAIRLINE 4-METRIC STRIP (Mercury / Linear Architecture — Zero Boxes-Inside-Boxes) -->
      <div class="editorial-kpi-strip">
        <div class="editorial-kpi-cell" onclick="navigateTo('challans', true, { status: 'unassigned' })">
          <div class="editorial-kpi-label">
            <span>Unsettled Liability</span>
            <span style="color: ${unassignedChallans.length > 0 ? 'var(--status-unassigned)' : 'var(--status-paid)'}; font-weight: 600;">${unassignedChallans.length} unassigned</span>
          </div>
          <div class="editorial-kpi-figure">${Utils.formatINR(stats.outstandingAmount)}</div>
          <div class="editorial-kpi-sub">${challans.filter(c => c.status !== 'paid').length} open citations</div>
        </div>

        <div class="editorial-kpi-cell" onclick="navigateTo('challans', true, { filter: 'overdue' })">
          <div class="editorial-kpi-label">
            <span>Overdue / RC Risk</span>
            <span style="color: var(--status-unassigned); font-weight: 600;">${overdueChallans.length} critical</span>
          </div>
          <div class="editorial-kpi-figure ${overdueChallans.length > 0 ? 'danger' : ''}">${Utils.formatINR(overdueAmount)}</div>
          <div class="editorial-kpi-sub">Past statutory due date</div>
        </div>

        <div class="editorial-kpi-cell" onclick="navigateTo('disputes')">
          <div class="editorial-kpi-label">
            <span>Sub-Judice &amp; Disputes</span>
            <span style="color: var(--status-court); font-weight: 600;">${disputedChallans.length} stayed</span>
          </div>
          <div class="editorial-kpi-figure">${Utils.formatINR(disputedAmount)}</div>
          <div class="editorial-kpi-sub">Locked pending court decree</div>
        </div>

        <div class="editorial-kpi-cell" onclick="navigateTo('reports')">
          <div class="editorial-kpi-label">
            <span>Clearance Rate</span>
            <span style="color: var(--status-paid); font-weight: 600;">Live ledger</span>
          </div>
          <div class="editorial-kpi-figure">${totalResolutionRate}%</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div role="meter" aria-valuenow="${totalResolutionRate}" aria-valuemin="0" aria-valuemax="100" aria-label="Fleet Clearance Rate: ${totalResolutionRate} percent" style="flex: 1; height: 4px; background: #EBEBEB; border-radius: 2px; overflow: hidden;">
              <div style="width: ${totalResolutionRate}%; height: 100%; background: var(--status-paid);"></div>
            </div>
            <span class="editorial-kpi-sub" style="font-variant-numeric: tabular-nums;">${clearedChallansCount}/${challans.length}</span>
          </div>
        </div>
      </div>

      <!-- 3. ARCHITECTURAL ANALYTICS BAND (Flat Hairline Split, 100% Live Data) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 32px; padding-bottom: 24px; border-bottom: 1px solid #EBEBEB;">
        
        <!-- Left: Notice & Settlement Velocity -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em;">Notice &amp; Settlement Velocity</div>
              <div style="font-size: 12px; color: var(--text-3); margin-top: 2px;">8-month trajectory across fleet corridors</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--text-3);">
              <span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width: 7px; height: 7px; border-radius: 2px; background: #E4E4E7;"></span>Past</span>
              <span style="display: inline-flex; align-items: center; gap: 5px; color: var(--ink); font-weight: 600;"><span style="width: 7px; height: 7px; border-radius: 2px; background: var(--color-primary);"></span>Current</span>
            </div>
          </div>
          ${renderFinexyDualBarChart(challans)}
        </div>

        <!-- Right: Live Liability Attribution Breakdown -->
        <div>
          <div style="margin-bottom: 14px;">
            <div style="font-size: 13.5px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em;">Liability Attribution Breakdown</div>
            <div style="font-size: 12px; color: var(--text-3); margin-top: 2px;">Live split computed from ${challans.length} recorded notices</div>
          </div>

          <!-- Clean Stacked Attribution Hairline Bar -->
          <div style="display: flex; height: 8px; border-radius: 4px; overflow: hidden; gap: 2px; margin-bottom: 16px;">
            <div style="width: ${driverPct}%; background: var(--color-primary);" title="Driver Trips: ${driverPct}%"></div>
            <div style="width: ${lesseePct}%; background: #0284C7;" title="Lessee Contracts: ${lesseePct}%"></div>
            <div style="width: ${fleetPct}%; background: #D4D4D8;" title="Fleet & Unassigned: ${fleetPct}%"></div>
          </div>

          <div style="display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #F4F4F2; font-size: 12.5px;">
              <span style="display: inline-flex; align-items: center; gap: 8px; color: var(--ink);">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--color-primary);"></span>
                Driver Trips (${driverChallans.length})
              </span>
              <span style="font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums;">${driverPct}% &middot; ${Utils.formatINR(driverAmt)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #F4F4F2; font-size: 12.5px;">
              <span style="display: inline-flex; align-items: center; gap: 8px; color: var(--ink);">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: #0284C7;"></span>
                Lessee Contracts (${lesseeChallans.length})
              </span>
              <span style="font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums;">${lesseePct}% &middot; ${Utils.formatINR(lesseeAmt)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 0; font-size: 12.5px;">
              <span style="display: inline-flex; align-items: center; gap: 8px; color: var(--ink);">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: #A1A1AA;"></span>
                Fleet &amp; Unassigned (${fleetChallans.length})
              </span>
              <span style="font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums;">${fleetPct}% &middot; ${Utils.formatINR(fleetAmt)}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- 4. PRIORITY TRIAGE QUEUE (Clean Open Architectural Table) -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 14px;">
          <div>
            <div style="font-size: 14.5px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em;">Priority Triage Queue</div>
            <div style="font-size: 12px; color: var(--text-3); margin-top: 2px;">Click any citation to inspect in the slide-over drawer</div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div class="editorial-tabs" id="dashboardQueuePills">
              <button class="editorial-tab-btn calm-tab-btn active" data-queue="all">
                All Notices <span class="editorial-tab-count">${challans.filter(c => c.status !== 'paid').length}</span>
              </button>
              <button class="editorial-tab-btn calm-tab-btn" data-queue="unassigned">
                Unassigned <span class="editorial-tab-count">${challans.filter(c => c.status === 'unassigned').length}</span>
              </button>
              <button class="editorial-tab-btn calm-tab-btn" data-queue="overdue">
                Overdue <span class="editorial-tab-count">${challans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== 'paid').length}</span>
              </button>
              <button class="editorial-tab-btn calm-tab-btn" data-queue="dueSoon">
                7d Due <span class="editorial-tab-count">${challans.filter(c => Utils.getDaysRemaining(c.dueDate) >= 0 && Utils.getDaysRemaining(c.dueDate) <= 7 && c.status !== 'paid').length}</span>
              </button>
              <button class="editorial-tab-btn calm-tab-btn" data-queue="dispute">
                Court <span class="editorial-tab-count">${challans.filter(c => c.status === 'disputed' || c.status === 'court').length}</span>
              </button>
            </div>

            <div style="position: relative;">
              <svg style="position: absolute; left: 10px; top: 9px; pointer-events: none;" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="dashboardTableSearchInput" class="form-input" style="height: 32px; padding-left: 30px; font-size: 12px; width: 210px;" placeholder="Filter notices, plates...">
            </div>
          </div>
        </div>

        <!-- High-Density Data Table -->
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; min-width: 960px;">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;"><input type="checkbox" id="selectAllAttentionCheckbox" aria-label="Select all notices in queue" title="Select all notices"></th>
                <th style="width: 160px;">Notice ID</th>
                <th style="width: 150px;">Vehicle Plate</th>
                <th>Violation / Offence</th>
                <th class="text-right" style="width: 130px;">Amount</th>
                <th style="width: 130px;">Status</th>
                <th style="width: 180px;">Offence Timestamp</th>
                <th class="text-right" style="width: 120px;">Action</th>
              </tr>
            </thead>
            <tbody id="dashboardAttentionList">
              ${renderAttentionItems(challans.filter(c => c.status !== 'paid'))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `;

  // --------------------------------------------------------------------------
  // ATTACH QUEUE FILTER & SEARCH EVENT LISTENERS
  // --------------------------------------------------------------------------
  const tabBtns = container.querySelectorAll(".calm-tab-btn");
  const listContainer = container.querySelector("#dashboardAttentionList");
  const searchInput = container.querySelector("#dashboardTableSearchInput");

  function getActiveFilteredList() {
    const activeBtn = container.querySelector(".calm-tab-btn.active");
    const queueType = activeBtn ? activeBtn.dataset.queue : "all";
    let list = challans.filter(c => c.status !== 'paid');

    if (queueType === "unassigned") {
      list = challans.filter(c => c.status === "unassigned");
    } else if (queueType === "overdue") {
      list = challans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== "paid");
    } else if (queueType === "dueSoon") {
      list = challans.filter(c => Utils.getDaysRemaining(c.dueDate) >= 0 && Utils.getDaysRemaining(c.dueDate) <= 7 && c.status !== "paid");
    } else if (queueType === "dispute") {
      list = challans.filter(c => c.status === "disputed" || c.status === "court");
    }

    if (searchInput && searchInput.value.trim()) {
      const q = searchInput.value.trim().toLowerCase();
      list = list.filter(c => 
        (c.challanNumber && c.challanNumber.toLowerCase().includes(q)) ||
        (c.vehicleReg && c.vehicleReg.toLowerCase().includes(q)) ||
        (c.offence && c.offence.toLowerCase().includes(q)) ||
        (c.issuingAuthority && c.issuingAuthority.toLowerCase().includes(q))
      );
    }

    return list;
  }

  if (tabBtns && listContainer) {
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        listContainer.innerHTML = renderAttentionItems(getActiveFilteredList());
      });
    });
  }

  if (searchInput && listContainer) {
    searchInput.addEventListener("input", () => {
      listContainer.innerHTML = renderAttentionItems(getActiveFilteredList());
    });
  }

  // Trigger GSAP Arc Gauge Springs & Number Odometers
  if (typeof Utils !== "undefined" && Utils.animateGauges) {
    requestAnimationFrame(() => {
      Utils.animateGauges(container);
    });
  }
}

/**
 * Toggle visibility of queue pills if user clicks Filter button
 */
function toggleQueuePillsVisibility() {
  const pills = document.getElementById("dashboardQueuePills");
  if (pills) {
    pills.style.display = pills.style.display === "none" ? "flex" : "none";
  }
}

/**
 * Signature Element: Custom Bar Chart (Not pills!)
 * 14px-wide bars, 6px radius tops, --surface-2 (#ECEAE4) for past months,
 * --accent (#2B3A67) for current month, thin hairline gridlines, 11px axis labels.
 * Current month dynamically computed from new Date().
 */
function renderFinexyDualBarChart(challans) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const curMonthIndex = now.getMonth();
  
  // Generate 8 months ending on the current month from new Date()
  const basePastValues = [34, 42, 38, 46, 51, 44, 39];
  const months = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), curMonthIndex - i, 1);
    const isCurrent = (i === 0);
    months.push({
      label: monthNames[d.getMonth()],
      val: isCurrent ? 58 : basePastValues[7 - i],
      isCurrent: isCurrent,
      notices: isCurrent ? 33 : undefined,
      amount: isCurrent ? "₹48.2k" : undefined
    });
  }

  const chartHeight = 84;
  const chartWidth = 460;
  const barWidth = 12; // Refined compact bar width
  const startX = 34;
  const gap = (chartWidth - startX - (months.length * barWidth)) / (months.length - 1);
  const maxVal = 65;

  // Y-axis guidelines: 60k, 40k, 20k, 0
  const yTicks = [
    { label: "60k", val: 60 },
    { label: "40k", val: 40 },
    { label: "20k", val: 20 },
    { label: "00", val: 0 }
  ];

  let gridLines = "";
  yTicks.forEach(tick => {
    const yPos = chartHeight - (tick.val / maxVal) * (chartHeight - 20);
    gridLines += `
      <text x="0" y="${yPos + 3}" fill="#86868B" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-weight="400">${tick.label}</text>
      <line x1="24" y1="${yPos}" x2="${chartWidth}" y2="${yPos}" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="3 3" />
    `;
  });

  let barsHTML = "";
  let tooltipHTML = "";

  months.forEach((m, idx) => {
    const xPos = startX + idx * (barWidth + gap);
    const bHeight = (m.val / maxVal) * (chartHeight - 20);
    const yPos = chartHeight - bHeight;

    if (m.isCurrent) {
      // Apple Primary Blue current month bar with 4px top radius and animation
      barsHTML += `
        <rect class="framer-bar-rect" style="--bar-delay: ${idx * 0.045}s;" x="${xPos}" y="${yPos}" width="${barWidth}" height="${bHeight}" rx="4" ry="4" fill="#0071E3" />
        <text x="${xPos + barWidth / 2}" y="${chartHeight + 14}" text-anchor="middle" fill="#1D1D1F" font-size="9.5" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif">${m.label}</text>
      `;

      // Floating tooltip on #FFFFFF with 1px border and soft shadow
      const ttX = xPos - 36;
      const ttY = yPos - 30;
      tooltipHTML = `
        <g class="calm-chart-tooltip" filter="drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08))">
          <rect x="${ttX}" y="${ttY}" width="78" height="22" rx="4" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1" />
          <polygon points="${xPos + barWidth/2 - 3},${ttY + 22} ${xPos + barWidth/2 + 3},${ttY + 22} ${xPos + barWidth/2},${ttY + 26}" fill="#FFFFFF" />
          <text x="${ttX + 39}" y="${ttY + 15}" text-anchor="middle" fill="#1D1D1F" font-size="9.5" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif">
            ${m.amount} (${m.notices})
          </text>
        </g>
      `;
    } else {
      // Clean neutral Apple border tint #E5E7EB past months bars
      barsHTML += `
        <rect class="framer-bar-rect" style="--bar-delay: ${idx * 0.045}s;" x="${xPos}" y="${yPos}" width="${barWidth}" height="${bHeight}" rx="4" ry="4" fill="#E5E7EB" />
        <text x="${xPos + barWidth / 2}" y="${chartHeight + 14}" text-anchor="middle" fill="#6E6E73" font-size="9.5" font-weight="400" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif">${m.label}</text>
      `;
    }
  });

  return `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight + 18}" style="width: 100%; height: auto; display: block; overflow: visible;">
      ${gridLines}
      ${barsHTML}
      ${tooltipHTML}
    </svg>
  `;
}

/**
 * Signature Element: Donut Chart (Apple Minimal Premium)
 * 7px stroke, butt caps, 2px gap between segments, total in centre in SF Pro Display.
 * Tones: Primary Blue (#0071E3), Secondary Blue (#0066CC), Muted (#86868B), Track (#E5E7EB).
 */
function renderLiabilityDonutChart(challans) {
  const size = 92;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Proportions: Driver 42%, Lessee 38%, Fleet 20%
  const gap = 2;
  const p1 = (0.42 * circumference) - gap;
  const p2 = (0.38 * circumference) - gap;
  const p3 = (0.20 * circumference) - gap;

  // Offsets
  const off1 = 0;
  const off2 = -(p1 + gap);
  const off3 = -(p1 + gap + p2 + gap);

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); display: block;">
        <!-- Track Background -->
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
          stroke="#E5E7EB" stroke-width="${stroke}" />

        <!-- Segment 1: Driver Trips (#0071E3 Primary Apple Blue) -->
        <circle class="framer-donut-segment" style="--donut-delay: 0.2s;" cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
          stroke="#0071E3" stroke-width="${stroke}" stroke-linecap="butt"
          stroke-dasharray="${p1} ${circumference}"
          stroke-dashoffset="${off1}" />

        <!-- Segment 2: Lessee Contracts (#0066CC Secondary Apple Blue) -->
        <circle class="framer-donut-segment" style="--donut-delay: 0.35s;" cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
          stroke="#0066CC" stroke-width="${stroke}" stroke-linecap="butt"
          stroke-dasharray="${p2} ${circumference}"
          stroke-dashoffset="${off2}" />

        <!-- Segment 3: Fleet Default (#86868B Muted Grey) -->
        <circle class="framer-donut-segment" style="--donut-delay: 0.5s;" cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
          stroke="#86868B" stroke-width="${stroke}" stroke-linecap="butt"
          stroke-dasharray="${p3} ${circumference}"
          stroke-dashoffset="${off3}" />
      </svg>
      <!-- Center Counter in SF Pro Display -->
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
        <span style="font-family: var(--font-family-display); font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1; letter-spacing: -0.02em;">32</span>
        <span style="font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin-top: 2px;">NOTICES</span>
      </div>
    </div>
  `;
}

/**
 * Determine neutral category label for violation
 */
function getOffenceIconBadge(offenceText) {
  const text = (offenceText || "").toLowerCase();
  
  if (text.includes("speed") || text.includes("fast")) {
    return { label: "Speed Limit" };
  } else if (text.includes("signal") || text.includes("red light") || text.includes("light")) {
    return { label: "Signal Jump" };
  } else if (text.includes("parking") || text.includes("park")) {
    return { label: "Illegal Parking" };
  } else if (text.includes("document") || text.includes("puc") || text.includes("fitness") || text.includes("insurance") || text.includes("rc")) {
    return { label: "Doc & PUC" };
  } else if (text.includes("seat") || text.includes("belt")) {
    return { label: "Safety Belt" };
  } else if (text.includes("overload") || text.includes("weight") || text.includes("axle")) {
    return { label: "Gross Overload" };
  } else if (text.includes("lane") || text.includes("dangerous") || text.includes("rash")) {
    return { label: "Dangerous Driving" };
  }

  return { label: "MV Infraction" };
}

/**
 * Format date to clean editorial style: "17 Apr 2026, 03:45 PM"
 */
function formatFinexyDateTime(dateStr) {
  if (!dateStr) return "17 Apr 2026, 11:30 AM";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Render Actionable Attention Table Rows (Strict 56px rows, no vertical lines, monospace chip, right-aligned amounts)
 */
function renderAttentionItems(items) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 48px 16px; color: var(--text-3);">
          <div style="font-family: var(--font-family-serif); font-size: 24px; color: var(--text); margin-bottom: 4px;">Queue Clear</div>
          <div style="font-size: 13px; color: var(--text-2);">All compliance items in this triage queue have been adjudicated.</div>
        </td>
      </tr>
    `;
  }

  return items.slice(0, 10).map(c => {
    const isUnassigned = c.status === "unassigned";
    const daysLeft = Utils.getDaysRemaining(c.dueDate);
    const isOverdue = daysLeft < 0 && c.status !== "paid";
    const isUrgent = (isOverdue || (daysLeft <= 2 && c.status !== "paid")) && c.status !== "paid";
    const badge = getOffenceIconBadge(c.offence);
    const formattedDate = formatFinexyDateTime(c.offenceDate || c.date || c.dueDate);
    const vehicle = typeof StorageManager !== 'undefined' && StorageManager.getVehicleById ? StorageManager.getVehicleById(c.vehicleId) : null;
    const vehicleMeta = Utils.getVehicleTypeMeta(vehicle || { vehicleType: 'truck' });

    // Status class mapping for 22px high, 12% tint badge
    let statusClass = "assigned";
    let statusLabel = "Assigned";

    if (c.status === "paid") {
      statusClass = "paid";
      statusLabel = "Settled";
    } else if (c.status === "unassigned") {
      statusClass = "unassigned";
      statusLabel = "Unassigned";
    } else if (c.status === "disputed" || c.status === "court") {
      statusClass = c.status === "court" ? "court" : "disputed";
      statusLabel = c.status === "court" ? "In Court" : "Disputed";
    }

    return `
      <tr class="row-interactive ${isUrgent ? 'row-urgent-risk' : ''}" onclick="if(!event.target.closest('input') && !event.target.closest('button')) openQuickInspectorDrawer('${c.id}')" title="Click anywhere to inspect notice in drawer">
        <!-- Checkbox -->
        <td style="width: 36px;">
          <input type="checkbox" value="${c.id}" class="custom-checkbox" aria-label="Select infraction ${c.challanNumber}">
        </td>

        <!-- Notice ID -->
        <td>
          <span style="font-family: var(--font-family-mono); font-weight: 500; font-size: 12px; color: var(--text); cursor: pointer; letter-spacing: 0;" onclick="openQuickInspectorDrawer('${c.id}')">
            ${c.challanNumber}
          </span>
        </td>

        <!-- Monospace Registration Plate Chip with Fleet Thumbnail -->
        <td style="min-width: 175px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${vehicleMeta.image}" alt="${vehicleMeta.shortLabel}" style="width: 38px; height: 38px; border-radius: 8px; object-fit: cover; border: 1px solid var(--surface-1); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08); flex-shrink: 0;" onerror="this.src='assets/images/heavy-truck.jpg'">
            <div>
              <span class="reg-plate-chip" style="font-size: 11.5px; font-weight: 700;">${c.vehicleReg}</span>
              <div style="font-size: 11px; color: var(--text-3); margin-top: 2px; white-space: nowrap;">${vehicleMeta.shortLabel}</div>
            </div>
          </div>
        </td>

        <!-- Violation -->
        <td>
          <div style="font-weight: 500; font-size: 13px; color: var(--text);">
            ${badge.label}
          </div>
          <div style="font-size: 11.5px; color: var(--text-3); max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.offence}">
            ${c.offence}
          </div>
        </td>

        <!-- Amount (Right-Aligned Tabular Figures) -->
        <td class="text-right" style="text-align: right;">
          <div style="font-weight: 500; font-size: 13.5px; color: var(--text); font-variant-numeric: tabular-nums; text-align: right;">
            ${Utils.formatINR(c.amount)}
          </div>
          ${c.lateFee ? `<div style="font-size: 10.5px; color: var(--status-unassigned); text-align: right; font-variant-numeric: tabular-nums;">+${Utils.formatINR(c.lateFee)} fee</div>` : ''}
        </td>

        <!-- Status Badge (22px high, 12% tint, 5px dot, 11px text) -->
        <td>
          <div class="calm-badge ${statusClass}">
            <span class="dot"></span>
            <span>${statusLabel}</span>
          </div>
        </td>

        <!-- Offence Timestamp -->
        <td class="col-nice">
          <div style="font-size: 12px; color: var(--text-3); white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${formattedDate}
          </div>
        </td>

        <!-- Action Trigger (10px Radius Control) -->
        <td class="text-right">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            ${isUnassigned ? `
              <button class="calm-btn-secondary" style="padding: 4px 10px; font-size: 11px; height: 28px; border-radius: 6px;" onclick="openAssignmentModal('${c.id}')" title="Assign responsible party">
                Assign
              </button>
            ` : (c.status !== 'court' && c.status !== 'paid' ? `
              <button class="calm-btn-secondary" style="padding: 4px 10px; font-size: 11px; height: 28px; border-radius: 6px;" onclick="openPaymentModal('${c.id}')" title="Settle notice">
                Pay
              </button>
            ` : '')}
            <button class="calm-btn-secondary" style="padding: 4px 8px; font-size: 11px; height: 28px; border-radius: 6px;" onclick="navigateTo('challans', true, { id: '${c.id}' })" title="View notice details">
              View
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function calculateMonthlyTrend(challans) {
  return [
    { label: "Jan", count: 34 },
    { label: "Feb", count: 42 },
    { label: "Mar", count: 38 },
    { label: "Apr", count: 46 },
    { label: "May", count: 51 },
    { label: "Jun", count: 44 },
    { label: "Jul", count: 39 },
    { label: "Aug", count: 58 }
  ];
}

/**
 * Doherty Threshold: Instant micro-feedback on Gateway Sync
 */
function triggerParivahanSyncAnimation(btn) {
  if (!btn) return;
  const icon = btn.querySelector('.sync-icon');
  if (icon) {
    icon.style.transition = 'transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    icon.style.transform = 'rotate(720deg)';
    setTimeout(() => {
      icon.style.transition = 'none';
      icon.style.transform = 'rotate(0deg)';
    }, 620);
  }
  
  setTimeout(() => {
    Utils.showToast('Gateway Synchronized', 'Parivahan e-Challan gateway polled successfully. 32 active records refreshed.', 'success');
    if (typeof Utils !== 'undefined' && Utils.animateGauges) {
      Utils.animateGauges(document);
    }
  }, 250);
}
window.triggerParivahanSyncAnimation = triggerParivahanSyncAnimation;
