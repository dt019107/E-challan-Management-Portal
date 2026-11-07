/**
 * ChallanOS - Operational Dashboard Module (js/dashboard.js)
 * 
 * Re-architected with Finexy Modern Fintech UI Design Language:
 * - Fluid high-contrast modern card architecture with 24px rounded corners
 * - Top Row (3 Columns):
 *   1. Total Liability Card with currency switcher, trend badge, lime/soft action pills, & corridor mini-wallets
 *   2. 2x2 Metric Block with vibrant green gradient Hero Card (Unassigned Notices) + 3 crisp white metric cards
 *   3. Total Infraction & Recovery Velocity Bar Chart (Dual/Stacked SVG bar chart across 8 months with Y-axis guidelines)
 * - Bottom Row (2 Columns):
 *   1. Left Stack: Monthly Settlement Limit progress tracker & Physical Fleet Cards (Matte Black Mastercard + Green FASTag card)
 *   2. Right Stack: Wide Recent Activities Table Card with live search pill, filter toggle, queue filter pills,
 *      colorful offence category icon badges, status dots, amounts, timestamps, and action triggers
 * - Fully preserving all central database queries, LocalStorage reactive updates, and navigation callbacks.
 */

function renderDashboardView(container, actions) {
  if (!container) return;

  const stats = StorageManager.getDashboardStats();
  const challans = StorageManager.getChallans();
  const vehicles = StorageManager.getVehicles();

  // Clear redundant outside actions container since actions are integrated into the premium greeting header
  if (actions) {
    actions.innerHTML = "";
  }

  // Calculate corridor breakdown for mini-wallets in Card 1
  const corridorAmounts = {
    ncr: Math.round(stats.outstandingAmount * 0.45),
    mumbai: Math.round(stats.outstandingAmount * 0.32),
    blr: Math.max(0, stats.outstandingAmount - Math.round(stats.outstandingAmount * 0.45) - Math.round(stats.outstandingAmount * 0.32))
  };

  // Settled progress calculation
  const settledAmount = challans.filter(c => c.status === 'paid').reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const totalDemand = stats.outstandingAmount + settledAmount;
  const settledPct = totalDemand > 0 ? Math.min(100, Math.round((settledAmount / totalDemand) * 100)) : 35;

  // Render the unified Finexy-inspired Dashboard container
  container.innerHTML = `
    <div class="finexy-dashboard-container">
      
      <!-- 1. GREETING HEADER WITH INTEGRATED ACTIONS & GENEROUS BREATHING ROOM -->
      <div class="finexy-header">
        <div class="finexy-header-left">
          <div class="finexy-greeting-pill">
            <span class="finexy-sun-icon">☀</span>
            <span>Fleet Operations Command</span>
          </div>
          <h1 class="finexy-greeting-title">Good morning, Vikram</h1>
          <p class="finexy-greeting-sub">Stay on top of your tasks, monitor progress, and track status.</p>
        </div>

        <div class="finexy-header-actions">
          <span class="finexy-live-badge" title="Real-time Parivahan API active">
            <span class="finexy-live-dot"></span>
            MoRTH Gateway Connected
          </span>
          <button class="finexy-action-pill-btn" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'apex-fleet-daily-summary.csv')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            Download Summary
          </button>
          <button class="finexy-action-pill-btn primary" onclick="Utils.showToast('Gateway Synchronized', 'Parivahan e-Challan gateway polled successfully. All records are up to date.', 'success')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
            Parivahan Sync
          </button>
        </div>
      </div>

      <!-- 2. TOP ROW (3 COLUMNS) -->
      <div class="finexy-top-grid">
        
        <!-- COLUMN 1: TOTAL LIABILITY CARD -->
        <div class="finexy-balance-card">
          <div>
            <div class="finexy-card-top-row">
              <span class="finexy-label-muted">Total Liability</span>
              <div class="finexy-currency-badge" title="Primary Fleet Currency">
                <span>🇮🇳</span>
                <span>INR</span>
                <span style="font-size: 8px; opacity: 0.6;">▾</span>
              </div>
            </div>

            <div class="finexy-big-balance">
              ${Utils.formatINR(stats.outstandingAmount)}
            </div>

            <div class="finexy-trend-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              <span>↑ 5% than last month</span>
            </div>

            <div class="finexy-action-buttons">
              <button class="finexy-btn-lime" onclick="navigateTo('payments')" title="Open simulated payment settlement terminal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                Settle Fines
              </button>
              <button class="finexy-btn-soft" onclick="navigateTo('challans', true, { status: 'unassigned' })" title="Assign responsible drivers or lessees">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                Assign Party
              </button>
            </div>
          </div>

          <!-- Bottom Corridor Hubs -->
          <div class="finexy-subcards-section">
            <div class="finexy-subcards-header">
              <span>Fleet Corridors</span>
              <span style="color: #98A2B3; font-weight: 500;">Total 3 Hubs</span>
            </div>
            <div class="finexy-subcards-row">
              <div class="finexy-mini-wallet" onclick="navigateTo('challans', true, { search: 'NCR' })" title="NCR Hub Infractions">
                <div class="finexy-mini-top">
                  <span>🏢 NCR</span>
                  <span style="color: #98A2B3; font-size: 10px;">⋮</span>
                </div>
                <div class="finexy-mini-amount">${Utils.formatINR(corridorAmounts.ncr)}</div>
                <div class="finexy-mini-sub" style="color: #16845B;">Active</div>
              </div>

              <div class="finexy-mini-wallet" onclick="navigateTo('challans', true, { search: 'Mumbai' })" title="Mumbai Hub Infractions">
                <div class="finexy-mini-top">
                  <span>⚓ Mumbai</span>
                  <span style="color: #98A2B3; font-size: 10px;">⋮</span>
                </div>
                <div class="finexy-mini-amount">${Utils.formatINR(corridorAmounts.mumbai)}</div>
                <div class="finexy-mini-sub" style="color: #16845B;">Active</div>
              </div>

              <div class="finexy-mini-wallet" onclick="navigateTo('challans', true, { search: 'Bengaluru' })" title="Bengaluru Hub Infractions">
                <div class="finexy-mini-top">
                  <span>💻 BLR</span>
                  <span style="color: #98A2B3; font-size: 10px;">⋮</span>
                </div>
                <div class="finexy-mini-amount">${Utils.formatINR(corridorAmounts.blr)}</div>
                <div class="finexy-mini-sub" style="color: #667085;">Active</div>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUMN 2: 2x2 METRICS BLOCK -->
        <div class="finexy-metrics-block">
          
          <!-- Top Left Hero Green Card: Unassigned Notices -->
          <div class="finexy-metric-card hero-green" onclick="navigateTo('challans', true, { status: 'unassigned' })" title="Triage unassigned notices">
            <div class="finexy-metric-card-top">
              <span class="finexy-card-label">Unassigned Notices</span>
              <div class="finexy-metric-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
            </div>
            <div>
              <div class="finexy-big-val">${stats.unassignedChallans}</div>
              <div class="finexy-subtext-trend">
                <span>↑ 7% Needs Triage</span>
              </div>
            </div>
          </div>

          <!-- Top Right White Card: Due in 7 Days -->
          <div class="finexy-metric-card hero-white" onclick="navigateTo('challans', true, { filter: 'due7days' })" title="View notices due soon">
            <div class="finexy-metric-card-top">
              <span class="finexy-card-label">Due in 7 Days</span>
              <div class="finexy-metric-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
            </div>
            <div>
              <div class="finexy-big-val">${stats.dueIn7Days}</div>
              <div class="finexy-subtext-trend" style="color: #C24141;">
                <span>↓ 5% Impending Fee</span>
              </div>
            </div>
          </div>

          <!-- Bottom Left White Card: Open Challans -->
          <div class="finexy-metric-card hero-white" onclick="navigateTo('challans', true, { status: 'all' })" title="View all open notices">
            <div class="finexy-metric-card-top">
              <span class="finexy-card-label">Open Challans</span>
              <div class="finexy-metric-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              </div>
            </div>
            <div>
              <div class="finexy-big-val">${stats.openChallans}</div>
              <div class="finexy-subtext-trend" style="color: #16845B;">
                <span>↑ 8% Across Fleet</span>
              </div>
            </div>
          </div>

          <!-- Bottom Right White Card: Disputed / Court -->
          <div class="finexy-metric-card hero-white" onclick="navigateTo('disputes', true, { status: 'disputed' })" title="View contested & court matters">
            <div class="finexy-metric-card-top">
              <span class="finexy-card-label">Disputed / Court</span>
              <div class="finexy-metric-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
            </div>
            <div>
              <div class="finexy-big-val">${stats.disputedChallans}</div>
              <div class="finexy-subtext-trend" style="color: #16845B;">
                <span>↑ 4% Sub-Judice</span>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUMN 3: TOTAL INFRACTIONS & RECOVERY VELOCITY CHART -->
        <div class="finexy-chart-card">
          <div class="finexy-chart-header">
            <div>
              <div class="finexy-chart-title">Total Infractions</div>
              <div class="finexy-chart-sub">View notice frequency in a certain period of time</div>
            </div>
            <div class="finexy-chart-legend">
              <div style="display: flex; align-items: center;">
                <span class="finexy-legend-dot" style="background: #43D8C5;"></span>
                <span>New Notices</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span class="finexy-legend-dot" style="background: #242329;"></span>
                <span>Settled</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 10px;">
            ${renderFinexyDualBarChart(challans)}
          </div>
        </div>

      </div>

      <!-- 3. BOTTOM ROW (2 COLUMNS) -->
      <div class="finexy-bottom-grid">
        
        <!-- LEFT COLUMN: SPENDING LIMIT & FLEET WALLET CARDS -->
        <div class="finexy-left-stack">
          
          <!-- Monthly Spending Limit Progress Card -->
          <div class="finexy-progress-card">
            <div class="finexy-progress-title">Monthly Settlement Limit</div>
            <div class="finexy-progress-track">
              <div class="finexy-progress-fill" style="width: ${settledPct}%;"></div>
            </div>
            <div class="finexy-progress-labels">
              <span><strong>${Utils.formatINR(settledAmount)}</strong> settled</span>
              <span>Limit ${Utils.formatINR(totalDemand || 150000)}</span>
            </div>
          </div>

          <!-- Fleet Cards & FASTags Box -->
          <div class="finexy-cards-box">
            <div class="finexy-cards-header">
              <div class="finexy-cards-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Fleet Cards
              </div>
              <button class="finexy-filter-btn" style="padding: 4px 10px; font-size: 11px;" onclick="Utils.showToast('Fleet Wallets', 'FASTag and Corporate Fuel Cards auto-replenish via Virtual Escrow.', 'info')">
                + Add new
              </button>
            </div>

            <div class="finexy-cards-row">
              <!-- Physical Card 1: Matte Black Mastercard -->
              <div class="finexy-physical-card black-card" title="Primary Corporate Settlement Card">
                <div class="finexy-card-top-status">
                  <span style="font-size: 12px; opacity: 0.8;">)))</span>
                  <span class="finexy-card-badge">Active</span>
                </div>
                <div style="display: flex; justify-content: flex-end; margin: 4px 0;">
                  <div style="display: flex;">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: #EB001B; opacity: 0.9;"></div>
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: #F79E1B; opacity: 0.9; margin-left: -5px;"></div>
                  </div>
                </div>
                <div>
                  <div class="finexy-card-num">•••• •••• 6782</div>
                  <div class="finexy-card-bottom-info" style="margin-top: 6px;">
                    <div>EXP 09/29</div>
                    <div>CVV 611</div>
                  </div>
                </div>
              </div>

              <!-- Physical Card 2: Deep Green FASTag / Fleet Card -->
              <div class="finexy-physical-card green-card" title="National Highway FASTag Auto-Debit">
                <div class="finexy-card-top-status">
                  <span style="font-size: 12px; opacity: 0.8;">)))</span>
                  <span class="finexy-card-badge">Active</span>
                </div>
                <div style="display: flex; justify-content: flex-end; margin: 4px 0;">
                  <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.05em; color: #B5EE40;">FASTAG</span>
                </div>
                <div>
                  <div class="finexy-card-num">•••• •••• 4356</div>
                  <div class="finexy-card-bottom-info" style="margin-top: 6px;">
                    <div>HUB NORTH</div>
                    <div>ICICI ESCROW</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: RECENT ACTIVITIES TABLE CARD -->
        <div class="finexy-activities-card">
          <div class="finexy-activities-header">
            <div class="finexy-activities-title">Recent Activities</div>
            
            <div class="finexy-activities-controls">
              <!-- Search Pill -->
              <div class="finexy-search-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="dashboardTableSearchInput" class="finexy-search-input" placeholder="Search notices, offences...">
              </div>

              <!-- Filter Button -->
              <button class="finexy-filter-btn" id="dashboardFilterToggleBtn" onclick="toggleQueuePillsVisibility()">
                <span>Filter</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </button>
            </div>
          </div>

          <!-- Queue Filter Pills -->
          <div class="queue-nav-pills" id="dashboardQueuePills" style="margin-bottom: 16px;">
            <button class="queue-pill-btn active" data-queue="all">
              All Action Items <span class="queue-pill-badge">${challans.filter(c => c.status !== 'paid').length}</span>
            </button>
            <button class="queue-pill-btn" data-queue="unassigned">
              Unassigned <span class="queue-pill-badge">${challans.filter(c => c.status === 'unassigned').length}</span>
            </button>
            <button class="queue-pill-btn" data-queue="overdue">
              Overdue <span class="queue-pill-badge">${challans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== 'paid').length}</span>
            </button>
            <button class="queue-pill-btn" data-queue="dueSoon">
              Due in 7 Days <span class="queue-pill-badge">${challans.filter(c => Utils.getDaysRemaining(c.dueDate) >= 0 && Utils.getDaysRemaining(c.dueDate) <= 7 && c.status !== 'paid').length}</span>
            </button>
            <button class="queue-pill-btn" data-queue="dispute">
              Disputed / Court <span class="queue-pill-badge">${challans.filter(c => c.status === 'disputed' || c.status === 'court').length}</span>
            </button>
          </div>

          <!-- Recent Activities Table -->
          <div class="finexy-table-wrapper" style="overflow-x: auto;">
            <table class="finexy-table">
              <thead>
                <tr>
                  <th style="width: 32px;"><input type="checkbox" id="selectAllAttentionCheckbox" title="Select all items"></th>
                  <th>Order / Notice ID</th>
                  <th>Activity / Violation</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date &amp; Time</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="dashboardAttentionList">
                ${renderAttentionItems(challans.filter(c => c.status !== 'paid'))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  `;

  // --------------------------------------------------------------------------
  // ATTACH QUEUE FILTER & SEARCH EVENT LISTENERS
  // --------------------------------------------------------------------------
  const pillBtns = container.querySelectorAll(".queue-pill-btn");
  const listContainer = container.querySelector("#dashboardAttentionList");
  const searchInput = container.querySelector("#dashboardTableSearchInput");

  function getActiveFilteredList() {
    const activeBtn = container.querySelector(".queue-pill-btn.active");
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

  if (pillBtns && listContainer) {
    pillBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        pillBtns.forEach(b => b.classList.remove("active"));
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
 * Render Finexy Profit & Loss Style Dual Stacked Bar Chart across 8 Months
 * Featuring distinctive diagonal hatching patterns and dual-tone gradients from Dribbble reference
 */
function renderFinexyDualBarChart(challans) {
  const months = [
    { label: "Jan", newCount: 38, settledCount: 22, patterned: true },
    { label: "Feb", newCount: 42, settledCount: 18, patterned: false },
    { label: "Mar", newCount: 36, settledCount: 25, patterned: true },
    { label: "Apr", newCount: 41, settledCount: 20, patterned: false },
    { label: "May", newCount: 48, settledCount: 28, patterned: true },
    { label: "Jun", newCount: 52, settledCount: 34, patterned: false },
    { label: "Jul", newCount: 39, settledCount: 26, patterned: true },
    { label: "Aug", newCount: 33, settledCount: 19, patterned: false }
  ];

  const chartHeight = 155;
  const chartWidth = 430;
  const barWidth = 24;
  const startX = 45;
  const gap = (chartWidth - startX - (months.length * barWidth)) / (months.length - 1);
  const maxVal = 60; // 50k scale

  // Y-axis ticks: 50k, 40k, 30k, 20k, 10k, 00
  const yTicks = [
    { label: "50k", val: 50 },
    { label: "40k", val: 40 },
    { label: "30k", val: 30 },
    { label: "20k", val: 20 },
    { label: "10k", val: 10 },
    { label: "00", val: 0 }
  ];

  let gridLines = "";
  yTicks.forEach(tick => {
    const yPos = chartHeight - (tick.val / maxVal) * (chartHeight - 30);
    gridLines += `
      <text x="5" y="${yPos + 4}" fill="#A0A6B0" font-size="10" font-family="'Inter', sans-serif" font-weight="500">${tick.label}</text>
      <line x1="32" y1="${yPos}" x2="${chartWidth}" y2="${yPos}" stroke="#EFF2F6" stroke-width="1" />
    `;
  });

  let barsHTML = "";
  months.forEach((m, idx) => {
    const xPos = startX + idx * (barWidth + gap);
    
    // Stacked heights
    const settledHeight = (m.settledCount / maxVal) * (chartHeight - 30);
    const newHeight = (m.newCount / maxVal) * (chartHeight - 30) * 0.72; // top bar

    const ySettled = chartHeight - settledHeight;
    const yNew = ySettled - newHeight - 3; // 3px gap between stacked bars
    const fillPattern = m.patterned ? "url(#finexyHatchPattern)" : "url(#finexyAquaGrad)";

    barsHTML += `
      <g style="cursor: pointer;" onclick="navigateTo('challans', true, { search: '${m.label}' })">
        <!-- Top Bar (New Notices) with alternating graphic hatch pattern -->
        <rect x="${xPos}" y="${Math.max(12, yNew)}" width="${barWidth}" height="${Math.max(4, newHeight)}" rx="5" fill="${fillPattern}">
          <title>${m.label}: ${m.newCount} New Infractions</title>
        </rect>
        
        <!-- Dark Charcoal Bottom Bar (Settled) -->
        <rect x="${xPos}" y="${ySettled}" width="${barWidth}" height="${Math.max(4, settledHeight)}" rx="5" fill="url(#finexyDarkGrad)">
          <title>${m.label}: ${m.settledCount} Settled</title>
        </rect>

        <!-- X-axis Month Label -->
        <text x="${xPos + barWidth / 2}" y="${chartHeight + 18}" text-anchor="middle" fill="#777D88" font-size="11" font-weight="500" font-family="'Inter', sans-serif">${m.label}</text>
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight + 28}" style="width: 100%; height: auto; display: block; overflow: visible;">
      <defs>
        <!-- Finexy Diagonal Stripe Pattern for Data Graphics -->
        <pattern id="finexyHatchPattern" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#E8FAF8" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#43D8C5" stroke-width="2.6" />
        </pattern>
        <!-- Solid Aqua Gradient -->
        <linearGradient id="finexyAquaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#43D8C5" />
          <stop offset="100%" stop-color="#20BFAB" />
        </linearGradient>
        <!-- Rich Dark Charcoal Gradient -->
        <linearGradient id="finexyDarkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#242329" />
          <stop offset="100%" stop-color="#141318" />
        </linearGradient>
      </defs>
      ${gridLines}
      ${barsHTML}
    </svg>
  `;
}

/**
 * Determine colourful icon badge for each violation category
 */
function getOffenceIconBadge(offenceText) {
  const text = (offenceText || "").toLowerCase();
  
  if (text.includes("speed") || text.includes("fast")) {
    return {
      icon: "🚗",
      bg: "#EFF8FF",
      border: "#B2DDFF",
      color: "#175CD3",
      label: "Speeding"
    };
  } else if (text.includes("signal") || text.includes("red light") || text.includes("light")) {
    return {
      icon: "🚦",
      bg: "#FEF3F2",
      border: "#FECDCA",
      color: "#B42318",
      label: "Signal Jump"
    };
  } else if (text.includes("parking") || text.includes("park")) {
    return {
      icon: "🅿",
      bg: "#FFF9EB",
      border: "#FEDF89",
      color: "#B54708",
      label: "No Parking"
    };
  } else if (text.includes("document") || text.includes("puc") || text.includes("fitness") || text.includes("insurance") || text.includes("rc")) {
    return {
      icon: "📄",
      bg: "#F8F9FC",
      border: "#D5D9EB",
      color: "#3E4784",
      label: "Doc / PUC"
    };
  } else if (text.includes("seat") || text.includes("belt")) {
    return {
      icon: "💺",
      bg: "#ECFDF3",
      border: "#A6F4C5",
      color: "#027A48",
      label: "Seatbelt"
    };
  } else if (text.includes("overload") || text.includes("weight") || text.includes("axle")) {
    return {
      icon: "⚖",
      bg: "#FDF2FA",
      border: "#FCCEEE",
      color: "#C11574",
      label: "Overloading"
    };
  } else if (text.includes("lane") || text.includes("dangerous") || text.includes("rash")) {
    return {
      icon: "⚠️",
      bg: "#F9F5FF",
      border: "#E9D7FE",
      color: "#6941C6",
      label: "Dangerous Driving"
    };
  }

  return {
    icon: "📋",
    bg: "#F4F5F8",
    border: "#EAECF0",
    color: "#475467",
    label: "MV Infraction"
  };
}

/**
 * Format date to the exact Finexy style: "17 Apr, 2026 03:45 PM"
 */
function formatFinexyDateTime(dateStr) {
  if (!dateStr) return "17 Apr, 2026 11:30 AM";
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
    hours = hours ? hours : 12; // 0 becomes 12
    const strHours = String(hours).padStart(2, '0');
    return `${day} ${month}, ${year} ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Render Actionable Attention Table Rows matching the Finexy Recent Activities table
 */
function renderAttentionItems(items) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px 16px; color: #98A2B3;">
          <div style="font-size: 24px; margin-bottom: 8px;">✓</div>
          <div style="font-size: 14px; font-weight: 600; color: #344054;">No Urgent Action Items</div>
          <div style="font-size: 12px; color: #667085; margin-top: 2px;">All infractions in this queue are resolved or up to date.</div>
        </td>
      </tr>
    `;
  }

  return items.slice(0, 10).map(c => {
    const daysLeft = Utils.getDaysRemaining(c.dueDate);
    const isOverdue = daysLeft < 0;
    const isUnassigned = c.status === "unassigned";
    const badge = getOffenceIconBadge(c.offence);
    const formattedDate = formatFinexyDateTime(c.offenceDate || c.date || c.dueDate);

    // Finexy status class & label
    let statusClass = "finexy-status-inprogress";
    let statusLabel = "In Progress";

    if (c.status === "paid") {
      statusClass = "finexy-status-completed";
      statusLabel = "Completed";
    } else if (c.status === "unassigned") {
      statusClass = "finexy-status-pending";
      statusLabel = "Pending";
    } else if (c.status === "disputed" || c.status === "court") {
      statusClass = "finexy-status-disputed";
      statusLabel = c.status === "court" ? "In Court" : "Disputed";
    }

    return `
      <tr class="finexy-table-row">
        <!-- Checkbox -->
        <td style="width: 32px;">
          <input type="checkbox" class="finexy-row-checkbox" value="${c.id}">
        </td>

        <!-- Order / Notice ID -->
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="color: #151B2B; font-weight: 600; font-size: 13px; cursor: pointer;" onclick="navigateTo('challans', true, { id: '${c.id}' })">
              ${c.challanNumber}
            </strong>
            <span class="finexy-currency-badge" style="font-size: 10px; padding: 1px 6px;">
              ${c.vehicleReg}
            </span>
          </div>
        </td>

        <!-- Activity / Violation -->
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="finexy-icon-tag" style="background: ${badge.bg}; border: 1px solid ${badge.border}; color: ${badge.color};">
              ${badge.icon}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 13px; color: #151B2B;">
                ${badge.label}
              </div>
              <div style="font-size: 11px; color: #667085; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.offence}">
                ${c.offence}
              </div>
            </div>
          </div>
        </td>

        <!-- Amount -->
        <td>
          <div style="font-weight: 700; font-size: 13px; color: #151B2B; font-variant-numeric: tabular-nums;">
            ${Utils.formatINR(c.amount)}
          </div>
          ${c.lateFee ? `<div style="font-size: 10px; color: #C24141;">+${Utils.formatINR(c.lateFee)} late fee</div>` : ''}
        </td>

        <!-- Status -->
        <td>
          <div class="finexy-status-cell ${statusClass}">
            <span class="dot"></span>
            <span>${statusLabel}</span>
          </div>
        </td>

        <!-- Date & Time -->
        <td>
          <div style="font-size: 12px; color: #667085; white-space: nowrap;">
            ${formattedDate}
          </div>
        </td>

        <!-- Action Trigger -->
        <td style="text-align: right;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            ${isUnassigned ? `
              <button class="finexy-btn-lime" style="padding: 4px 10px; font-size: 11px;" onclick="openAssignmentModal('${c.id}')" title="Assign responsible party">
                Assign
              </button>
            ` : (c.status !== 'court' && c.status !== 'paid' ? `
              <button class="finexy-btn-soft" style="padding: 4px 10px; font-size: 11px;" onclick="openPaymentModal('${c.id}')" title="Settle via payment simulation">
                Pay
              </button>
            ` : '')}
            <button class="finexy-more-btn" onclick="navigateTo('challans', true, { id: '${c.id}' })" title="View notice details">
              •••
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
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
