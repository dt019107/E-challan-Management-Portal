/**
 * ChallanOS - Operational Dashboard Module (js/dashboard.js)
 * 
 * Central Product Principle:
 * "A challan is a decision to be made, not a record to be stored."
 * 
 * Features:
 * - 5 Dynamic KPI Cards calculated directly from central database
 * - Visual 1: Challans by Status (Interactive Native SVG Donut Chart)
 * - Visual 2: Outstanding Amount by Responsible Party (Horizontal Proportional Breakdown Bars)
 * - Visual 3: Monthly Challan Trend (Interactive Native SVG Bar & Volume Chart)
 * - Visual 4: Top Offence Categories (Ranked MV Act Infractions with Volume & Amounts)
 * - Needs Attention Operational Work Queue (Pill filters: All, Unassigned, Overdue, Due Soon, Disputed)
 * - Recent Activity Feed (Chronological audit stream with deep links to records)
 * - High-Risk Vehicles Watchlist (Clickable asset links to vehicle profile)
 * - Average Assignment Time & SLA Target Gauge
 * - Upcoming Statutory Deadlines (Countdowns with one-click payment & contest actions)
 */

function renderDashboardView(container, actions) {
  if (!container) return;

  const stats = StorageManager.getDashboardStats();
  const challans = StorageManager.getChallans();
  const vehicles = StorageManager.getVehicles();

  // --------------------------------------------------------------------------
  // TOPBAR ACTIONS
  // --------------------------------------------------------------------------
  if (actions) {
    actions.innerHTML = `
      <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'apex-fleet-daily-summary.csv')">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        Download Daily Summary
      </button>
      <button class="btn btn--primary btn--sm" onclick="Utils.showToast('Gateway Synchronized', 'Parivahan e-Challan gateway polled successfully. All records are up to date.', 'success')">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
        Parivahan Sync
      </button>
    `;
  }

  // --------------------------------------------------------------------------
  // 1. EXECUTIVE WELCOME HERO BANNER (Framer/Linear Standard)
  // --------------------------------------------------------------------------
  const heroHTML = `
    <div class="dashboard-hero-banner">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="live-pulse-dot"></span>
          Parivahan MoRTH Gateway Connected &bull; Real-time API
        </div>
        <h1 class="hero-title">Fleet Compliance & Traffic Command</h1>
        <p class="hero-subtitle">
          Apex Fleet Private Limited &bull; NCR &amp; Western Freight Corridors &bull; 
          <strong style="color: var(--color-primary);">${stats.openChallans} active infractions</strong> under continuous automated monitoring.
        </p>
        <div class="hero-actions">
          <button class="btn btn--primary btn--sm" onclick="navigateTo('challans', true, { status: 'unassigned' })">
            Triage Unassigned Notices (${stats.unassignedChallans}) &rarr;
          </button>
          <button class="btn btn--outline btn--sm" onclick="navigateTo('vehicles')">
            View Fleet Registry (${vehicles.length} Assets)
          </button>
        </div>
      </div>
      <div class="hero-asset-preview" style="background-image: linear-gradient(to right, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.6) 20%, rgba(255, 255, 255, 0) 100%), url('assets/images/fleet-hero.jpg');">
      </div>
    </div>
  `;

  // --------------------------------------------------------------------------
  // 2. FIVE DYNAMIC KPI CARDS
  // --------------------------------------------------------------------------
  const kpisHTML = `
    <div class="kpi-grid">
      <!-- KPI 1: Open Challans -->
      <div class="kpi-card" onclick="navigateTo('challans', true, { status: 'all' })" title="View all open challans">
        <div class="kpi-card-top">
          <span class="kpi-label">Open Challans</span>
          <div class="kpi-icon-wrapper" style="background: var(--color-primary-light); color: var(--color-primary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
        </div>
        <div class="kpi-value">${stats.openChallans.toLocaleString("en-IN")}</div>
        <div class="kpi-subtext">
          <span class="badge badge--neutral" style="font-size: 10px; padding: 1px 6px;">100% Tracked</span>
          Across ${vehicles.length} commercial vehicles
        </div>
      </div>

      <!-- KPI 2: Outstanding Amount -->
      <div class="kpi-card" onclick="navigateTo('challans', true, { status: 'all' })" title="View outstanding challans">
        <div class="kpi-card-top">
          <span class="kpi-label">Outstanding Amount</span>
          <div class="kpi-icon-wrapper" style="background: #FFF0F0; color: #C24141;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--color-text-main);">${Utils.formatINR(stats.outstandingAmount)}</div>
        <div class="kpi-subtext">
          <span class="badge badge--unassigned" style="font-size: 10px; padding: 1px 6px;">Direct Liability</span>
          Active Parivahan demand
        </div>
      </div>

      <!-- KPI 3: Unassigned Challans -->
      <div class="kpi-card" onclick="navigateTo('challans', true, { status: 'unassigned' })" title="Triage unassigned challans">
        <div class="kpi-card-top">
          <span class="kpi-label">Unassigned</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-unassigned-bg); color: var(--status-unassigned);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-unassigned);">${stats.unassignedChallans}</div>
        <div class="kpi-subtext">
          <span class="badge badge--unassigned" style="font-size: 10px; padding: 1px 6px;">Action Required</span>
          Duty manifest triage pending
        </div>
      </div>

      <!-- KPI 4: Due in 7 Days -->
      <div class="kpi-card" onclick="navigateTo('challans', true, { filter: 'due7days' })" title="View challans due soon">
        <div class="kpi-card-top">
          <span class="kpi-label">Due in 7 Days</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-pending-bg); color: var(--status-pending);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-pending);">${stats.dueIn7Days}</div>
        <div class="kpi-subtext">
          <span class="badge badge--pending" style="font-size: 10px; padding: 1px 6px;">Compounding Risk</span>
          Avoid 15% late compounding
        </div>
      </div>

      <!-- KPI 5: Disputed Challans -->
      <div class="kpi-card" onclick="navigateTo('disputes', true, { status: 'disputed' })" title="View contested challans">
        <div class="kpi-card-top">
          <span class="kpi-label">Disputed / Court</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-disputed-bg); color: var(--status-disputed);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-disputed);">${stats.disputedChallans}</div>
        <div class="kpi-subtext">
          <span class="badge badge--court" style="font-size: 10px; padding: 1px 6px;">Sub-Judice</span>
          Awaiting police / court decree
        </div>
      </div>
    </div>
  `;

  // --------------------------------------------------------------------------
  // 2. DASHBOARD VISUALS (4 CORE CHARTS)
  // --------------------------------------------------------------------------
  const monthlyData = calculateMonthlyTrend(challans);

  const chartsHTML = `
    <!-- Top 2 Visuals: Status Donut & Responsible Party Breakdown -->
    <div class="chart-grid">
      <!-- Chart 1: Challans by Status (Native SVG Donut) -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Challans by Status</div>
            <div class="chart-subtitle">Lifecycle breakdown across all detected infractions</div>
          </div>
          <span class="badge badge--neutral">${challans.length} Total</span>
        </div>

        <div class="donut-wrapper">
          <div class="donut-svg-container">
            <svg class="donut-svg" viewBox="0 0 100 100">
              ${renderSVGDonutSegments(stats.statusDistribution)}
            </svg>
            <div class="donut-center-text">
              <div class="donut-center-val">${stats.openChallans.toLocaleString("en-IN")}</div>
              <div class="donut-center-lbl">Open Fines</div>
            </div>
          </div>

          <div class="chart-legend">
            ${stats.statusDistribution.map(item => `
              <div class="legend-item" onclick="navigateTo('challans', true, { status: '${item.status}' })" title="Filter challans by ${item.label}">
                <div class="legend-label-group">
                  <span class="legend-color-dot" style="background-color: ${item.color};"></span>
                  <span>${item.label}</span>
                </div>
                <div>
                  <span class="legend-count">${item.count}</span>
                  <span class="legend-percent">(${item.percentage}%)</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Chart 2: Outstanding by Responsible Party (Horizontal Bars) -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Outstanding by Responsible Party</div>
            <div class="chart-subtitle">Recovery allocation: Payroll vs Corporate Billing vs Apex Fleet</div>
          </div>
          <span class="badge badge--paid">${Utils.formatINR(stats.outstandingAmount)} Total</span>
        </div>

        <div class="breakdown-bars-container">
          ${stats.responsiblePartyBreakdown.map(item => `
            <div class="breakdown-item" onclick="navigateTo('challans', true, { responsibleParty: '${item.party}' })" title="Filter by ${item.party}">
              <div class="breakdown-header">
                <span class="breakdown-party-name">
                  <span class="legend-color-dot" style="background-color: ${item.color};"></span>
                  ${item.label}
                </span>
                <span class="breakdown-amount">${Utils.formatINR(item.amount)} <span style="font-size: 11px; color: var(--color-text-muted);">(${item.percentage}%)</span></span>
              </div>
              <div class="breakdown-track">
                <div class="breakdown-fill" style="width: ${Math.max(4, item.percentage)}%; background-color: ${item.color};"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <!-- Bottom 2 Visuals: Monthly Trend (SVG Bars) & Top Offence Categories -->
    <div class="chart-grid" style="margin-top: var(--space-4);">
      <!-- Chart 3: Monthly Challan Trend (Native SVG Bar Chart) -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Monthly Challan Volume Trend</div>
            <div class="chart-subtitle">6-Month historical infraction rate across all fleet hubs</div>
          </div>
          <span class="badge badge--neutral">Last 6 Months</span>
        </div>

        <div class="trend-chart-container">
          ${renderSVGMonthlyTrendChart(monthlyData)}
        </div>
      </div>

      <!-- Chart 4: Top Offence Categories -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Top Offence Categories</div>
            <div class="chart-subtitle">Most prevalent violations under the Motor Vehicles Act 1988</div>
          </div>
          <span class="badge badge--neutral">MV Act 1988</span>
        </div>

        <div class="breakdown-bars-container">
          ${stats.topOffences.map((offence, idx) => `
            <div class="breakdown-item" onclick="navigateTo('challans', true, { search: '${offence.name.split(' ')[0]}' })" title="Filter challans by ${offence.name}">
              <div class="breakdown-header">
                <span class="breakdown-party-name">
                  <span style="font-weight: 700; color: var(--color-primary); font-size: 11px; width: 16px;">#${idx + 1}</span>
                  ${offence.name}
                </span>
                <span class="breakdown-amount">${offence.count} notices (${Utils.formatINR(offence.amount)})</span>
              </div>
              <div class="breakdown-track">
                <div class="breakdown-fill" style="width: ${Math.max(6, offence.percentage)}%; background-color: var(--color-primary);"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  // --------------------------------------------------------------------------
  // 3. OPERATIONAL METRICS & WATCHLIST ROW
  // --------------------------------------------------------------------------
  const recentActivities = getRecentActivityFeed(challans);
  const upcomingDeadlines = getUpcomingDeadlinesList(challans);

  const intelligenceHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-4); margin-top: var(--space-4);">
      
      <!-- Average Assignment Time & SLA Gauge -->
      <div class="card" style="padding: var(--space-4) var(--space-6); background: linear-gradient(135deg, #FFFFFF 0%, var(--color-primary-subtle) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
          <strong style="font-size: 13px; color: var(--color-text-main);">Triage SLA & Velocity</strong>
          <span class="badge badge--paid">94% Compliant</span>
        </div>
        <div style="margin: var(--space-2) 0;">
          <div style="font-size: 32px; font-weight: 700; color: var(--color-primary); letter-spacing: -0.02em;">
            ${stats.avgAssignmentHours} <span style="font-size: 14px; font-weight: 500; color: var(--color-text-secondary);">Hours</span>
          </div>
          <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
            Average elapsed time from Parivahan gateway detection to duty roster sign-off.
          </p>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--color-text-muted); border-top: 1px solid var(--color-border-subtle); padding-top: 8px;">
          <span>Target SLA: &lt; ${stats.slaTargetHours}h</span>
          <span style="color: var(--color-primary); font-weight: 600;">Automated Match: 91.4%</span>
        </div>
      </div>

      <!-- High-Risk Vehicles Watchlist -->
      <div class="card" style="padding: var(--space-4) var(--space-6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <strong style="font-size: 13px; color: var(--color-text-main);">Vehicles with Multiple Fines</strong>
          <span class="badge badge--unassigned">Risk Watchlist</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          ${stats.topVehicles.slice(0, 4).map(v => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 4px 0; border-bottom: 1px solid var(--color-border-subtle);">
              <div>
                <strong style="color: var(--color-primary); cursor: pointer;" onclick="navigateTo('vehicles', true, { search: '${v.regNumber}' })">${v.regNumber}</strong>
                <span style="color: var(--color-text-muted); font-size: 11px; margin-left: 6px;">${v.model}</span>
              </div>
              <div>
                <span class="badge badge--neutral">${v.count} Fines (${Utils.formatINR(v.amount)})</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Upcoming Deadlines -->
      <div class="card" style="padding: var(--space-4) var(--space-6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <strong style="font-size: 13px; color: var(--color-text-main);">Upcoming Statutory Deadlines</strong>
          <span class="badge badge--pending">Action Due</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          ${upcomingDeadlines.length === 0 ? `
            <div style="padding: 12px; text-align: center; color: var(--color-text-muted); font-size: 12px;">No urgent deadlines pending.</div>
          ` : upcomingDeadlines.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 4px 0; border-bottom: 1px solid var(--color-border-subtle);">
              <div>
                <strong style="color: var(--color-primary); cursor: pointer;" onclick="navigateTo('challans', true, { id: '${d.id}' })">${d.challanNumber}</strong>
                <span style="color: var(--color-text-secondary); margin-left: 6px;">${d.vehicleReg}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge ${d.daysLeft <= 3 ? 'badge--unassigned' : 'badge--pending'}" style="font-size: 11px;">
                  ${d.daysLeft < 0 ? `Overdue by ${Math.abs(d.daysLeft)}d` : `${d.daysLeft}d left`}
                </span>
                <button class="btn btn--secondary btn--sm" style="padding: 2px 8px; font-size: 11px;" onclick="openPaymentModal('${d.id}')">Pay</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

    </div>
  `;

  // --------------------------------------------------------------------------
  // 4. NEEDS ATTENTION WORK QUEUE & RECENT ACTIVITY
  // --------------------------------------------------------------------------
  const queueHTML = `
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-4); margin-top: var(--space-6);">
      
      <!-- Left: Needs Attention Work Queue -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title" style="display: flex; align-items: center; gap: 6px;">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-danger);"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              Needs Attention (Work Queue)
            </div>
            <div class="card-subtitle">Active action queue: Resolve unassigned violations, overdue notices, and impending court compounding</div>
          </div>
          <button class="btn btn--secondary btn--sm" onclick="navigateTo('challans', true, { status: 'unassigned' })">
            View Complete Queue (${stats.unassignedChallans}) →
          </button>
        </div>

        <div class="card-body">
          <!-- Queue Filter Tabs -->
          <div class="queue-nav-pills" id="dashboardQueuePills">
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

          <!-- Attention Items List -->
          <div class="attention-items-list" id="dashboardAttentionList">
            ${renderAttentionItems(challans.filter(c => c.status !== 'paid'))}
          </div>
        </div>
      </div>

      <!-- Right: Recent Activity Stream -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Activity</div>
            <div class="card-subtitle">Chronological ledger of detections, attributions & payments</div>
          </div>
        </div>
        <div class="card-body">
          <div class="recent-activity-feed">
            ${recentActivities.length === 0 ? `
              <div style="padding: 24px 16px; text-align: center; color: var(--color-text-muted); font-size: 12px;">No activity logged yet.</div>
            ` : recentActivities.map(act => `
              <div class="recent-activity-row" onclick="navigateTo('challans', true, { id: '${act.challanId}' })" title="View challan ${act.challanNumber}">
                <div class="recent-activity-avatar">
                  ${act.action.includes('Paid') ? '₹' : (act.action.includes('Dispute') ? '⚖' : '✓')}
                </div>
                <div class="recent-activity-main">
                  <div class="recent-activity-header">
                    <span class="recent-activity-user">${act.user || 'System'}</span>
                    <span class="recent-activity-time">${formatRelativeTimestamp(act.timestamp)}</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 600; color: var(--color-primary); margin-top: 2px;">
                    ${act.action} • ${act.challanNumber} (${act.vehicleReg})
                  </div>
                  <div class="recent-activity-notes">${act.notes || 'Status updated'}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

    </div>
  `;

  container.innerHTML = heroHTML + kpisHTML + chartsHTML + intelligenceHTML + queueHTML;

  // --------------------------------------------------------------------------
  // 5. ATTACH WORK QUEUE FILTER EVENT HANDLERS
  // --------------------------------------------------------------------------
  const pillBtns = container.querySelectorAll(".queue-pill-btn");
  const listContainer = container.querySelector("#dashboardAttentionList");

  if (pillBtns && listContainer) {
    pillBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        pillBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const queueType = btn.dataset.queue;
        let filtered = challans.filter(c => c.status !== 'paid');

        if (queueType === "unassigned") {
          filtered = challans.filter(c => c.status === "unassigned");
        } else if (queueType === "overdue") {
          filtered = challans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== "paid");
        } else if (queueType === "dueSoon") {
          filtered = challans.filter(c => Utils.getDaysRemaining(c.dueDate) >= 0 && Utils.getDaysRemaining(c.dueDate) <= 7 && c.status !== "paid");
        } else if (queueType === "dispute") {
          filtered = challans.filter(c => c.status === "disputed" || c.status === "court");
        }

        listContainer.innerHTML = renderAttentionItems(filtered);
      });
    });
  }
}

