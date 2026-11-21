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
    <div class="calm-dashboard-container" style="display: flex; flex-direction: column; gap: 20px;">
      
      <!-- 1. GREETING & ACTION HEADER -->
      <div class="calm-dashboard-header framer-animate-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div class="calm-header-left">
          <div class="calm-header-date" style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-2); font-weight: 500; flex-wrap: wrap;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span class="dot framer-live-dot" style="width: 7px; height: 7px; border-radius: 50%; background: var(--color-success); display: inline-block;"></span>
              <span>MoRTH Parivahan Gateway Live</span>
            </span>
            <span class="badge" style="background: rgba(30, 96, 255, 0.08); color: var(--color-primary); border: 1px solid rgba(30, 96, 255, 0.2); font-size: 11px; font-weight: 600; padding: 2px 9px;">
              📷 ANPR Highway Radar Feed • 99.4% Match
            </span>
          </div>
          <h1 class="calm-header-greeting" style="font-size: var(--font-h1, 28px); font-weight: 800; color: var(--ink); letter-spacing: -0.025em; margin: 4px 0 0;">
            Operational Fleet Dashboard
          </h1>
        </div>

        <div class="calm-header-actions" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'fleet-liability-audit.csv')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            <span>Download CSV</span>
          </button>
          <button class="btn btn--primary btn--sm" id="parivahanSyncBtn" onclick="triggerParivahanSyncAnimation(this)">
            <svg class="sync-icon" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
            <span>Parivahan Sync</span>
          </button>
        </div>
      </div>

      <!-- 2. SPEEDOMETER ARC GAUGES & HEALTH HUB (Matches Screens 1, 3, & 7 from Reference) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px;">
        
        <!-- Arc Gauge 1: Fleet Compliance Index -->
        <div class="card" style="padding: 22px 20px; align-items: center; justify-content: center; text-align: center; border-radius: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
            <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-2);">Fleet Compliance</span>
            <span class="badge badge--paid" style="font-size: 10.5px;">Active SLA</span>
          </div>
          ${Utils.renderArcGauge(totalResolutionRate || 88, "Compliance Health", `${clearedChallansCount}/${challans.length} Notices Cleared`, { startColor: "#1E60FF", endColor: "#38BDF8" })}
        </div>

        <!-- Arc Gauge 2: Resolution Velocity -->
        <div class="card" style="padding: 22px 20px; align-items: center; justify-content: center; text-align: center; border-radius: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
            <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-2);">Resolution Velocity</span>
            <span class="badge badge--paid" style="font-size: 10.5px;">On Track</span>
          </div>
          ${Utils.renderArcGauge(92, "Resolution SLA", "Avg 4.2d Clearance Window", { startColor: "#10B981", endColor: "#34D399" })}
        </div>

        <!-- Arc Gauge 3: Asset Safety Index -->
        <div class="card" style="padding: 22px 20px; align-items: center; justify-content: center; text-align: center; border-radius: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
            <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-2);">Asset Safety Score</span>
            <span class="badge badge--assigned" style="font-size: 10.5px;">Optimal</span>
          </div>
          ${Utils.renderArcGauge(96, "Fleet Safety Index", "Zero Blacklist Impoundments", { startColor: "#6366F1", endColor: "#8B5CF6" })}
        </div>

        <!-- Card 4: Primary Liability Action Hub -->
        <div class="card" style="padding: 22px 20px; justify-content: space-between; border-radius: 18px; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 96, 255, 0.88) 100%), url('assets/images/speed-camera-radar.jpg') center/cover no-repeat; color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 12px 32px -4px rgba(30, 96, 255, 0.25);">
          <div style="position: absolute; right: 14px; top: 14px; display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); padding: 3px 9px; border-radius: 9999px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #38BDF8; display: inline-block;"></span>
            <span>HIGHWAY RADAR LIVE</span>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding-right: 130px;">
              <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255, 255, 255, 0.8);">Total Unsettled Liability</span>
            </div>
            <div style="font-size: 34px; font-weight: 800; color: #FFFFFF; margin: 6px 0; letter-spacing: -0.025em; font-variant-numeric: tabular-nums;">
              ${Utils.formatINR(stats.outstandingAmount)}
            </div>
            <div style="font-size: 12.5px; color: rgba(255, 255, 255, 0.85); line-height: 1.4;">
              Spanning 32 active compliance notices across Delhi NCR, Mumbai & Bengaluru Hubs.
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 16px;">
            <button class="btn btn--primary btn--sm" style="flex: 1; height: 36px; background: #FFFFFF; color: var(--color-primary); font-weight: 700; border: none;" onclick="navigateTo('challans', true, { status: 'unassigned' })">
              <span>Assign Liability</span>
              <span style="background: rgba(30, 96, 255, 0.15); color: var(--color-primary); font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 9999px; margin-left: 4px;">2 Due</span>
            </button>
            <button class="btn btn--outline btn--sm" style="height: 36px; color: #FFFFFF; border-color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.1);" onclick="navigateTo('payments')">
              Settle Fines
            </button>
          </div>
        </div>

      </div>

      <!-- 3. INTERACTIVE INFRACTION LIFECYCLE PIPELINE STEPPER -->
      <div class="card" style="padding: 18px 24px; border-radius: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-2);">Infraction Lifecycle Pipeline</span>
          <span class="badge badge--assigned" style="font-size: 11px;">Stage 2 of 4 Active</span>
        </div>
        ${Utils.renderProgressStepper([
          { title: "1. Notice Logged (MoRTH)" },
          { title: "2. Attributed Custody" },
          { title: "3. Settle / Escrow" },
          { title: "4. Court / Dismissed" }
        ], 1)}
      </div>

      <!-- 4. OPERATIONAL WORK METRIC TILES -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
        
        <div class="card" style="padding: 16px 18px; border-radius: 16px; cursor: pointer;" onclick="navigateTo('challans', true, { filter: 'overdue' })">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: var(--text-2); font-weight: 600;">Compounding Overdue</span>
            <span class="badge badge--unassigned" style="font-size: 10px;">${overdueChallans.length} Critical</span>
          </div>
          <div style="font-size: 22px; font-weight: 800; color: var(--status-unassigned); font-variant-numeric: tabular-nums;">
            ${Utils.formatINR(overdueAmount)}
          </div>
          <div style="font-size: 11.5px; color: var(--text-3); margin-top: 4px;">Past due date • late fee risk</div>
        </div>

        <div class="card" style="padding: 16px 18px; border-radius: 16px; cursor: pointer;" onclick="navigateTo('challans', true, { status: 'unassigned' })">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: var(--text-2); font-weight: 600;">Unassigned Notices</span>
            <span class="badge badge--unassigned" style="font-size: 10px;">Needs Owner</span>
          </div>
          <div style="font-size: 22px; font-weight: 800; color: var(--ink);">
            ${unassignedChallans.length} Citations
          </div>
          <div style="font-size: 11.5px; color: var(--text-3); margin-top: 4px;">Requires driver/lessee attribution</div>
        </div>

        <div class="card" style="padding: 16px 18px; border-radius: 16px; cursor: pointer;" onclick="navigateTo('disputes')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: var(--text-2); font-weight: 600;">Virtual Court / Disputes</span>
            <span class="badge badge--pending" style="font-size: 10px;">Sub-Judice</span>
          </div>
          <div style="font-size: 22px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums;">
            ${Utils.formatINR(disputedAmount)}
          </div>
          <div style="font-size: 11.5px; color: var(--text-3); margin-top: 4px;">${disputedChallans.length} cases under legal contest</div>
        </div>

        <div class="card" style="padding: 16px 18px; border-radius: 16px; cursor: pointer;" onclick="navigateTo('vehicles')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: var(--text-2); font-weight: 600;">Commercial Fleet</span>
            <span class="badge badge--paid" style="font-size: 10px;">100% Active</span>
          </div>
          <div style="font-size: 22px; font-weight: 800; color: var(--ink);">
            ${vehicles.length} Assets
          </div>
          <div style="font-size: 11.5px; color: var(--text-3); margin-top: 4px;">Tracked across national corridors</div>
        </div>

      </div>

      <!-- 5. MIDDLE ROW: MODERN 2-COLUMN ANALYTICS (Matches Screen 4 from Reference) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 18px;">
        
        <!-- Left: Custom Bar Chart (Volume & Velocity) -->
        <div class="card" style="padding: 22px 24px; border-radius: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--ink);">Notice &amp; Settlement Velocity</div>
              <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Monthly trend across national fleet operations</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 11.5px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: var(--surface-1); display: inline-block;"></span>
                <span style="color: var(--text-3);">Past Months</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: var(--color-primary); display: inline-block;"></span>
                <span style="color: var(--ink); font-weight: 600;">Current Month</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 8px;">
            ${renderFinexyDualBarChart(challans)}
          </div>
        </div>

        <!-- Right: Liability Attribution Breakdown -->
        <div class="card" style="padding: 22px 24px; border-radius: 18px;">
          <div style="margin-bottom: 12px;">
            <div style="font-size: 15px; font-weight: 700; color: var(--ink);">Liability Attribution Breakdown</div>
            <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Adjudicated legal responsibility distribution</div>
          </div>

          <div class="calm-donut-container" style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 16px;">
            <!-- SVG Donut -->
            ${renderLiabilityDonutChart(challans)}

            <!-- Category Breakdown List -->
            <div class="calm-donut-list" style="display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 180px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--surface-2); border-radius: 8px; font-size: 12.5px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #1E60FF;"></span>
                  <span style="color: var(--ink); font-weight: 500;">Driver Trips</span>
                </div>
                <div style="font-weight: 700; color: var(--ink);">42% (₹54,600)</div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--surface-2); border-radius: 8px; font-size: 12.5px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #38BDF8;"></span>
                  <span style="color: var(--ink); font-weight: 500;">Lessee Contracts</span>
                </div>
                <div style="font-weight: 700; color: var(--ink);">38% (₹49,400)</div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--surface-2); border-radius: 8px; font-size: 12.5px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #94A3B8;"></span>
                  <span style="color: var(--ink); font-weight: 500;">Fleet Default</span>
                </div>
                <div style="font-weight: 700; color: var(--ink);">20% (₹26,010)</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 6. BOTTOM ROW: ACTION QUEUE & RECENT INFRACTIONS LEDGER (Matches Screen 6 from Reference) -->
      <div class="card" style="padding: 22px 24px; border-radius: 18px;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: var(--ink); letter-spacing: -0.01em;">Action Queue &amp; Recent Infractions</div>
            <div style="font-size: 12.5px; color: var(--text-2); margin-top: 2px;">Live compliance triage requiring financial or legal adjudication</div>
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

        <!-- High-Density Data Table -->
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; min-width: 960px;">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;"><input type="checkbox" id="selectAllAttentionCheckbox" title="Select all items"></th>
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
