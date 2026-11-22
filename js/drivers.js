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
    <div style="display: flex; flex-direction: column; gap: var(--space-4);">
      
      <!-- 1. Driver KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" onclick="switchDriverTab('all')" style="cursor: pointer;">
          <div class="kpi-card-top">
            <span class="kpi-label">Active Commercial Drivers</span>
            <div class="kpi-icon-wrapper" style="background: var(--status-assigned-bg); color: var(--status-assigned);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          </div>
          <div class="kpi-value">${allDrivers.length}</div>
          <div class="kpi-subtext">Verified transport licenses (HMV/LMV)</div>
        </div>

        <div class="kpi-card" onclick="switchDriverTab('pendingRecovery')" style="cursor: pointer;">
          <div class="kpi-card-top">
            <span class="kpi-label">Pending Payroll Escrow</span>
            <div class="kpi-icon-wrapper" style="background: var(--status-pending-bg); color: var(--status-pending);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: var(--status-pending); font-variant-numeric: tabular-nums;">${Utils.formatINR(totalRecovery)}</div>
          <div class="kpi-subtext">${withRecoveryCount} drivers queued for salary deduction</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-top">
            <span class="kpi-label">Fleet Safety Score</span>
            <div class="kpi-icon-wrapper" style="background: var(--status-paid-bg); color: var(--status-paid);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: var(--status-paid);">92 / 100</div>
          <div class="kpi-subtext">0.4 Infractions per 10,000 km</div>
        </div>
      </div>

      <!-- 2. Segmented Pill Tab Bar & Search Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 4px;">
        <div class="nav-tabs" id="driverTabs" style="margin-bottom: 0;">
          ${tabs.map(t => `
            <button class="nav-tab ${driverTableState.activeTab === t.key ? 'active' : ''}" onclick="switchDriverTab('${t.key}')">
              ${t.label} <span class="nav-tab-badge" style="${t.alert ? 'background: rgba(239, 68, 68, 0.14); color: var(--status-unassigned); font-weight: 700;' : ''}">${t.count}</span>
            </button>
          `).join("")}
        </div>

        <div style="position: relative; width: 320px;">
          <svg class="search-icon-prefix" viewBox="0 0 20 20" fill="currentColor" style="left: 10px;">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" class="form-input" id="driverSearchInput" style="padding-left: 34px; height: 36px; font-size: 13px;"
            placeholder="Search operator, phone, DL, vehicle..." value="${driverTableState.searchQuery}" oninput="handleDriverSearch(this.value)">
        </div>
      </div>

      <!-- 3. Commercial Driver Roster Table -->
      <div class="card" style="padding: 0; overflow: hidden; border-radius: 18px;">
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
                      <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--color-primary, #1E60FF); color: #FFFFFF; font-weight: 700; font-size: 12.5px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(30, 96, 255, 0.25); flex-shrink: 0;">
                        ${initials}
                      </div>
                      <div>
                        <strong style="color: var(--ink); font-size: 13.5px;">${d.name}</strong>
                        <div style="font-size: 12px; color: var(--text-3); margin-top: 2px;">📞 ${d.phone || '+91 98765 43210'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span class="reg-plate-chip" style="cursor: pointer; font-size: 12px; font-weight: 700;" onclick="navigateTo('vehicles', true, { search: '${d.assignedVehicleReg}' })" title="Filter vehicles by ${d.assignedVehicleReg}">
                        ${d.assignedVehicleReg}
                      </span>
                      <span style="font-family: var(--font-family-mono); font-size: 11.5px; color: var(--text-2); background: rgba(15, 23, 42, 0.05); padding: 2px 7px; border-radius: 4px;">
                        DL: ${d.dlNumber}
                      </span>
                    </div>
                  </td>
                  <td class="text-right">
                    <strong style="font-size: 14px; font-variant-numeric: tabular-nums; color: ${hasRecovery ? 'var(--status-unassigned)' : 'var(--text-3)'}; font-weight: 700;">
                      ${hasRecovery ? Utils.formatINR(d.pendingRecovery) : '₹0'}
                    </strong>
                    <div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">
                      ${hasRecovery ? 'Queued for deduction' : 'Zero Liability'}
                    </div>
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
