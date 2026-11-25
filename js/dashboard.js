/**
 * ChallanOS - Editorial Split-Cockpit Dashboard (js/dashboard.js)
 * Asymmetric 62/38 FinOps Broadsheet Layout:
 * - Left: Instrument Serif Hero Exposure Ledger, Live Corridor Breakdown & Clean Typography Triage Table
 * - Right: Sticky Live Adjudication Inspector & 100% Data-Derived Attribution Split
 */

let dashboardSelectedChallanId = null;

function renderDashboardView(container, actions) {
  if (!container) return;

  const stats = StorageManager.getDashboardStats();
  const challans = StorageManager.getChallans();
  const vehicles = StorageManager.getVehicles();

  if (actions) actions.innerHTML = "";

  const openChallans = challans.filter(c => c.status !== "paid");
  const overdueChallans = openChallans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0);
  const overdueAmount = overdueChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const unassignedChallans = challans.filter(c => c.status === "unassigned");
  const unassignedAmount = unassignedChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const contestedChallans = challans.filter(c => c.status === "disputed" || c.status === "court");
  const contestedAmount = contestedChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const clearedCount = challans.filter(c => c.status === "paid").length;
  const clearanceRate = challans.length > 0 ? Math.round((clearedCount / challans.length) * 100) : 100;

  // Live Corridor Exposure computed directly from open challans
  const classifyCorridor = (c) => {
    const ref = `${c.vehicleReg || ""} ${c.issuingAuthority || ""} ${c.location || ""}`.toUpperCase();
    if (ref.includes("DL") || ref.includes("HR") || ref.includes("UP") || ref.includes("DELHI") || ref.includes("NOIDA") || ref.includes("GURUGRAM")) return "ncr";
    if (ref.includes("MH") || ref.includes("MUMBAI") || ref.includes("PUNE") || ref.includes("THANE")) return "mh";
    return "south";
  };

  const corridorStats = { ncr: { amt: 0, count: 0 }, mh: { amt: 0, count: 0 }, south: { amt: 0, count: 0 } };
  openChallans.forEach(c => {
    const key = classifyCorridor(c);
    corridorStats[key].amt += (c.totalPayable || c.amount || 0);
    corridorStats[key].count += 1;
  });

  // Live Attribution Split
  const driverChallans = challans.filter(c => c.responsibleParty === "Driver");
  const lesseeChallans = challans.filter(c => c.responsibleParty === "Lessee");
  const fleetChallans = challans.filter(c => c.responsibleParty !== "Driver" && c.responsibleParty !== "Lessee");
  const driverAmt = driverChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const lesseeAmt = lesseeChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const fleetAmt = fleetChallans.reduce((s, c) => s + (c.totalPayable || c.amount || 0), 0);
  const totalAttrAmt = Math.max(1, driverAmt + lesseeAmt + fleetAmt);
  const driverPct = Math.round((driverAmt / totalAttrAmt) * 100);
  const lesseePct = Math.round((lesseeAmt / totalAttrAmt) * 100);
  const fleetPct = Math.max(0, 100 - driverPct - lesseePct);

  // Default selected notice for sticky right-hand Adjudication Inspector
  const defaultFocus = unassignedChallans[0] || overdueChallans[0] || openChallans[0] || challans[0];
  if (!dashboardSelectedChallanId || !StorageManager.getChallanById(dashboardSelectedChallanId)) {
    dashboardSelectedChallanId = defaultFocus ? defaultFocus.id : null;
  }

  container.innerHTML = `
    <div class="view-enter" style="display: flex; flex-direction: column; gap: 24px;">

      <!-- Top Editorial Masthead -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-3); font-weight: 500;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); display: inline-block;" aria-hidden="true"></span>
            <span>MoRTH Parivahan Gateway Live</span>
            <span style="color: #D4D2CC;">&bull;</span>
            <span>${vehicles.length} Commercial Assets</span>
            <span style="color: #D4D2CC;">&bull;</span>
            <span>${clearanceRate}% Cleared (${clearedCount}/${challans.length})</span>
          </div>
          <h1 class="editorial-display-title">Fleet Liability Ledger</h1>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn--outline btn--sm" onclick="openCommandPalette()" title="Open Command Palette (Cmd+K)" style="gap: 10px;">
            <span>Quick Jump</span>
            <kbd style="height: 19px; min-width: 19px; font-size: 10px; box-shadow: none;">⌘K</kbd>
          </button>
          <button type="button" class="btn btn--outline btn--sm" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'fleet-liability-audit.csv')">
            Export CSV
          </button>
          <button type="button" class="btn btn--primary btn--sm" id="parivahanSyncBtn" onclick="triggerParivahanSyncAnimation(this)">
            ${Utils.icon("refresh", 13)}
            <span>Sync Parivahan</span>
          </button>
        </div>
      </div>

      <!-- Asymmetric 62/38 Split Cockpit -->
      <div class="cockpit-shell">

        <!-- LEFT COLUMN (62%): Broadsheet Hero Ledger + Corridor Matrix + Triage Table -->
        <div class="cockpit-main">

          <!-- Hero Exposure Ledger -->
          <section class="editorial-hero-ledger" aria-label="Unsettled Statutory Exposure">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
              <div>
                <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); margin-bottom: 6px;">
                  Total Unsettled Statutory Exposure
                </div>
                <div class="editorial-hero-amount">${Utils.formatINR(stats.outstandingAmount)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12.5px; color: var(--text-2); font-variant-numeric: tabular-nums;">
                  <strong style="color: var(--ink);">${openChallans.length}</strong> open citations requiring adjudication
                </div>
                <div style="font-size: 11.5px; color: var(--text-3); margin-top: 2px;">
                  Updated live from Parivahan &amp; Virtual Court dockets
                </div>
              </div>
            </div>

            <!-- 3-Column Statutory Aging Strip -->
            <div class="editorial-aging-strip">
              <div class="editorial-aging-item" onclick="navigateTo('challans', true, { filter: 'overdue' })">
                <div style="font-size: 11px; font-weight: 600; color: var(--status-unassigned); text-transform: uppercase; letter-spacing: 0.04em;">
                  Overdue / RC Risk
                </div>
                <div style="font-size: 20px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; margin-top: 2px; letter-spacing: -0.02em;">
                  ${Utils.formatINR(overdueAmount)}
                </div>
                <div style="font-size: 11.5px; color: var(--text-3);">${overdueChallans.length} past due date</div>
              </div>

              <div class="editorial-aging-item" onclick="navigateTo('challans', true, { status: 'unassigned' })">
                <div style="font-size: 11px; font-weight: 600; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.04em;">
                  Unassigned Triage
                </div>
                <div style="font-size: 20px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; margin-top: 2px; letter-spacing: -0.02em;">
                  ${Utils.formatINR(unassignedAmount)}
                </div>
                <div style="font-size: 11.5px; color: var(--text-3);">${unassignedChallans.length} awaiting custody</div>
              </div>

              <div class="editorial-aging-item" onclick="navigateTo('disputes')">
                <div style="font-size: 11px; font-weight: 600; color: var(--status-court); text-transform: uppercase; letter-spacing: 0.04em;">
                  Sub-Judice Stay
                </div>
                <div style="font-size: 20px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; margin-top: 2px; letter-spacing: -0.02em;">
                  ${Utils.formatINR(contestedAmount)}
                </div>
                <div style="font-size: 11.5px; color: var(--text-3);">${contestedChallans.length} locked in court/dispute</div>
              </div>
            </div>
          </section>

          <!-- Regional Highway Corridor Exposure -->
          <section aria-label="Regional Corridor Exposure">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
              <h2 style="font-size: 13px; font-weight: 600; color: var(--ink); margin: 0;">Corridor Liability Distribution</h2>
              <span style="font-size: 11.5px; color: var(--text-3);">Open citations by enforcement zone</span>
            </div>
            <div class="corridor-grid">
              <div class="corridor-stat">
                <div style="font-size: 11px; color: var(--text-3); font-weight: 500;">Delhi NCR / NH-48</div>
                <div style="font-size: 17px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; margin-top: 3px;">${Utils.formatINR(corridorStats.ncr.amt)}</div>
                <div style="font-size: 11px; color: var(--text-2); margin-top: 2px;">${corridorStats.ncr.count} open notices</div>
              </div>
              <div class="corridor-stat">
                <div style="font-size: 11px; color: var(--text-3); font-weight: 500;">Mumbai / Pune Expy</div>
                <div style="font-size: 17px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; margin-top: 3px;">${Utils.formatINR(corridorStats.mh.amt)}</div>
                <div style="font-size: 11px; color: var(--text-2); margin-top: 2px;">${corridorStats.mh.count} open notices</div>
              </div>
              <div class="corridor-stat">
                <div style="font-size: 11px; color: var(--text-3); font-weight: 500;">Bengaluru / South</div>
                <div style="font-size: 17px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; margin-top: 3px;">${Utils.formatINR(corridorStats.south.amt)}</div>
                <div style="font-size: 11px; color: var(--text-2); margin-top: 2px;">${corridorStats.south.count} open notices</div>
              </div>
            </div>
          </section>

          <!-- Clean Typography-First Priority Triage Ledger -->
          <section aria-label="Priority Triage Queue">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
              <div class="editorial-tabs" id="dashboardQueuePills">
                <button class="editorial-tab-btn calm-tab-btn active" data-queue="all">
                  All Notices <span class="editorial-tab-count">${openChallans.length}</span>
                </button>
                <button class="editorial-tab-btn calm-tab-btn" data-queue="unassigned">
                  Unassigned <span class="editorial-tab-count">${unassignedChallans.length}</span>
                </button>
                <button class="editorial-tab-btn calm-tab-btn" data-queue="overdue">
                  Overdue <span class="editorial-tab-count">${overdueChallans.length}</span>
                </button>
                <button class="editorial-tab-btn calm-tab-btn" data-queue="dispute">
                  Court <span class="editorial-tab-count">${contestedChallans.length}</span>
                </button>
              </div>

              <div style="position: relative;">
                <svg style="position: absolute; left: 10px; top: 9px; pointer-events: none;" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="dashboardTableSearchInput" class="form-input" style="height: 32px; padding-left: 30px; font-size: 12px; width: 200px;" placeholder="Filter notices, plates..." aria-label="Filter triage queue">
              </div>
            </div>

            <div style="overflow-x: auto;">
              <table class="cockpit-table">
                <thead>
                  <tr>
                    <th style="width: 36px; text-align: center;">
                      <input type="checkbox" id="selectAllAttentionCheckbox" aria-label="Select all notices in queue" title="Select all notices">
                    </th>
                    <th>Notice</th>
                    <th>Vehicle</th>
                    <th>Violation</th>
                    <th style="text-align: right;">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="dashboardAttentionList">
                  ${renderAttentionItems(openChallans)}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        <!-- RIGHT STICKY COLUMN (38%): Live Adjudication Inspector + Attribution Split -->
        <aside class="cockpit-inspector" aria-label="Live Adjudication Inspector">
          <div id="dashboardLiveInspector">
            ${renderDashboardInspectorHTML(dashboardSelectedChallanId)}
          </div>

          <div style="border-top: 1px solid #E5E4E0; padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
              <span style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3);">
                Liability Attribution
              </span>
              <span style="font-size: 11px; color: var(--text-3);">${challans.length} total</span>
            </div>

            <div style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; gap: 2px; margin-bottom: 12px;">
              <div style="width: ${driverPct}%; background: var(--color-primary);"></div>
              <div style="width: ${lesseePct}%; background: #0284C7;"></div>
              <div style="width: ${fleetPct}%; background: #A1A1AA;"></div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-2); display: inline-flex; align-items: center; gap: 6px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary);"></span>
                  Driver Trips (${driverChallans.length})
                </span>
                <span style="font-weight: 600; font-variant-numeric: tabular-nums; color: var(--ink);">${driverPct}% &middot; ${Utils.formatINR(driverAmt)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-2); display: inline-flex; align-items: center; gap: 6px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #0284C7;"></span>
                  Lessee Contracts (${lesseeChallans.length})
                </span>
                <span style="font-weight: 600; font-variant-numeric: tabular-nums; color: var(--ink);">${lesseePct}% &middot; ${Utils.formatINR(lesseeAmt)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-2); display: inline-flex; align-items: center; gap: 6px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #A1A1AA;"></span>
                  Fleet &amp; Unassigned (${fleetChallans.length})
                </span>
                <span style="font-weight: 600; font-variant-numeric: tabular-nums; color: var(--ink);">${fleetPct}% &middot; ${Utils.formatINR(fleetAmt)}</span>
              </div>
            </div>
          </div>
        </aside>

      </div>

    </div>
  `;

  // Wire Queue Filter Tabs & Search
  const tabBtns = container.querySelectorAll(".calm-tab-btn");
  const listContainer = container.querySelector("#dashboardAttentionList");
  const searchInput = container.querySelector("#dashboardTableSearchInput");

  function getActiveFilteredList() {
    const activeBtn = container.querySelector(".calm-tab-btn.active");
    const queueType = activeBtn ? activeBtn.dataset.queue : "all";
    let list = challans.filter(c => c.status !== "paid");

    if (queueType === "unassigned") {
      list = challans.filter(c => c.status === "unassigned");
    } else if (queueType === "overdue") {
      list = challans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== "paid");
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

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (listContainer) listContainer.innerHTML = renderAttentionItems(getActiveFilteredList());
    });
  });

  if (searchInput && listContainer) {
    searchInput.addEventListener("input", () => {
      listContainer.innerHTML = renderAttentionItems(getActiveFilteredList());
    });
  }
}