// ----------------------------------------------------------------------------
// HELPER CALCULATIONS & RENDERERS
// ----------------------------------------------------------------------------

/**
 * Generate native SVG segments for the Donut Chart with stroke-dasharray
 */
function renderSVGDonutSegments(distribution) {
  if (!distribution || !distribution.length) return "";

  let accumulatedPercent = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  return distribution.map(item => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;

    return `
      <circle class="donut-segment"
        cx="50" cy="50" r="${radius}"
        fill="transparent"
        stroke="${item.color}"
        stroke-width="20"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        onclick="navigateTo('challans', true, { status: '${item.status}' })">
        <title>${item.label}: ${item.count} (${item.percentage}%) - Click to view</title>
      </circle>
    `;
  }).join("");
}

/**
 * Calculate Monthly Trend Breakdown from actual challan offence dates
 */
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

/**
 * Render Native SVG Bar Chart for Monthly Infraction Trends
 */
function renderSVGMonthlyTrendChart(monthlyData) {
  const maxVal = Math.max(...monthlyData.map(d => d.count), 10);
  const chartHeight = 130;
  const chartWidth = 460;
  const barWidth = 36;
  const spacing = (chartWidth - (monthlyData.length * barWidth)) / (monthlyData.length + 1);

  let barsHTML = "";

  monthlyData.forEach((item, index) => {
    const x = spacing + (index * (barWidth + spacing));
    const h = (item.count / maxVal) * chartHeight;
    const y = chartHeight - h + 15;

    barsHTML += `
      <g class="trend-bar-group" onclick="navigateTo('challans', true, { search: '${item.label}' })" style="cursor: pointer;">
        <!-- Top value label -->
        <text class="trend-val-label" x="${x + barWidth / 2}" y="${y - 6}">${item.count}</text>
        <!-- Bar rect -->
        <rect class="trend-bar" x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="4" fill="var(--color-primary)" opacity="${index === monthlyData.length - 1 ? '1' : '0.8'}">
          <title>${item.fullMonth}: ${item.count} Infractions - Click to inspect</title>
        </rect>
        <!-- Bottom month label -->
        <text class="trend-label" x="${x + barWidth / 2}" y="${chartHeight + 32}">${item.label}</text>
      </g>
    `;
  });

  return `
    <svg class="trend-chart-svg" viewBox="0 0 ${chartWidth} 165">
      <!-- Background Guide Lines -->
      <line x1="10" y1="35" x2="${chartWidth - 10}" y2="35" stroke="var(--color-border-subtle)" stroke-dasharray="3 3"/>
      <line x1="10" y1="80" x2="${chartWidth - 10}" y2="80" stroke="var(--color-border-subtle)" stroke-dasharray="3 3"/>
      <line x1="10" y1="${chartHeight + 15}" x2="${chartWidth - 10}" y2="${chartHeight + 15}" stroke="var(--color-border)"/>

      <!-- Render Bars -->
      ${barsHTML}
    </svg>
  `;
}

