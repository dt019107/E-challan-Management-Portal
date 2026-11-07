/**
 * ChallanOS - Operational Dashboard Module (js/dashboard.js)
 * 
 * Calm Editorial Fintech Architecture:
 * - 12-Column Asymmetric Grid (5/7 and full spans, no rows of 4 equal boxes)
 * - Hero Outstanding Tile with 62px Instrument Serif typography & hairline corridor metrics
 * - Navy Hero Panel with Indian highway photograph under dot grid & navy overlay
 * - Signature Bar Chart with 14px bars, rounded tops, hatched aqua bar & floating dark tooltip
 * - Signature Donut Chart with 10px stroke, round caps, 3px segment gaps & serif central counter
 * - Action Queue Table with strict 60px rows, no vertical lines, 11px uppercase muted headers,
 *   monospace registration chip, and 24px status badges with 6px dots.
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

  container.innerHTML = `
    <div class="calm-dashboard-container">
      
      <!-- 1. GREETING HEADER (34px Serif with muted 13px date line) -->
      <div class="calm-dashboard-header">
        <div class="calm-header-left">
          <div class="calm-header-date">
            <span class="dot"></span>
            <span>SATURDAY, 7 NOVEMBER 2026 • MORTH PARIVAHAN GATEWAY ACTIVE</span>
          </div>
          <h1 class="calm-header-greeting">Good morning, Vikram</h1>
        </div>

        <div class="calm-header-actions">
          <button class="calm-btn-pill" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'fleet-liability-audit.csv')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            Download Summary
          </button>
          <button class="calm-btn-navy" onclick="Utils.showToast('Gateway Synchronized', 'Parivahan e-Challan gateway polled successfully. 32 active records refreshed.', 'success')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
            Parivahan Sync
          </button>
        </div>
      </div>

      <!-- 2. TOP ROW (12 COLUMNS: 7 / 5 ASYMMETRIC GRID) -->
      <div class="calm-grid-12">
        
        <!-- COLUMN SPAN 7: THE HERO OUTSTANDING TILE (2x visual prominence, 62px Serif Number) -->
        <div class="calm-panel calm-span-7">
          <div>
            <div class="calm-label-caps">
              <span>Outstanding Fleet Liability</span>
              <span style="color: #43D8C5; font-size: 11px; font-weight: 600;">↑ 5.2% vs last 30d</span>
            </div>

            <div class="calm-hero-number" id="dashboardHeroNumber">
              ${Utils.formatINR(stats.outstandingAmount)}
            </div>

            <div class="calm-subtext">
              Across 32 active compliance notices across Delhi NCR, Mumbai Western Corridor, and Bengaluru Logistics Hubs.
            </div>

            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <button class="calm-btn-navy" onclick="navigateTo('payments')" title="Settle notices in bulk via simulated payment">
                Settle Fines
              </button>
              <button class="calm-btn-surface" onclick="navigateTo('challans', true, { status: 'unassigned' })" title="Adjudicate unassigned traffic notices">
                Assign Responsibility
              </button>
            </div>
          </div>

          <!-- Hairline Corridor Metrics -->
          <div class="calm-corridor-row">
            <div class="calm-corridor-item">
              <div class="calm-corridor-label">NCR Corridor</div>
              <div class="calm-corridor-val">${Utils.formatINR(corridorAmounts.ncr)}</div>
            </div>
            <div class="calm-corridor-item">
              <div class="calm-corridor-label">Mumbai Western</div>
              <div class="calm-corridor-val">${Utils.formatINR(corridorAmounts.mumbai)}</div>
            </div>
            <div class="calm-corridor-item">
              <div class="calm-corridor-label">Bengaluru Hub</div>
              <div class="calm-corridor-val">${Utils.formatINR(corridorAmounts.blr)}</div>
            </div>
          </div>
        </div>

        <!-- COLUMN SPAN 5: THE NAVY HERO PHOTO PANEL (Exactly ONE dark tile per screen) -->
        <div class="calm-navy-photo-panel calm-span-5">
          <div>
            <div class="calm-label-caps">
              <span>Impending Deadline (7 Days)</span>
              <span style="color: #43D8C5; font-size: 11px; font-weight: 600;">Toll &amp; Highway Radar</span>
            </div>

            <div class="calm-navy-number">
              ₹24,800
            </div>

            <div class="calm-navy-desc">
              14 commercial notices entering judicial compounding penalty within 7 business days if unadjudicated.
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div class="calm-navy-badge">
              <span class="dot"></span>
              <span>Court Referral Imminent</span>
            </div>
            <button class="calm-btn-navy" style="background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.2);" onclick="navigateTo('challans', true, { filter: 'due7days' })">
              Review Notices →
            </button>
          </div>
        </div>

      </div>

      <!-- 3. MIDDLE ROW (12 COLUMNS: 7 / 5 ASYMMETRIC GRID) -->
      <div class="calm-grid-12">
        
        <!-- COLUMN SPAN 7: CUSTOM BAR CHART (14px Bars, Hatched Aqua, Floating Tooltip) -->
        <div class="calm-panel calm-span-7">
          <div class="calm-chart-header">
            <div>
              <div class="calm-chart-title">Notice &amp; Settlement Velocity</div>
              <div class="calm-chart-sub">Monthly trend across national fleet operations</div>
            </div>
            <div class="calm-chart-legend">
              <div class="calm-chart-legend-item">
                <span class="calm-chart-legend-dot" style="background: #A9CEF3;"></span>
                <span>Past Months</span>
              </div>
              <div class="calm-chart-legend-item">
                <span class="calm-chart-legend-dot" style="background: #43D8C5;"></span>
                <span>Current Month (Velocity)</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 8px;">
            ${renderFinexyDualBarChart(challans)}
          </div>
        </div>

        <!-- COLUMN SPAN 5: LIABILITY ATTRIBUTION DONUT CHART -->
        <div class="calm-panel calm-span-5">
          <div class="calm-chart-header">
            <div>
              <div class="calm-chart-title">Liability Attribution</div>
              <div class="calm-chart-sub">Adjudicated legal responsibility breakdown</div>
            </div>
          </div>

          <div class="calm-donut-container">
            <!-- SVG Donut with 10px stroke, round caps, 3px gap & serif central counter -->
            ${renderLiabilityDonutChart(challans)}

            <!-- Hairline Category Breakdown List -->
            <div class="calm-donut-list">
              <div class="calm-donut-row">
                <div class="calm-donut-name">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #0F2A47;"></span>
                  <span>Driver Trips</span>
                </div>
                <div class="calm-donut-pct">42% (₹54,600)</div>
              </div>

              <div class="calm-donut-row">
                <div class="calm-donut-name">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #43D8C5;"></span>
                  <span>Lessee Contracts</span>
                </div>
                <div class="calm-donut-pct">38% (₹49,400)</div>
              </div>

              <div class="calm-donut-row">
                <div class="calm-donut-name">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #94A3B8;"></span>
                  <span>Fleet Default</span>
                </div>
                <div class="calm-donut-pct">20% (₹26,010)</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 4. BOTTOM ROW (SPAN 12: ACTION QUEUE & RECENT INFRACTIONS) -->
      <div class="calm-panel calm-span-12">
        
        <div class="calm-table-header">
          <div>
            <div class="calm-chart-title">Action Queue &amp; Recent Infractions</div>
            <div class="calm-chart-sub">Live compliance triage requiring financial or legal adjudication</div>
          </div>

          <!-- Queue Filter Tabs & Search Control -->
          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <div class="calm-queue-tabs" id="dashboardQueuePills">
              <button class="calm-tab-btn active" data-queue="all">
                All Action Items <span class="calm-tab-badge">${challans.filter(c => c.status !== 'paid').length}</span>
              </button>
              <button class="calm-tab-btn" data-queue="unassigned">
                Unassigned <span class="calm-tab-badge">${challans.filter(c => c.status === 'unassigned').length}</span>
              </button>
              <button class="calm-tab-btn" data-queue="overdue">
                Overdue <span class="calm-tab-badge">${challans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== 'paid').length}</span>
              </button>
              <button class="calm-tab-btn" data-queue="dueSoon">
                Due in 7 Days <span class="calm-tab-badge">${challans.filter(c => Utils.getDaysRemaining(c.dueDate) >= 0 && Utils.getDaysRemaining(c.dueDate) <= 7 && c.status !== 'paid').length}</span>
              </button>
              <button class="calm-tab-btn" data-queue="dispute">
                Disputed / Court <span class="calm-tab-badge">${challans.filter(c => c.status === 'disputed' || c.status === 'court').length}</span>
              </button>
            </div>

            <div style="position: relative;">
              <svg style="position: absolute; left: 10px; top: 11px; pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="dashboardTableSearchInput" class="calm-search-input" placeholder="Search notices, plates...">
            </div>
          </div>
        </div>

        <!-- Strict 60px Table Rows, No Vertical Lines, 11px Uppercase Headers -->
        <div style="overflow-x: auto; margin-top: 8px;">
          <table class="calm-table">
            <thead>
              <tr>
                <th style="width: 36px;"><input type="checkbox" id="selectAllAttentionCheckbox" title="Select all items"></th>
                <th style="width: 140px;">Notice ID</th>
                <th style="width: 130px;">Vehicle Plate</th>
                <th>Violation / Offence</th>
                <th class="text-right" style="width: 120px;">Amount</th>
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
 * Signature Element: Custom Bar Chart
 * 14px-wide bars, fully rounded tops, light-blue bars for past months,
 * hatched aqua bar for current month, and a floating dark tooltip with small arrow.
 */