/**
 * Render Clean Typography-First Triage Rows (Zero Stock Thumbnails)
 */
function renderAttentionItems(items) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 16px; color: var(--text-3);">
          <div style="font-family: var(--font-family-serif); font-size: 22px; color: var(--ink); margin-bottom: 4px;">Ledger Clear</div>
          <div style="font-size: 12.5px; color: var(--text-2);">No open infractions match this filter.</div>
        </td>
      </tr>
    `;
  }

  return items.slice(0, 12).map(c => {
    const daysLeft = Utils.getDaysRemaining(c.dueDate);
    const isOverdue = daysLeft < 0 && c.status !== "paid";
    const isSelected = c.id === dashboardSelectedChallanId;

    return `
      <tr class="cockpit-row ${isSelected ? "is-selected" : ""}" data-challan-id="${c.id}" onclick="if(!event.target.closest('input')) selectDashboardNotice('${c.id}')">
        <td style="text-align: center;" onclick="event.stopPropagation()">
          <input type="checkbox" value="${c.id}" class="custom-checkbox" aria-label="Select infraction ${c.challanNumber}">
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${isOverdue ? '<span class="urgent-pulse-dot" title="Overdue statutory deadline"></span>' : ""}
            <span style="font-family: var(--font-family-mono); font-size: 12px; font-weight: 600; color: var(--ink);">
              ${c.challanNumber}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">
            ${isOverdue ? `${Math.abs(daysLeft)}d overdue` : `Due ${Utils.formatDate(c.dueDate)}`}
          </div>
        </td>
        <td>
          <span class="reg-plate-chip">${c.vehicleReg}</span>
        </td>
        <td>
          <div style="font-weight: 500; color: var(--ink); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.offence}">
            ${c.offence}
          </div>
          <div style="font-size: 11px; color: var(--text-3); margin-top: 1px;">
            ${c.issuingAuthority || "State Traffic Police"}
          </div>
        </td>
        <td style="text-align: right;">
          <div style="font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; color: var(--ink);">
            ${Utils.formatINR(c.amount)}
          </div>
          ${c.lateFee ? `<div style="font-size: 10.5px; color: var(--status-unassigned); text-align: right; font-variant-numeric: tabular-nums;">+${Utils.formatINR(c.lateFee)} fee</div>` : ""}
        </td>
        <td>
          ${Utils.getStatusBadgeHTML(c.status)}
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * Live-Update the Sticky Right-Hand Adjudication Inspector
 */
