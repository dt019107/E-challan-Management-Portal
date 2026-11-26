/**
 * ChallanOS - Commercial Driver Directory & Custody Management (js/drivers.js)
 * 
 * Features:
 * - Driver Directory with Inset Segmented Pill Filter (All, Pending Recovery, Clean Record)
 * - Roster Search (by name, phone, driving license, vehicle duty)
 * - Commercial Driver KPI metrics
 * - Data table with Driver Avatar, Transport License Badges & Payroll Recovery status
 * - Export Driver Directory to CSV
 */

let driverTableState = {
  activeTab: "all", // "all" | "pendingRecovery" | "clean"
  searchQuery: ""
};

function renderDriversView(container, actions) {
  const allDrivers = StorageManager.getDrivers();
  const totalRecovery = allDrivers.reduce((sum, d) => sum + (d.pendingRecovery || 0), 0);
  const withRecoveryCount = allDrivers.filter(d => (d.pendingRecovery || 0) > 0).length;
  const cleanCount = allDrivers.length - withRecoveryCount;

  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV('commercial-drivers-ledger.csv', StorageManager.getDrivers())">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      Export Directory
    </button>
  `;

  // Filter Drivers by active tab and search
  let filtered = allDrivers;
  if (driverTableState.activeTab === "pendingRecovery") {
    filtered = filtered.filter(d => (d.pendingRecovery || 0) > 0);
  } else if (driverTableState.activeTab === "clean") {
    filtered = filtered.filter(d => (d.pendingRecovery || 0) === 0);
  }

  if (driverTableState.searchQuery) {
    const q = driverTableState.searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.dlNumber && d.dlNumber.toLowerCase().includes(q)) ||
      (d.assignedVehicleReg && d.assignedVehicleReg.toLowerCase().includes(q))
    );
  }

  const tabs = [
    { key: "all", label: "All Commercial Operators", count: allDrivers.length },
    { key: "pendingRecovery", label: "Pending Payroll Holds", count: withRecoveryCount, alert: withRecoveryCount > 0 },
    { key: "clean", label: "Clean Record", count: cleanCount }
  ];

  container.innerHTML = `
    <div class="view-enter" style="display: flex; flex-direction: column; gap: 22px;">
      
      <!-- 1. Hairline Driver KPI Strip -->
      <div class="editorial-kpi-strip" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
        <div class="editorial-kpi-cell" onclick="switchDriverTab('all')">
          <div class="editorial-kpi-label"><span>Active Commercial Drivers</span></div>
          <div class="editorial-kpi-figure">${allDrivers.length}</div>
          <div class="editorial-kpi-sub">Verified transport licenses (HMV/LMV)</div>
        </div>

        <div class="editorial-kpi-cell" onclick="switchDriverTab('pendingRecovery')">
          <div class="editorial-kpi-label"><span>Pending Payroll Escrow</span></div>
          <div class="editorial-kpi-figure" style="color: var(--status-pending);">${Utils.formatINR(totalRecovery)}</div>
          <div class="editorial-kpi-sub">${withRecoveryCount} drivers queued for salary deduction</div>
        </div>

        <div class="editorial-kpi-cell" style="cursor: default;">
          <div class="editorial-kpi-label"><span>Fleet Safety Score</span></div>
          <div class="editorial-kpi-figure" style="color: var(--status-paid);">92 / 100</div>
          <div class="editorial-kpi-sub">0.4 infractions per 10,000 km</div>
        </div>
      </div>

      <!-- 2. Segmented Tabs & Search Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div class="editorial-tabs" id="driverTabs">
          ${tabs.map(t => `
            <button class="editorial-tab-btn ${driverTableState.activeTab === t.key ? 'active' : ''}" onclick="switchDriverTab('${t.key}')">
              ${t.label} <span class="editorial-tab-count">${t.count}</span>
            </button>
          `).join("")}
        </div>

        <div style="position: relative; width: 280px;">
          <svg class="search-icon-prefix" viewBox="0 0 20 20" fill="currentColor" style="left: 10px;">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" class="form-input" id="driverSearchInput" style="padding-left: 36px; height: 36px; font-size: 12px;"
            placeholder="Search" aria-label="Search drivers" value="${driverTableState.searchQuery}" oninput="handleDriverSearch(this.value)">
        </div>
      </div>

      <!-- 3. Open Architectural Driver Roster Table -->
      <div style="overflow-x: auto; border-top: 1px solid #EBEBEB;">
        <table class="data-table" style="width: 100%; min-width: 800px; margin: 0;">
          <thead>
            <tr>
              <th style="padding-left: 20px;">Operator &amp; Contact</th>
              <th>License &amp; Vehicle Duty</th>
              <th class="text-right">Payroll Recovery Hold</th>
              <th>Status</th>
              <th style="text-align: right; padding-right: 20px; min-width: 120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="5" style="text-align: center; padding: 48px 16px; color: var(--text-3);">
                  <div style="font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px;">No Commercial Drivers Found</div>
                  <div style="font-size: 13px; color: var(--text-2);">No operators match the current filter or search criteria.</div>
                </td>
              </tr>
            ` : filtered.map(d => {
              const initials = d.name.split(' ').map(n=>n[0]).slice(0,2).join('');
              const hasRecovery = (d.pendingRecovery || 0) > 0;
              return `
                <tr class="row-interactive">
                  <td style="padding-left: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary, #1D4ED8); color: #FFFFFF; font-weight: 600; font-size: 12.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" aria-hidden="true">
                        ${initials}
                      </div>
                      <div>
                        <strong style="color: var(--ink); font-size: 13.5px;">${d.name}</strong>
                        <div style="font-size: 12px; margin-top: 2px;">
                          <a href="tel:${d.phone || '+91 98765 43210'}" aria-label="Call Driver ${d.name} at ${d.phone || '+91 98765 43210'}" style="color: var(--text-3); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                            ${Utils.icon('phone', 12)}
                            <span>${d.phone || '+91 98765 43210'}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span class="reg-plate-chip" role="button" tabindex="0" style="cursor: pointer; font-size: 12px; font-weight: 600;" onclick="navigateTo('vehicles', true, { search: '${d.assignedVehicleReg}' })" onkeydown="if(event.key==='Enter') navigateTo('vehicles', true, { search: '${d.assignedVehicleReg}' })" aria-label="Filter fleet vehicles by ${d.assignedVehicleReg}" title="Filter vehicles by ${d.assignedVehicleReg}">
                        ${d.assignedVehicleReg}
                      </span>
                      <span style="font-family: var(--font-family-mono); font-size: 11.5px; color: var(--text-2); background: rgba(15, 23, 42, 0.05); padding: 2px 7px; border-radius: 4px;">
                        DL: ${d.dlNumber}
                      </span>
                    </div>
                  </td>
                  <td class="text-right">
                    ${hasRecovery ? `
                      <a href="#payments" onclick="if(window.switchPaymentsTab) switchPaymentsTab('recovery');" class="recovery-chip" aria-label="View payroll recovery ledger for ${d.name}" style="cursor: pointer; text-decoration: none; display: inline-flex; flex-direction: column; align-items: flex-end;">
                        <strong style="font-size: 14px; font-variant-numeric: tabular-nums; color: var(--status-unassigned); font-weight: 600;">
                          ${Utils.formatINR(d.pendingRecovery)}
                        </strong>
                        <div style="font-size: 11px; color: var(--status-unassigned); margin-top: 2px; font-weight: 600; text-decoration: underline;">
                          Queued in Payroll Ledger →
                        </div>
                      </a>
                    ` : `
                      <strong style="font-size: 14px; font-variant-numeric: tabular-nums; color: var(--text-3); font-weight: 600;">₹0</strong>
                      <div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">Zero Liability</div>
                    `}
                  </td>
                  <td>
                    <div class="calm-badge ${d.status === 'Active' ? 'paid' : 'assigned'}">
                      <span class="dot"></span>
                      <span>${d.status || 'Active Duty'}</span>
                    </div>
                  </td>
                  <td style="text-align: right; padding-right: 20px;">
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                      <button class="calm-btn-secondary" style="padding: 4px 10px; font-size: 11.5px; height: 30px; border-radius: 6px;" onclick="navigateTo('challans', true, { responsibleParty: 'Driver' })">
                        View Fines
                      </button>
                      <button class="calm-btn-secondary" style="padding: 4px 10px; font-size: 11.5px; height: 30px; border-radius: 6px;" onclick="navigateTo('vehicles', true, { search: '${d.assignedVehicleReg}' })">
                        Vehicle
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

    </div>
  `;
}

function switchDriverTab(tabKey) {
  driverTableState.activeTab = tabKey;
  renderDriversView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.switchDriverTab = switchDriverTab;

function handleDriverSearch(query) {
  driverTableState.searchQuery = query;
  renderDriversView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.handleDriverSearch = handleDriverSearch;

window.renderDriversView = renderDriversView;