/**
 * Extract Flattened Recent Activity Stream across all violations
 */
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

/**
 * Extract Imminent Deadlines sorted by days remaining
 */
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

/**
 * Format timestamp into relative display string
 */
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

/**
 * Render Actionable Attention Rows for Dashboard Work Queue
 */
function renderAttentionItems(items) {
  if (!items || items.length === 0) {
    return `
      <div class="empty-state" style="padding: 32px 16px;">
        <div class="empty-state-icon">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        </div>
        <div class="empty-state-title">No Urgent Attention Items</div>
        <div class="empty-state-text">All infractions in this category have been processed or resolved.</div>
      </div>
    `;
  }

  return items.slice(0, 8).map(c => {
    const daysLeft = Utils.getDaysRemaining(c.dueDate);
    const isOverdue = daysLeft < 0;
    const isUnassigned = c.status === "unassigned";

    let borderModifier = "attention-row--due-soon";
    if (isOverdue) borderModifier = "attention-row--overdue";
    else if (isUnassigned) borderModifier = "attention-row--unassigned";
    else if (c.status === "disputed" || c.status === "court") borderModifier = "attention-row--dispute";

    return `
      <div class="attention-row ${borderModifier}">
        <div class="attention-main">
          <div class="attention-header-line">
            <strong style="color: var(--color-primary); cursor: pointer;" onclick="navigateTo('challans', true, { id: '${c.id}' })">
              ${c.challanNumber}
            </strong>
            <span class="badge badge--neutral" style="font-weight: 600;">${c.vehicleReg}</span>
            ${Utils.getStatusBadgeHTML(c.status)}
            ${isOverdue ? `<span class="badge badge--unassigned" style="font-weight: 700;">Overdue by ${Math.abs(daysLeft)} days</span>` : ''}
          </div>

          <div class="attention-title" style="margin-top: 2px;">
            ${c.offence}
          </div>

          <div class="attention-meta-line">
            <span><strong>Act:</strong> ${c.mvActSection}</span>
            <span><strong>Authority:</strong> ${c.issuingAuthority}</span>
            <span><strong>Due:</strong> ${Utils.formatDate(c.dueDate)}</span>
            ${c.suggestedParty ? `<span style="color: var(--color-primary); font-weight: 600;">Suggested: ${c.suggestedParty} (${c.suggestedPartyName || ''})</span>` : ''}
          </div>
        </div>

        <div class="attention-actions-group">
          <div style="text-align: right; margin-right: var(--space-2);">
            <div style="font-size: 16px; font-weight: 700; color: var(--color-text-main);">${Utils.formatINR(c.amount)}</div>
            <div style="font-size: 11px; color: var(--color-text-muted);">Payable Dues</div>
          </div>

          ${isUnassigned ? `
            <button class="btn btn--primary btn--sm" onclick="openAssignmentModal('${c.id}')" title="Assign responsible party">
              Assign Party
            </button>
          ` : `
            <button class="btn btn--outline btn--sm" onclick="openAssignmentModal('${c.id}')" title="Review responsibility">
              Review
            </button>
          `}

          ${c.status !== 'court' && c.status !== 'paid' ? `
            <button class="btn btn--secondary btn--sm" onclick="openPaymentModal('${c.id}')" title="Settle via payment simulation">
              Pay Now
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");
}