function selectDashboardNotice(challanId) {
  dashboardSelectedChallanId = challanId;
  document.querySelectorAll(".cockpit-row").forEach(row => {
    row.classList.toggle("is-selected", row.dataset.challanId === challanId);
  });
  const inspector = document.getElementById("dashboardLiveInspector");
  if (inspector) {
    inspector.innerHTML = renderDashboardInspectorHTML(challanId);
  }
}
window.selectDashboardNotice = selectDashboardNotice;

function renderDashboardInspectorHTML(challanId) {
  const c = challanId ? StorageManager.getChallanById(challanId) : null;
  if (!c) {
    return `<div style="font-size: 13px; color: var(--text-3); padding: 20px 0;">Select any notice on the left to inspect statutory details and adjudicate liability.</div>`;
  }

  const vehicle = StorageManager.getVehicleById(c.vehicleId);
  const daysLeft = Utils.getDaysRemaining(c.dueDate);
  const isOverdue = daysLeft < 0 && c.status !== "paid";
  const totalPayable = c.totalPayable || ((c.amount || 0) + (c.lateFee || 0) + (c.convenienceFee !== undefined ? c.convenienceFee : 25));

  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3);">
            Selected Notice
          </div>
          <div style="font-family: var(--font-family-mono); font-size: 16px; font-weight: 700; color: var(--ink); margin-top: 2px;">
            ${c.challanNumber}
          </div>
        </div>
        ${Utils.getStatusBadgeHTML(c.status)}
      </div>

      <div style="padding: 14px 0; border-top: 1px solid #E5E4E0; border-bottom: 1px solid #E5E4E0; display: flex; justify-content: space-between; align-items: baseline;">
        <div>
          <div style="font-size: 11px; color: var(--text-3);">Total Payable</div>
          <div style="font-family: var(--font-family-serif); font-size: 32px; color: var(--ink); line-height: 1.05; font-variant-numeric: tabular-nums; margin-top: 2px;">
            ${Utils.formatINR(totalPayable)}
          </div>
        </div>
        <div style="text-align: right; font-size: 11.5px; color: ${isOverdue ? "var(--status-unassigned)" : "var(--text-2)"}; font-weight: ${isOverdue ? "600" : "500"};">
          ${isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : `Due ${Utils.formatDate(c.dueDate)}`}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
        <div>
          <div style="color: var(--text-3); font-size: 11px;">Vehicle</div>
          <div style="margin-top: 3px;"><span class="reg-plate-chip">${c.vehicleReg}</span></div>
          <div style="color: var(--text-2); font-size: 11px; margin-top: 3px;">${vehicle ? vehicle.makeModel : "Commercial Fleet"}</div>
        </div>
        <div>
          <div style="color: var(--text-3); font-size: 11px;">Custody Attribution</div>
          <div style="color: var(--ink); font-weight: 600; margin-top: 3px;">${c.responsiblePartyName || c.responsibleParty || "Unassigned"}</div>
          <div style="color: var(--text-3); font-size: 11px; margin-top: 2px;">${c.mvActSection || "Motor Vehicles Act"}</div>
        </div>
      </div>

      <div style="font-size: 12px; color: var(--text-2); line-height: 1.45;">
        <strong style="color: var(--ink);">${c.offence}</strong> &mdash; ${c.location || "National Highway Corridor"} (${Utils.formatDate(c.offenceDate || c.date, true)}).
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${c.status === "unassigned" ? `
          <button type="button" class="btn btn--primary btn--sm" style="flex: 1;" onclick="openAssignmentModal('${c.id}')">
            Assign Liability
          </button>
        ` : (c.status === "court" ? `
          <button type="button" class="btn btn--outline btn--sm" style="flex: 1; color: var(--status-court); border-color: var(--status-court-border);" onclick="openCourtCaseModal('${c.id}')">
            ${Utils.icon("scale", 13)} Record Court Order
          </button>
        ` : (c.status !== "paid" ? `
          <button type="button" class="btn btn--primary btn--sm" style="flex: 1;" onclick="openPaymentModal('${c.id}')">
            Settle Fine
          </button>
        ` : ""))}
        <button type="button" class="btn btn--outline btn--sm" onclick="navigateTo('challans', true, { id: '${c.id}' })">
          Full Case &rarr;
        </button>
      </div>
    </div>
  `;
}

/**
 * Gateway Sync Micro-Feedback
 */
function triggerParivahanSyncAnimation(btn) {
  if (!btn) return;
  const icon = btn.querySelector("svg");
  if (icon) {
    icon.style.transition = "transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1)";
    icon.style.transform = "rotate(360deg)";
    setTimeout(() => {
      icon.style.transition = "none";
      icon.style.transform = "rotate(0deg)";
    }, 620);
  }
  setTimeout(() => {
    Utils.showToast("Gateway Synchronized", "Parivahan e-Challan ledger refreshed.", "success");
  }, 250);
}
window.triggerParivahanSyncAnimation = triggerParivahanSyncAnimation;