function renderFinexyDualBarChart(challans) {
  const months = [
    { label: "Jan", val: 34, isCurrent: false },
    { label: "Feb", val: 42, isCurrent: false },
    { label: "Mar", val: 38, isCurrent: false },
    { label: "Apr", val: 46, isCurrent: false },
    { label: "May", val: 51, isCurrent: false },
    { label: "Jun", val: 44, isCurrent: false },
    { label: "Jul", val: 39, isCurrent: false },
    { label: "Aug", val: 58, isCurrent: true, notices: 33, amount: "₹48.2k" }
  ];

  const chartHeight = 150;
  const chartWidth = 460;
  const barWidth = 14; // Strict 14px width
  const startX = 40;
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
    const yPos = chartHeight - (tick.val / maxVal) * (chartHeight - 30);
    gridLines += `
      <text x="0" y="${yPos + 4}" fill="#94A3B8" font-size="10" font-family="'Inter Tight', sans-serif" font-weight="500">${tick.label}</text>
      <line x1="28" y1="${yPos}" x2="${chartWidth}" y2="${yPos}" stroke="rgba(15,30,50,.05)" stroke-width="1" />
    `;
  });

  let barsHTML = "";
  let tooltipHTML = "";

  months.forEach((m, idx) => {
    const xPos = startX + idx * (barWidth + gap);
    const bHeight = (m.val / maxVal) * (chartHeight - 30);
    const yPos = chartHeight - bHeight;

    if (m.isCurrent) {
      // Hatched aqua bar
      barsHTML += `
        <rect x="${xPos}" y="${yPos}" width="${barWidth}" height="${bHeight}" rx="7" fill="url(#calmHatchedAqua)" />
        <text x="${xPos + barWidth / 2}" y="${chartHeight + 18}" text-anchor="middle" fill="#0F2A47" font-size="11" font-weight="700" font-family="'Inter Tight', sans-serif">${m.label}</text>
      `;

      // Floating dark tooltip with a small arrow on the highlighted bar
      const ttX = xPos - 36;
      const ttY = yPos - 38;
      tooltipHTML = `
        <g class="calm-chart-tooltip" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.18));">
          <rect x="${ttX}" y="${ttY}" width="86" height="28" rx="6" fill="#16191F" />
          <polygon points="${xPos + barWidth/2 - 4},${ttY + 28} ${xPos + barWidth/2 + 4},${ttY + 28} ${xPos + barWidth/2},${ttY + 33}" fill="#16191F" />
          <text x="${ttX + 43}" y="${ttY + 18}" text-anchor="middle" fill="#43D8C5" font-size="11" font-weight="600" font-family="'Inter Tight', sans-serif">
            ${m.amount} (${m.notices})
          </text>
        </g>
      `;
    } else {
      // Light-blue past months bars
      barsHTML += `
        <rect x="${xPos}" y="${yPos}" width="${barWidth}" height="${bHeight}" rx="7" fill="#A9CEF3" opacity="0.85" />
        <text x="${xPos + barWidth / 2}" y="${chartHeight + 18}" text-anchor="middle" fill="#94A3B8" font-size="11" font-weight="500" font-family="'Inter Tight', sans-serif">${m.label}</text>
      `;
    }
  });

  return `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight + 28}" style="width: 100%; height: auto; display: block; overflow: visible;">
      <defs>
        <!-- Hatched Aqua Pattern (repeating-linear-gradient 135deg) -->
        <pattern id="calmHatchedAqua" width="8" height="8" patternTransform="rotate(135 0 0)" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#43D8C5" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#1BA894" stroke-width="3" />
        </pattern>
      </defs>
      ${gridLines}
      ${barsHTML}
      ${tooltipHTML}
    </svg>
  `;
}

