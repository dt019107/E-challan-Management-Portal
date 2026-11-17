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

  const today = new Date();
  const formattedTodayDate = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="calm-dashboard-container">
      
      <!-- 1. GREETING HEADER (44px Serif with dynamic date line) -->
      <div class="calm-dashboard-header framer-animate-header">
        <div class="calm-header-left">
          <div class="calm-header-date">
            <span class="dot framer-live-dot"></span>
            <span>${formattedTodayDate} • MoRTH Parivahan Gateway Active</span>
          </div>
          <h1 class="calm-header-greeting">Good morning, Deepak</h1>
        </div>

        <div class="calm-header-actions">
          <button class="calm-btn-secondary" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'fleet-liability-audit.csv')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            Download Summary
          </button>
          <button class="calm-btn-secondary" id="parivahanSyncBtn" onclick="triggerParivahanSyncAnimation(this)">
            <svg class="sync-icon" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
            <span>Parivahan Sync</span>
          </button>
        </div>
      </div>

      <!-- 2. TOP ROW (12 COLUMNS: 7 / 5 ASYMMETRIC GRID) -->
      <div class="calm-grid-12 framer-animate-hero">
        
        <!-- COLUMN SPAN 7: THE HERO OUTSTANDING TILE (SF Pro Display Number, Zeigarnik Progress Bar, Restorff Action Hierarchy) -->
        <div class="calm-panel calm-span-7">
          <div>
            <div class="calm-hero-header-row">
              <span class="calm-hero-label">Outstanding fleet liability</span>
              <span class="calm-hero-trend">↑ 5.2% vs last 30d</span>
            </div>

            <div class="calm-hero-number" id="dashboardHeroNumber">
              ${Utils.formatINR(stats.outstandingAmount)}
            </div>

            <div class="calm-subtext">
              Across 32 active compliance notices across Delhi NCR, Mumbai Western Corridor, and Bengaluru Logistics Hubs.
            </div>

            <!-- Zeigarnik Effect: Resolution Completion Progress Widget -->
            <div class="compliance-progress-widget" style="margin: 10px 0 14px; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--line);">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; margin-bottom: 6px;">
                <span style="color: var(--text-2); font-weight: 500;">
                  <strong style="color: var(--ink); font-weight: 600;">88%</strong> Fleet Notices Reconciled (28/32 Cleared)
                </span>
                <span style="font-size: 11px; color: var(--color-danger); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-danger); display: inline-block;"></span>
                  4 Action Items Due
                </span>
              </div>
              <div style="height: 5px; width: 100%; background: var(--surface-3); border-radius: 9999px; overflow: hidden;">
                <div style="height: 100%; width: 87.5%; background: linear-gradient(90deg, var(--accent) 0%, #34C759 100%); border-radius: 9999px;"></div>
              </div>
            </div>

            <!-- Von Restorff Effect: Clear Action Focus (Time-Sensitive Triage vs Generic Settle) -->
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <button class="calm-btn-primary" onclick="navigateTo('challans', true, { status: 'unassigned' })" title="Adjudicate unassigned traffic notices before court escalation">
                <span>Assign Responsibility</span>
                <span style="background: rgba(255, 255, 255, 0.25); color: #FFFFFF; font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: 9999px; margin-left: 2px;">2 Due</span>
              </button>
              <button class="calm-btn-secondary" onclick="navigateTo('payments')" title="Settle notices in bulk via simulated payment">
                Settle Fines
              </button>
            </div>
          </div>

          <!-- Hairline divider and three plain columns with Signature Deadline Rulers -->
          <div class="calm-corridor-row">
            <div class="calm-corridor-col">
              <div class="calm-corridor-header">
                <span class="calm-corridor-title">NCR Corridor</span>
                <span class="calm-corridor-val">${Utils.formatINR(corridorAmounts.ncr)}</span>
              </div>
              <div class="deadline-ruler" title="Adjudication timeline (7-day window)">
                <div class="deadline-ruler-track">
                  <span class="deadline-ruler-tick past"></span>
                  <span class="deadline-ruler-tick past"></span>
                  <span class="deadline-ruler-tick past"></span>
                  <span class="deadline-ruler-tick due"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                </div>
              </div>
              <div class="calm-corridor-sub">Limit ₹50k/mo • 4d window</div>
            </div>
            <div class="calm-corridor-col">
              <div class="calm-corridor-header">
                <span class="calm-corridor-title">Mumbai Western</span>
                <span class="calm-corridor-val">${Utils.formatINR(corridorAmounts.mumbai)}</span>
              </div>
              <div class="deadline-ruler" title="Adjudication timeline (7-day window)">
                <div class="deadline-ruler-track">
                  <span class="deadline-ruler-tick past"></span>
                  <span class="deadline-ruler-tick past"></span>
                  <span class="deadline-ruler-tick due"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                </div>
              </div>
              <div class="calm-corridor-sub">Limit ₹35k/mo • 5d window</div>
            </div>
            <div class="calm-corridor-col">
              <div class="calm-corridor-header">
                <span class="calm-corridor-title">Bengaluru Hub</span>
                <span class="calm-corridor-val">${Utils.formatINR(corridorAmounts.blr)}</span>
              </div>
              <div class="deadline-ruler" title="Adjudication timeline (7-day window)">
                <div class="deadline-ruler-track">
                  <span class="deadline-ruler-tick past"></span>
                  <span class="deadline-ruler-tick due"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                  <span class="deadline-ruler-tick"></span>
                </div>
              </div>
              <div class="calm-corridor-sub">Limit ₹25k/mo • 6d window</div>
            </div>
          </div>
        </div>

        <!-- COLUMN SPAN 5: THE DUE-IN-7-DAYS DARK PHOTO PANEL (Real Indian highway truck photo under warm monochrome scrim) -->
        <div class="calm-navy-photo-panel calm-span-5">
          <div>
            <div class="calm-hero-header-row">
              <span class="calm-photo-label">Impending deadline (7 days)</span>
              <span class="calm-photo-sublabel">Toll &amp; Highway Radar</span>
            </div>

            <div class="calm-navy-number">
              ₹24,800
            </div>

            <div class="calm-navy-desc">
              14 commercial notices entering judicial compounding penalty within 7 business days if unadjudicated.
            </div>
          </div>
        </div>

      </div>

      <!-- PRIORITISED WORK QUEUE: NEEDS ATTENTION (Case Study Page 12, Screen 1) -->
      <div class="calm-panel framer-animate-hero" style="margin-top: var(--space-4); padding: 16px 20px; border-radius: var(--radius-card); border: 1px solid var(--line); background: var(--surface);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line); flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 14px; color: var(--ink);">Needs attention</span>
            <span class="badge badge--unassigned" style="font-size: 10px; padding: 2px 7px; border-radius: 9999px;">Prioritised Work Queue</span>
          </div>
          <span style="font-size: 11.5px; color: var(--text-2);">Ranked by financial urgency • Action required today</span>
        </div>

        <!-- Zeigarnik Effect: Weekly Triage Velocity & Closure Meter -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 8px 14px; background: rgba(0, 113, 227, 0.04); border: 1px solid rgba(0, 113, 227, 0.12); border-radius: 8px; margin-bottom: 10px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 13px;">⚡</span>
            <span style="font-size: 12px; font-weight: 600; color: var(--ink);">Resolution Velocity:</span>
            <span style="font-size: 12px; color: var(--text-2);">
              <strong>${clearedChallansCount} of ${challans.length}</strong> fleet citations resolved (${totalResolutionRate}% cleared)
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 100px; height: 5px; background: var(--surface-3); border-radius: 9999px; overflow: hidden;">
              <div style="width: ${totalResolutionRate}%; height: 100%; background: var(--color-primary); border-radius: 9999px; transition: width 0.3s ease;"></div>
            </div>
            <span style="font-size: 11.5px; font-weight: 700; color: var(--color-primary); font-variant-numeric: tabular-nums;">
              ${overdueChallans.length + unassignedChallans.length} action items remaining
            </span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          
          <!-- 1. Overdue (Highest rank: compounding late fee risk) -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--line); flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge badge--unassigned" style="font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 9999px;">Overdue</span>
              <span style="font-size: 12.5px; color: var(--ink);">
                <strong>${overdueChallans.length} challans</strong> past due date — compounding statutory late fee risk
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-weight: 700; font-size: 13px; color: var(--status-unassigned); font-variant-numeric: tabular-nums;">
                ${Utils.formatINR(overdueAmount)}
              </span>
              <button class="btn btn--secondary btn--sm" style="height: 30px; padding: 0 14px; font-size: 12px;" onclick="navigateTo('challans', true, { filter: 'overdue' })">
                Review
              </button>
            </div>
          </div>

          <!-- 2. Unassigned (Needs owner) -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--line); flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge badge--unassigned" style="font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 9999px;">Unassigned</span>
              <span style="font-size: 12.5px; color: var(--ink);">
                <strong>${unassignedChallans.length} new challans</strong> from last sync have no responsible party attributed
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn btn--primary btn--sm" style="height: 30px; padding: 0 14px; font-size: 12px;" onclick="navigateTo('challans', true, { status: 'unassigned' })">
                Assign
              </button>
              <button class="btn btn--secondary btn--sm" style="height: 30px; padding: 0 14px; font-size: 12px;" onclick="navigateTo('challans', true, { status: 'unassigned' })">
                Review
              </button>
            </div>
          </div>

          <!-- 3. Disputed (Awaiting evidence/hearing) -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--line); flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge badge--pending" style="font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 9999px;">Disputed</span>
              <span style="font-size: 12.5px; color: var(--ink);">
                <strong>${disputedChallans.length} disputes</strong> awaiting evidence upload or virtual court order
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-weight: 700; font-size: 13px; color: var(--ink); font-variant-numeric: tabular-nums;">
                ${Utils.formatINR(disputedAmount)}
              </span>
              <button class="btn btn--secondary btn--sm" style="height: 30px; padding: 0 14px; font-size: 12px;" onclick="navigateTo('disputes')">
                Review
              </button>
            </div>
          </div>

          <!-- 4. Failed (Retry or switch payment method) -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--line); flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge badge--neutral" style="font-weight: 700; font-size: 11px; padding: 3px 8px; color: #D92D20; border-color: rgba(217, 45, 32, 0.2); border-radius: 9999px;">Failed</span>
              <span style="font-size: 12.5px; color: var(--ink);">
                <strong>${failedChallans.length > 0 ? failedChallans.length : 1} payment failed</strong> — gateway timeout or debited without confirmation
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-weight: 700; font-size: 13px; color: var(--text-2); font-variant-numeric: tabular-nums;">
                ${Utils.formatINR(failedAmount)}
              </span>
              <button class="btn btn--secondary btn--sm" style="height: 30px; padding: 0 14px; font-size: 12px;" onclick="navigateTo('payments')">
                Review
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- 3. MIDDLE ROW (12 COLUMNS: 7 / 5 ASYMMETRIC GRID) -->
      <div class="calm-grid-12 framer-animate-charts">
        
        <!-- COLUMN SPAN 7: CUSTOM BAR CHART (14px Bars, 6px Radius Tops, Indigo Current Month, Floating Tooltip) -->
        <div class="calm-panel calm-span-7">
          <div class="calm-chart-header">
            <div>
              <div class="calm-chart-title">Notice &amp; Settlement Velocity</div>
              <div class="calm-chart-sub">Monthly trend across national fleet operations</div>
            </div>
            <div class="calm-chart-legend">
              <div class="calm-chart-legend-item">
                <span class="calm-chart-legend-dot" style="background: var(--surface-2); border: 1px solid var(--line-strong);"></span>
                <span>Past Months</span>
              </div>
              <div class="calm-chart-legend-item">
                <span class="calm-chart-legend-dot" style="background: var(--accent);"></span>
                <span style="color: var(--ink); font-weight: 500;">Current Month</span>
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
            <!-- SVG Donut with 10px stroke, butt caps, 2px gap & serif central counter -->
            ${renderLiabilityDonutChart(challans)}

            <!-- Hairline Category Breakdown List -->
            <div class="calm-donut-list">
              <div class="calm-donut-row">
                <div class="calm-donut-name">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #0071E3;"></span>
                  <span>Driver Trips</span>
                </div>
                <div class="calm-donut-pct">42% (₹54,600)</div>
              </div>

              <div class="calm-donut-row">
                <div class="calm-donut-name">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #0066CC;"></span>
                  <span>Lessee Contracts</span>
                </div>
                <div class="calm-donut-pct">38% (₹49,400)</div>
              </div>

              <div class="calm-donut-row">
                <div class="calm-donut-name">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #86868B;"></span>
                  <span>Fleet Default</span>
                </div>
                <div class="calm-donut-pct">20% (₹26,010)</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 4. BOTTOM ROW (SPAN 12: ACTION QUEUE & RECENT INFRACTIONS) -->
      <div class="calm-panel calm-span-12 framer-animate-table">
        
        <div class="calm-table-header">
          <div>
            <div class="calm-chart-title">Action Queue &amp; Recent Infractions</div>
            <div class="calm-chart-sub">Live compliance triage requiring financial or legal adjudication</div>
          </div>

          <!-- Queue Filter Tabs & Search Control -->
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
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
              <svg style="position: absolute; left: 10px; top: 10px; pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="dashboardTableSearchInput" class="calm-search-input" placeholder="Search notices, plates...">
            </div>
          </div>
        </div>

        <!-- Strict 56px Table Rows, No Vertical Lines, 11px Uppercase Tracked Headers -->
        <div style="overflow-x: auto; margin-top: 8px;">
          <table class="calm-table">
            <thead>
              <tr>
                <th style="width: 36px;"><input type="checkbox" id="selectAllAttentionCheckbox" title="Select all items"></th>
                <th style="width: 150px;">Notice ID</th>
                <th style="width: 140px;">Vehicle Plate</th>
                <th>Violation / Offence</th>
                <th class="text-right" style="width: 120px;">Amount</th>
                <th style="width: 130px;">Status</th>
                <th class="col-nice" style="width: 180px;">Offence Timestamp</th>
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
      <tr class="row-interactive ${isUrgent ? 'row-urgent-risk' : ''}" onclick="if(!event.target.closest('input') && !event.target.closest('button')) navigateTo('challans', true, { id: '${c.id}' })" title="Click anywhere to inspect notice details">
        <!-- Checkbox -->
        <td style="width: 36px;">
          <input type="checkbox" value="${c.id}" class="custom-checkbox">
        </td>

        <!-- Notice ID -->
        <td>
          <span style="font-family: var(--font-family-mono); font-weight: 500; font-size: 12px; color: var(--text); cursor: pointer; letter-spacing: 0;" onclick="navigateTo('challans', true, { id: '${c.id}' })">
            ${c.challanNumber}
          </span>
        </td>

        <!-- Monospace Registration Plate Chip -->
        <td>
          <span class="reg-plate-chip">${c.vehicleReg}</span>
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
        <td class="text-right">
          <div style="font-weight: 500; font-size: 13.5px; color: var(--text); font-variant-numeric: tabular-nums;">
            ${Utils.formatINR(c.amount)}
          </div>
          ${c.lateFee ? `<div style="font-size: 10px; color: var(--status-unassigned);">+${Utils.formatINR(c.lateFee)} fee</div>` : ''}
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
    icon.style.transition = 'transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      icon.style.transition = 'none';
      icon.style.transform = 'rotate(0deg)';
    }, 480);
  }
  setTimeout(() => {
    Utils.showToast('Gateway Synchronized', 'Parivahan e-Challan gateway polled successfully. 32 active records refreshed.', 'success');
  }, 160);
}
window.triggerParivahanSyncAnimation = triggerParivahanSyncAnimation;