/**
 * Signature Element: Donut Chart
 * 10px stroke, round caps, 3px gap between segments, total in centre in serif.
 */
function renderLiabilityDonutChart(challans) {
  const size = 130;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius; // ~376.99

  // Proportions: Driver 42%, Lessee 38%, Fleet 20%
  // 3px gap between segments translated to circumference ratio
  const gap = 4;
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
        <!-- Segment 1: Driver Trips (Navy #0F2A47) -->
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
          stroke="#0F2A47" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${p1} ${circumference}"
          stroke-dashoffset="${off1}" />

        <!-- Segment 2: Lessee Contracts (Aqua #43D8C5) -->
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
          stroke="#43D8C5" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${p2} ${circumference}"
          stroke-dashoffset="${off2}" />

        <!-- Segment 3: Fleet Default (Neutral #94A3B8) -->
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
          stroke="#CBD5E1" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${p3} ${circumference}"
          stroke-dashoffset="${off3}" />
      </svg>
      <!-- Center Counter in Serif -->
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
        <span style="font-family: var(--font-family-serif); font-size: 32px; font-weight: 500; color: #0F2A47; line-height: 1;">32</span>
        <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; margin-top: 2px;">NOTICES</span>
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
 * Render Actionable Attention Table Rows (Strict 60px rows, no vertical lines, monospace chip, right-aligned amounts)
 */
function renderAttentionItems(items) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 48px 16px; color: #94A3B8;">
          <div style="font-family: var(--font-family-serif); font-size: 24px; color: #0F2A47; margin-bottom: 4px;">Queue Clear</div>
          <div style="font-size: 13px; color: #64748B;">All compliance items in this triage queue have been adjudicated.</div>
        </td>
      </tr>
    `;
  }

  return items.slice(0, 10).map(c => {
    const isUnassigned = c.status === "unassigned";
    const badge = getOffenceIconBadge(c.offence);
    const formattedDate = formatFinexyDateTime(c.offenceDate || c.date || c.dueDate);

    // Status class mapping for 24px high, 10% tint badge
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
      <tr>
        <!-- Checkbox -->
        <td style="width: 36px;">
          <input type="checkbox" value="${c.id}">
        </td>

        <!-- Notice ID -->
        <td>
          <span style="font-family: var(--font-family-mono); font-weight: 600; font-size: 12px; color: #0F2A47; cursor: pointer; letter-spacing: -0.01em;" onclick="navigateTo('challans', true, { id: '${c.id}' })">
            ${c.challanNumber}
          </span>
        </td>

        <!-- Monospace Registration Plate Chip -->
        <td>
          <span class="reg-plate-chip">${c.vehicleReg}</span>
        </td>

        <!-- Violation -->
        <td>
          <div style="font-weight: 500; font-size: 13px; color: #141821;">
            ${badge.label}
          </div>
          <div style="font-size: 11px; color: #94A3B8; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.offence}">
            ${c.offence}
          </div>
        </td>

        <!-- Amount (Right-Aligned Tabular Figures) -->
        <td class="text-right">
          <div style="font-weight: 600; font-size: 13.5px; color: #0F2A47; font-variant-numeric: tabular-nums;">
            ${Utils.formatINR(c.amount)}
          </div>
          ${c.lateFee ? `<div style="font-size: 10px; color: #C24141;">+${Utils.formatINR(c.lateFee)} fee</div>` : ''}
        </td>

        <!-- Status Badge (24px high, 10% tint, 6px dot, 12px/500 text) -->
        <td>
          <div class="calm-badge ${statusClass}">
            <span class="dot"></span>
            <span>${statusLabel}</span>
          </div>
        </td>

        <!-- Offence Timestamp -->
        <td>
          <div style="font-size: 12px; color: #64748B; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${formattedDate}
          </div>
        </td>

        <!-- Action Trigger (10px Radius Control) -->
        <td class="text-right">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            ${isUnassigned ? `
              <button class="calm-btn-navy" style="padding: 4.5px 11px; font-size: 11px; font-weight: 600; border-radius: 6px;" onclick="openAssignmentModal('${c.id}')" title="Assign responsible party">
                Assign
              </button>
            ` : (c.status !== 'court' && c.status !== 'paid' ? `
              <button class="calm-btn-surface" style="padding: 4.5px 11px; font-size: 11px; font-weight: 600; border-radius: 6px; background: #F0FDF4; color: #166534; border: 1px solid rgba(22, 163, 74, 0.2);" onclick="openPaymentModal('${c.id}')" title="Settle notice">
                Pay
              </button>
            ` : '')}
            <button class="calm-btn-pill" style="padding: 4.5px 9px; font-size: 11px; font-weight: 500; border-radius: 6px;" onclick="navigateTo('challans', true, { id: '${c.id}' })" title="View notice details">
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

function renderSVGMonthlyTrendChart(monthlyData) {
  return "";
}

function getRecentActivityFeed(challans) {
  return StorageManager.getActivityLogs();
}

function getUpcomingDeadlinesList(challans) {
  return challans.filter(c => Utils.getDaysRemaining(c.dueDate) >= 0 && Utils.getDaysRemaining(c.dueDate) <= 7 && c.status !== 'paid');
}

function formatRelativeTimestamp(isoStr) {
  return Utils.formatDate(isoStr);
}

// ----------------------------------------------------------------------------
// LEGACY CHART & COMPATIBILITY HELPERS
// (Kept intact so any external callers or tests continue to work flawlessly)
// ----------------------------------------------------------------------------

function calculateMonthlyTrend(challans) {
  const months = ["Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"];
  const counts = {
    "Oct 2025": 3,
    "Nov 2025": 4,
    "Dec 2025": 6,
    "Jan 2026": 7,
    "Feb 2026": 5,
    "Mar 2026": 7
  };

  challans.forEach(c => {
    if (c.offenceDate) {
      const d = new Date(c.offenceDate);
      const mStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (counts[mStr] !== undefined) {
        counts[mStr]++;
      }
    }
  });

  return months.map(m => ({
    label: m.split(" ")[0],
    fullMonth: m,
    count: counts[m] || 2
  }));
}

function renderSVGMonthlyTrendChart(monthlyData) {
  return renderFinexyDualBarChart(StorageManager.getChallans());
}

function getRecentActivityFeed(challans) {
  const activities = [];
  challans.forEach(c => {
    (c.activityLog || []).forEach(act => {
      activities.push({
        ...act,
        challanId: c.id,
        challanNumber: c.challanNumber,
        vehicleReg: c.vehicleReg,
        amount: c.amount,
        status: c.status
      });
    });
  });

  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);
}

function getUpcomingDeadlinesList(challans) {
  return challans
    .filter(c => c.status !== 'paid' && c.dueDate)
    .map(c => ({
      ...c,
      daysLeft: Utils.getDaysRemaining(c.dueDate)
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 4);
}

function formatRelativeTimestamp(isoStr) {
  if (!isoStr) return "Just now";
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  } catch (e) {
    return "Recent";
  }
}
