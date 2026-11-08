/**
 * ChallanOS - Vehicle Management Module (js/vehicles.js)
 * 
 * Features:
 * - Vehicle listing with search, sync status filter, pagination & multi-select
 * - Add/Edit Vehicle modal with Indian registration regex validation
 * - 7-Step CSV Import Wizard (upload, map columns, validate, preview, row errors, confirm, error CSV download)
 * - CSV Export
 * - Vehicle Details Flagship Screen with 4 Tabs (Challans, Responsibility History Timeline, Documents, Activity)
 * - Interactive Responsibility Timeline with custody periods, offence pins & overlap conflict detection
 * - Custody Period Handover Modal
 */

// Pagination & Selection State for Vehicles
let vehicleTableState = {
  currentPage: 1,
  pageSize: 8,
  sortColumn: "regNumber",
  sortDirection: "asc",
  selectedVehicleIds: new Set(),
  activeFilterTab: "all",
  searchQuery: ""
};

function renderVehiclesView(container, actions, params = {}) {
  // If specific vehicle ID requested, render Vehicle Details Screen!
  if (params.id) {
    renderVehicleDetailsView(container, actions, params.id);
    return;
  }

  // Pre-populate search query if passed from global search or dashboard
  if (params.search) {
    vehicleTableState.searchQuery = params.search;
  }

  // Header Actions
  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV(StorageManager.getVehicles(), 'apex-fleet-vehicles.csv')">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      Export Fleet CSV
    </button>
    <button class="btn btn--secondary btn--sm" onclick="openImportVehiclesWizard()">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
      Import Vehicles (CSV)
    </button>
    <button class="btn btn--primary btn--sm" onclick="openAddVehicleModal()">
      + Add Vehicle
    </button>
  `;

  // Compute Filter Counts
  const allVehicles = StorageManager.getVehicles();
  const withChallansCount = allVehicles.filter(v => (v.openChallans || 0) > 0).length;
  const leasedCount = allVehicles.filter(v => v.currentLesseeId).length;
  const unassignedOwnerCount = allVehicles.filter(v => !v.ownerName || v.ownerName === "Unassigned" || !v.currentDriverId).length;
  const syncIssueCount = allVehicles.filter(v => v.syncStatus === "Failed" || v.syncStatus === "Partial").length;

  const tabs = [
    { key: "all", label: "All Vehicles", count: allVehicles.length },
    { key: "withChallans", label: "Open Challans", count: withChallansCount },
    { key: "leased", label: "Leased Out", count: leasedCount },
    { key: "unassignedOwner", label: "Unassigned Duty", count: unassignedOwnerCount },
    { key: "syncIssues", label: "Sync Failed / Partial", count: syncIssueCount }
  ];

  container.innerHTML = `
    <!-- Vehicle Filter Tabs (Step 5.2) -->
    <div class="nav-tabs" id="vehicleFilterTabs">
      ${tabs.map(t => `
        <button class="nav-tab ${vehicleTableState.activeFilterTab === t.key ? 'active' : ''}" data-tab="${t.key}">
          ${t.label} <span class="nav-tab-badge">${t.count}</span>
        </button>
      `).join("")}
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="filter-toolbar" style="margin-bottom: var(--space-4);">
      <div class="filter-group">
        <div style="position: relative; width: 320px;">
          <svg class="search-icon-prefix" viewBox="0 0 20 20" fill="currentColor" style="left: 10px;">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" class="form-input" id="vehicleSearchInput" style="padding-left: 34px;"
            placeholder="Search registration, model, owner, driver, chassis..." value="${vehicleTableState.searchQuery}">
        </div>
        ${vehicleTableState.searchQuery ? `
          <button class="btn btn--ghost btn--sm" onclick="clearVehicleSearch()">Clear Search</button>
        ` : ''}
      </div>

      <div class="filter-group">
        <label class="text-xs text-muted">Rows per page:</label>
        <select class="form-select" id="vehiclePageSizeSelect" style="width: 70px; padding: 4px 8px; font-size: 12px;">
          <option value="8" ${vehicleTableState.pageSize === 8 ? 'selected' : ''}>8</option>
          <option value="12" ${vehicleTableState.pageSize === 12 ? 'selected' : ''}>12</option>
          <option value="25" ${vehicleTableState.pageSize === 25 ? 'selected' : ''}>25</option>
        </select>
      </div>
    </div>

    <!-- Vehicles Table Card -->
    <div class="card" id="vehiclesTableCardContainer">
      <div class="card-body" style="padding: 0;" id="vehiclesTableBodyContainer"></div>
      <div class="table-pagination" id="vehiclesPaginationContainer"></div>
    </div>

    <!-- Sticky Bulk Selection Actions Bar -->
    <div class="bulk-actions-bar" id="vehicleBulkActionsBar" style="display: none;">
      <div style="display: flex; align-items: center; gap: var(--space-3);">
        <span style="font-weight: 600; font-size: 13px;" id="selectedVehiclesCountText">0 Vehicles Selected</span>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <button class="btn btn--outline btn--sm" style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #fff;" onclick="bulkSyncSelectedVehicles()">
          Sync Gateway
        </button>
        <button class="btn btn--outline btn--sm" style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #fff;" onclick="bulkExportSelectedVehicles()">
          Export Selected
        </button>
        <button class="btn btn--ghost btn--sm" style="color: #fff;" onclick="deselectAllVehicles()">
          Deselect All
        </button>
      </div>
    </div>
  `;

  // Attach Filter Tab Events
  container.querySelectorAll("#vehicleFilterTabs .nav-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      vehicleTableState.activeFilterTab = tabBtn.dataset.tab;
      vehicleTableState.currentPage = 1;
      renderVehiclesView(container, actions);
    });
  });

  // Attach Search Input
  const searchInput = container.querySelector("#vehicleSearchInput") || document.getElementById("vehicleSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", Utils.debounce((e) => {
      vehicleTableState.searchQuery = e.target.value.trim();
      vehicleTableState.currentPage = 1;
      renderVehiclesTableAndPagination();
    }, 200));
  }

  // Attach Page Size Select
  const pageSizeSelect = container.querySelector("#vehiclePageSizeSelect") || document.getElementById("vehiclePageSizeSelect");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      vehicleTableState.pageSize = parseInt(e.target.value, 10);
      vehicleTableState.currentPage = 1;
      renderVehiclesTableAndPagination();
    });
  }

  // Render Table Rows and Pagination
  renderVehiclesTableAndPagination();
}

function clearVehicleSearch() {
  vehicleTableState.searchQuery = "";
  vehicleTableState.currentPage = 1;
  navigateTo("vehicles");
}

function renderVehiclesTableAndPagination() {
  const allVehicles = StorageManager.getVehicles();
  const drivers = StorageManager.getDrivers();
  const lessees = StorageManager.getLessees();

  // 1. Filter by Tab
  let filtered = allVehicles;
  if (vehicleTableState.activeFilterTab === "withChallans") {
    filtered = filtered.filter(v => (v.openChallans || 0) > 0);
  } else if (vehicleTableState.activeFilterTab === "leased") {
    filtered = filtered.filter(v => v.currentLesseeId);
  } else if (vehicleTableState.activeFilterTab === "unassignedOwner") {
    filtered = filtered.filter(v => !v.ownerName || v.ownerName === "Unassigned" || !v.currentDriverId);
  } else if (vehicleTableState.activeFilterTab === "syncIssues") {
    filtered = filtered.filter(v => v.syncStatus === "Failed" || v.syncStatus === "Partial");
  }

  // 2. Filter by Search Query
  if (vehicleTableState.searchQuery) {
    const q = vehicleTableState.searchQuery.toLowerCase();
    filtered = filtered.filter(v => {
      const driver = drivers.find(d => d.id === v.currentDriverId);
      const lessee = lessees.find(l => l.id === v.currentLesseeId);
      return (
        v.regNumber.toLowerCase().includes(q) ||
        v.makeModel.toLowerCase().includes(q) ||
        (v.ownerName && v.ownerName.toLowerCase().includes(q)) ||
        (v.chassisNumber && v.chassisNumber.toLowerCase().includes(q)) ||
        (driver && driver.name.toLowerCase().includes(q)) ||
        (lessee && lessee.name.toLowerCase().includes(q))
      );
    });
  }

  // 3. Sorting
  filtered.sort((a, b) => {
    let valA = a[vehicleTableState.sortColumn];
    let valB = b[vehicleTableState.sortColumn];
    if (typeof valA === "string") {
      return vehicleTableState.sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return vehicleTableState.sortDirection === "asc"
      ? (valA || 0) - (valB || 0)
      : (valB || 0) - (valA || 0);
  });

  // 4. Pagination
  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / vehicleTableState.pageSize) || 1;
  if (vehicleTableState.currentPage > totalPages) vehicleTableState.currentPage = totalPages;

  const startIndex = (vehicleTableState.currentPage - 1) * vehicleTableState.pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + vehicleTableState.pageSize);

  // Render Table
  const tableContainer = document.getElementById("vehiclesTableBodyContainer");
  if (!tableContainer) return;

  if (paginatedRows.length === 0) {
    tableContainer.innerHTML = `
      <div class="empty-state" style="padding: 48px 16px;">
        <div class="empty-state-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div class="empty-state-title">No Fleet Vehicles Found</div>
        <div class="empty-state-text">No vehicles matched your current filter or search parameters.</div>
        <button class="btn btn--outline btn--sm" onclick="clearVehicleSearch()">Reset Search</button>
      </div>
    `;
  } else {
    const isAllSelected = paginatedRows.every(r => vehicleTableState.selectedVehicleIds.has(r.id));

    tableContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">
              <input type="checkbox" class="custom-checkbox" id="selectAllVehiclesCheckbox" ${isAllSelected ? 'checked' : ''} onchange="toggleSelectAllVehicles(this.checked)">
            </th>
            <th onclick="sortVehiclesBy('regNumber')" style="cursor: pointer;">
              Registration No ${getSortIcon('regNumber')}
            </th>
            <th onclick="sortVehiclesBy('makeModel')" style="cursor: pointer;">
              Make & Model ${getSortIcon('makeModel')}
            </th>
            <th class="col-nice" onclick="sortVehiclesBy('year')" style="cursor: pointer;">
              Year ${getSortIcon('year')}
            </th>
            <th class="col-nice">Owner</th>
            <th class="col-nice">Lessee</th>
            <th class="col-should">Assigned Driver</th>
            <th onclick="sortVehiclesBy('openChallans')" style="cursor: pointer;">
              Open Challans ${getSortIcon('openChallans')}
            </th>
            <th onclick="sortVehiclesBy('outstandingAmount')" style="cursor: pointer;">
              Outstanding ${getSortIcon('outstandingAmount')}
            </th>
            <th>Status</th>
            <th style="text-align: right; min-width: 140px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedRows.map(v => {
      const isChecked = vehicleTableState.selectedVehicleIds.has(v.id);
      const lessee = lessees.find(l => l.id === v.currentLesseeId);
      const driver = drivers.find(d => d.id === v.currentDriverId);

      let syncBadge = `<span class="badge badge--paid">Synced</span>`;
      if (v.syncStatus === "Failed") syncBadge = `<span class="badge badge--unassigned">Failed</span>`;
      else if (v.syncStatus === "Partial") syncBadge = `<span class="badge badge--pending">Partial</span>`;

      return `
              <tr class="${isChecked ? 'row-selected' : ''}">
                <td style="text-align: center;">
                  <input type="checkbox" class="custom-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleVehicleRowSelection('${v.id}', this.checked)">
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 44px; height: 32px; border-radius: 4px; overflow: hidden; border: 1px solid var(--color-border); background: #FAFBFD; flex-shrink: 0;">
                      <img src="${(v.makeModel || '').toLowerCase().includes('bolero') ? 'assets/images/bolero-maxx.jpg' : 'assets/images/tata-ace.jpg'}" alt="${v.makeModel}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
                    </div>
                    <div>
                      <a href="#vehicles?id=${v.id}" class="font-mono font-semibold" style="color: var(--color-primary); font-size: 13px;" title="View vehicle compliance profile">
                        ${v.regNumber}
                      </a>
                      <div class="text-xs text-muted">${v.category || 'Commercial'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <strong class="cell-truncate" title="${v.makeModel}" style="color: var(--color-text-main); font-size: 13px;">${v.makeModel}</strong>
                  <div class="text-xs text-muted font-mono col-nice">Chassis: ${v.chassisNumber ? v.chassisNumber.slice(-8) : '—'}</div>
                </td>
                <td class="col-nice">
                  <span class="font-medium">${v.year || 2023}</span>
                </td>
                <td class="col-nice">
                  <div class="cell-truncate" title="${v.ownerName || 'Apex Fleet Pvt Ltd'}" style="font-weight: 500;">${v.ownerName || 'Apex Fleet Pvt Ltd'}</div>
                </td>
                <td class="col-nice">
                  ${lessee ? `<div class="cell-truncate text-xs font-semibold" title="${lessee.name}" style="color: var(--color-purple, #7452C8);">${lessee.name}</div>` : '<span class="text-xs text-muted">—</span>'}
                </td>
                <td class="col-should">
                  ${driver ? `<div class="cell-truncate text-xs font-medium" title="${driver.name}">${driver.name}</div>` : '<span class="text-xs text-muted">Unassigned</span>'}
                </td>
                <td>
                  ${(v.openChallans || 0) > 0 ? `
                    <span class="badge badge--unassigned font-bold">${v.openChallans} Open</span>
                  ` : `
                    <span class="badge badge--paid">0 Clean</span>
                  `}
                </td>
                <td>
                  <strong class="amount-cell" style="color: ${(v.outstandingAmount || 0) > 0 ? 'var(--color-text-main)' : 'var(--color-text-muted)'}; white-space: nowrap;">
                    ${Utils.formatINR(v.outstandingAmount || 0)}
                  </strong>
                </td>
                <td>${syncBadge}</td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 4px;">
                    <a href="#vehicles?id=${v.id}" class="btn btn--outline btn--sm" style="padding: 3px 8px; font-size: 11px;" title="Open complete profile">
                      Details
                    </a>
                    <button class="btn btn--ghost btn--sm" style="padding: 3px 8px; font-size: 11px;" onclick="openEditVehicleModal('${v.id}')" title="Edit vehicle metadata">
                      Edit
                    </button>
                    <button class="btn btn--ghost btn--sm" style="padding: 3px 8px; font-size: 11px; color: var(--color-danger, #C24141);" onclick="archiveVehicle('${v.id}')" title="Archive vehicle">
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            `;
    }).join("")}
        </tbody>
      </table>
    `;
  }

  // Render Pagination Footer
  const paginationContainer = document.getElementById("vehiclesPaginationContainer");
  if (paginationContainer) {
    paginationContainer.innerHTML = `
      <div>
        Showing <strong>${totalRecords > 0 ? startIndex + 1 : 0}</strong> to <strong>${Math.min(startIndex + vehicleTableState.pageSize, totalRecords)}</strong> of <strong>${totalRecords}</strong> vehicles
      </div>
      <div style="display: flex; gap: var(--space-2); align-items: center;">
        <button class="btn btn--outline btn--sm" ${vehicleTableState.currentPage === 1 ? 'disabled' : ''} onclick="changeVehiclePage(${vehicleTableState.currentPage - 1})">
          ← Previous
        </button>
        <span class="text-xs text-muted" style="padding: 0 4px;">Page <strong>${vehicleTableState.currentPage}</strong> of <strong>${totalPages}</strong></span>
        <button class="btn btn--outline btn--sm" ${vehicleTableState.currentPage >= totalPages ? 'disabled' : ''} onclick="changeVehiclePage(${vehicleTableState.currentPage + 1})">
          Next →
        </button>
      </div>
    `;
  }

  updateBulkActionsBarVisibility();
}

function getSortIcon(col) {
  if (vehicleTableState.sortColumn !== col) {
    return `<span style="color: var(--color-text-subtle); font-size: 10px;">↕</span>`;
  }
  return vehicleTableState.sortDirection === "asc" ? "▲" : "▼";
}

function sortVehiclesBy(col) {
  if (vehicleTableState.sortColumn === col) {
    vehicleTableState.sortDirection = vehicleTableState.sortDirection === "asc" ? "desc" : "asc";
  } else {
    vehicleTableState.sortColumn = col;
    vehicleTableState.sortDirection = "asc";
  }
  renderVehiclesTableAndPagination();
}

function changeVehiclePage(newPage) {
  vehicleTableState.currentPage = newPage;
  renderVehiclesTableAndPagination();
}

function toggleVehicleRowSelection(id, checked) {
  if (checked) vehicleTableState.selectedVehicleIds.add(id);
  else vehicleTableState.selectedVehicleIds.delete(id);
  renderVehiclesTableAndPagination();
}

function toggleSelectAllVehicles(checked) {
  const allVehicles = StorageManager.getVehicles();
  if (checked) {
    allVehicles.forEach(v => vehicleTableState.selectedVehicleIds.add(v.id));
  } else {
    vehicleTableState.selectedVehicleIds.clear();
  }
  renderVehiclesTableAndPagination();
}

function deselectAllVehicles() {
  vehicleTableState.selectedVehicleIds.clear();
  renderVehiclesTableAndPagination();
}

function updateBulkActionsBarVisibility() {
  const bar = document.getElementById("vehicleBulkActionsBar");
  const countText = document.getElementById("selectedVehiclesCountText");
  const count = vehicleTableState.selectedVehicleIds.size;

  if (bar) {
    if (count > 0) {
      bar.style.display = "flex";
      if (countText) countText.textContent = `${count} Vehicle${count > 1 ? 's' : ''} Selected`;
    } else {
      bar.style.display = "none";
    }
  }
}

function bulkSyncSelectedVehicles() {
  const count = vehicleTableState.selectedVehicleIds.size;
  Utils.showToast("Gateway Polling Triggered", `Synchronizing ${count} selected assets with Parivahan Vahan gateway...`, "info");
  setTimeout(() => {
    Utils.showToast("Sync Successful", `Updated compliance certificates and fines for ${count} assets.`, "success");
    deselectAllVehicles();
  }, 1200);
}

function bulkExportSelectedVehicles() {
  const allVehicles = StorageManager.getVehicles();
  const selected = allVehicles.filter(v => vehicleTableState.selectedVehicleIds.has(v.id));
  Utils.exportToCSV(selected, "selected-apex-vehicles.csv");
}

// --------------------------------------------------------------------------
// 12. STEP 5.5: VEHICLE DETAILS & RESPONSIBILITY TIMELINE MODULE
// --------------------------------------------------------------------------

let currentVehicleActiveTab = "timeline";

function renderVehicleDetailsView(container, actions, vehicleId) {
  const vehicle = StorageManager.getVehicleById(vehicleId);
  if (!vehicle) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Vehicle Not Found</div>
        <p class="text-xs text-muted">The requested vehicle asset ID "${vehicleId}" does not exist.</p>
        <button class="btn btn--primary btn--sm" onclick="navigateTo('vehicles')">Return to Fleet</button>
      </div>
    `;
    return;
  }

  // Update Breadcrumbs
  updateBreadcrumbs(["Hisaab", "Vehicles", vehicle.regNumber]);

  const drivers = StorageManager.getDrivers();
  const lessees = StorageManager.getLessees();
  const driver = drivers.find(d => d.id === vehicle.currentDriverId);
  const lessee = lessees.find(l => l.id === vehicle.currentLesseeId);
  const challans = StorageManager.getChallans().filter(c => c.vehicleId === vehicle.id || c.vehicleReg === vehicle.regNumber);

  // Header Actions
  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="navigateTo('vehicles')">
      ← Back to Fleet List
    </button>
    <button class="btn btn--outline btn--sm" onclick="openEditVehicleModal('${vehicle.id}')">
      Edit Vehicle
    </button>
    <button class="btn btn--outline btn--sm" style="color: var(--status-unassigned); border-color: rgba(194,65,65,0.3);" onclick="archiveVehicle('${vehicle.id}')">
      Archive
    </button>
    <button class="btn btn--outline btn--sm" onclick="Utils.showToast('Parivahan Synchronized', 'Asset records refreshed from Parivahan API.', 'success')">
      Refresh Sync
    </button>
    <button class="btn btn--secondary btn--sm" onclick="openAddCustodyModal('${vehicle.id}')">
      + Add Custody Period
    </button>
  `;

  // Compliance Flags
  const isPUCExpired = vehicle.pucExpiry && new Date(vehicle.pucExpiry) < new Date();
  const isInsuranceExpiring = vehicle.insuranceExpiry && Utils.getDaysRemaining(vehicle.insuranceExpiry) < 60;

  container.innerHTML = `
    <!-- Vehicle Identification Banner -->
    <div class="vehicle-profile-banner" style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: var(--space-4);">
        <div style="width: 110px; height: 74px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-bg-app); flex-shrink: 0; box-shadow: var(--shadow-xs);">
          <img src="${(vehicle.makeModel || '').toLowerCase().includes('bolero') ? 'assets/images/bolero-maxx.jpg' : 'assets/images/tata-ace.jpg'}" alt="${vehicle.makeModel}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
            <span class="vehicle-reg-tag">${vehicle.regNumber}</span>
            <span class="badge badge--paid">${vehicle.syncStatus || 'Synced'}</span>
            <span class="badge badge--neutral">${vehicle.category || 'Commercial Vehicle'}</span>
            <span class="badge ${vehicle.fastagStatus === 'Active' ? 'badge--paid' : 'badge--unassigned'}">FASTag: ${vehicle.fastagStatus || 'Active'}</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--color-text-main); margin-top: 6px; letter-spacing: var(--letter-spacing-tight);">
            ${vehicle.makeModel} (${vehicle.year})
          </h2>
          <div class="text-xs text-muted" style="margin-top: 4px;">
            Chassis: <strong class="font-mono text-main">${vehicle.chassisNumber || 'MAT612034N9P12847'}</strong> • 
            Engine: <strong class="font-mono text-main">${vehicle.engineNumber || '475ID05KP9812'}</strong> •
            Source: <strong class="text-main">${vehicle.source || 'Parivahan API'}</strong>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: var(--space-4); align-items: center;">
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: ${(vehicle.outstandingAmount || 0) > 0 ? 'var(--status-unassigned)' : 'var(--color-text-main)'};">
            ${Utils.formatINR(vehicle.outstandingAmount || 0)}
          </div>
          <div class="text-xs text-muted">${vehicle.openChallans || 0} Open Challans</div>
        </div>
      </div>
    </div>

    <!-- Statutory Compliance Badges Grid -->
    <div class="compliance-badge-grid">
      <div class="compliance-item">
        <div>
          <div class="text-xs text-muted">RC Smart Card Validity</div>
          <strong class="text-sm">${Utils.formatDate(vehicle.rcValidity)}</strong>
        </div>
        <span class="badge badge--paid">Valid</span>
      </div>

      <div class="compliance-item ${isInsuranceExpiring ? 'alert-expired' : ''}">
        <div>
          <div class="text-xs text-muted">Insurance Policy Expiry</div>
          <strong class="text-sm">${Utils.formatDate(vehicle.insuranceExpiry)}</strong>
        </div>
        <span class="badge ${isInsuranceExpiring ? 'badge--pending' : 'badge--paid'}">
          ${isInsuranceExpiring ? 'Renew Soon' : 'Covered'}
        </span>
      </div>

      <div class="compliance-item ${isPUCExpired ? 'alert-expired' : ''}">
        <div>
          <div class="text-xs text-muted">PUC Certificate Expiry</div>
          <strong class="text-sm">${Utils.formatDate(vehicle.pucExpiry)}</strong>
        </div>
        <span class="badge ${isPUCExpired ? 'badge--unassigned' : 'badge--paid'}">
          ${isPUCExpired ? 'Expired!' : 'Valid'}
        </span>
      </div>

      <div class="compliance-item">
        <div>
          <div class="text-xs text-muted">FASTag Wallet Balance</div>
          <strong class="text-sm">${Utils.formatINR(vehicle.fastagBalance || 0)}</strong>
        </div>
        <span class="badge badge--paid">NHAI Active</span>
      </div>
    </div>

    <!-- Asset Ownership, Lease & Driver Overview Card -->
    <div class="card" style="margin-top: var(--space-4); padding: var(--space-4);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4);">
        <div>
          <div class="text-xs text-muted">Vehicle Owner</div>
          <strong class="text-sm text-main">${vehicle.ownerName || 'Apex Fleet Pvt Ltd'}</strong>
          <div class="text-xs text-muted" style="margin-top: 2px;">Title Holder / Asset Owner</div>
        </div>
        <div>
          <div class="text-xs text-muted">Corporate Lessee</div>
          <strong class="text-sm text-main">${lessee ? lessee.name : 'Direct Fleet Operations'}</strong>
          <div class="text-xs text-muted" style="margin-top: 2px;">${lessee ? `Code: ${lessee.code || 'CORP'} • Tier 1` : 'In-House Asset'}</div>
        </div>
        <div>
          <div class="text-xs text-muted">Assigned Duty Driver</div>
          <strong class="text-sm text-main">${driver ? driver.name : 'Unassigned (Duty Pool)'}</strong>
          <div class="text-xs text-muted" style="margin-top: 2px;">${driver ? `DL: ${driver.licenseNumber} • ${driver.phone}` : 'Active Fleet Pool'}</div>
        </div>
        <div>
          <div class="text-xs text-muted">Lease Contract Period</div>
          <strong class="text-sm text-main">${vehicle.contractStart ? Utils.formatDate(vehicle.contractStart) : '01 Jan 2025'} — ${vehicle.contractEnd ? Utils.formatDate(vehicle.contractEnd) : '31 Dec 2027'}</strong>
          <div class="text-xs text-muted" style="margin-top: 2px;"><span class="badge badge--paid" style="font-size: 10px;">Active Master Agreement</span></div>
        </div>
      </div>
    </div>

    <!-- 4 Vehicle Detail Tabs -->
    <div style="margin-top: var(--space-6);">
      <div class="nav-tabs" id="vehicleDetailTabs">
        <button class="nav-tab ${currentVehicleActiveTab === 'timeline' ? 'active' : ''}" data-tab="timeline">
          Responsibility Timeline <span class="nav-tab-badge">${(vehicle.responsibilityPeriods || []).length}</span>
        </button>
        <button class="nav-tab ${currentVehicleActiveTab === 'challans' ? 'active' : ''}" data-tab="challans">
          Challans History <span class="nav-tab-badge">${challans.length}</span>
        </button>
        <button class="nav-tab ${currentVehicleActiveTab === 'documents' ? 'active' : ''}" data-tab="documents">
          Compliance Documents <span class="nav-tab-badge">5</span>
        </button>
        <button class="nav-tab ${currentVehicleActiveTab === 'activity' ? 'active' : ''}" data-tab="activity">
          Audit Activity Trail
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="vehicleTabContentArea"></div>
    </div>
  `;

  // Render Initial Tab
  renderVehicleSelectedTab(vehicle, challans);

  // Tab Switching
  container.querySelectorAll("#vehicleDetailTabs .nav-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      container.querySelectorAll("#vehicleDetailTabs .nav-tab").forEach(b => b.classList.remove("active"));
      tabBtn.classList.add("active");
      currentVehicleActiveTab = tabBtn.dataset.tab;
      renderVehicleSelectedTab(vehicle, challans);
    });
  });
}

function renderVehicleSelectedTab(vehicle, challans) {
  const contentArea = document.getElementById("vehicleTabContentArea");
  if (!contentArea) return;

  if (currentVehicleActiveTab === "timeline") {
    contentArea.innerHTML = renderResponsibilityTimelineTab(vehicle, challans);
  } else if (currentVehicleActiveTab === "challans") {
    contentArea.innerHTML = renderVehicleChallansTab(vehicle, challans);
  } else if (currentVehicleActiveTab === "documents") {
    contentArea.innerHTML = renderVehicleDocumentsTab(vehicle);
  } else if (currentVehicleActiveTab === "activity") {
    contentArea.innerHTML = renderVehicleActivityTab(vehicle);
  }
}

/**
 * Tab 1: Interactive Responsibility Timeline with Conflict Detection & Challan Markers
 */
function renderResponsibilityTimelineTab(vehicle, challans) {
  const periods = vehicle.responsibilityPeriods || [];

  // Check for Timeline Conflicts (Overlapping Dates or Gaps)
  let hasOverlapConflict = false;
  let conflictMessage = "";

  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const p1Start = new Date(periods[i].startDate);
      const p1End = new Date(periods[i].endDate);
      const p2Start = new Date(periods[j].startDate);
      const p2End = new Date(periods[j].endDate);

      // Overlap condition
      if (p1Start < p2End && p2Start < p1End) {
        hasOverlapConflict = true;
        conflictMessage = `Overlap Conflict Detected: Period "${periods[i].partyName}" (${periods[i].startDate} to ${periods[i].endDate}) conflicts concurrently with "${periods[j].partyName}" (${periods[j].startDate} to ${periods[j].endDate}).`;
        break;
      }
    }
    if (hasOverlapConflict) break;
  }

  return `
    <div class="timeline-card">
      <div class="timeline-header-row">
        <div>
          <h3 class="text-sm font-semibold">Vehicle Custody & Liability Timeline</h3>
          <p class="text-xs text-muted">Chronological custody periods correlated against traffic offence timestamps</p>
        </div>
        <div style="display: flex; gap: var(--space-2); align-items: center;">
          <button class="btn btn--outline btn--sm" onclick="openAddCustodyModal('${vehicle.id}')">
            + Record Custody Handover
          </button>
        </div>
      </div>

      <!-- Overlap or Gap Conflict Alert Banner -->
      ${hasOverlapConflict ? `
        <div class="timeline-conflict-alert">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink: 0;"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          <div>
            <strong>Custody Ambiguity Conflict:</strong> ${conflictMessage}
            <div style="margin-top: 2px;">Automated responsibility attribution is locked for overlapping date windows until resolved.</div>
          </div>
        </div>
      ` : ''}

      <!-- Visual Timeline Track with Bands & Challan Pinpoint Markers -->
      <div class="timeline-visual-track">
        ${periods.map((p, idx) => {
    let partyClass = "party-fleet";
    if (p.partyType === "Driver") partyClass = "party-driver";
    else if (p.partyType === "Lessee") partyClass = "party-lessee";

    const widthPercent = Math.max(25, Math.floor(100 / (periods.length || 1)));

    return `
            <div class="timeline-period-band ${partyClass} ${hasOverlapConflict && idx > 0 ? 'conflict-overlap' : ''}" style="width: ${widthPercent}%;"
              title="${p.partyType}: ${p.partyName} (${p.startDate} to ${p.endDate})">
              <span>${p.partyType}</span>
              <span style="font-size: 10px; font-weight: normal; opacity: 0.9;">${p.partyName}</span>
              <span style="font-size: 9px; opacity: 0.75;">${p.startDate} to ${p.endDate}</span>
            </div>
          `;
  }).join("")}

        <!-- Challan Offence Markers on Timeline -->
        ${challans.map((c, idx) => {
    // Calculate arbitrary marker position along track
    const offsetPercent = Math.min(90, Math.max(10, 20 + idx * 30));
    return `
            <div class="timeline-challan-marker" style="left: ${offsetPercent}%;" onclick="openAssignmentModal('${c.id}')">
              !
              <div class="timeline-challan-tooltip">
                <strong>${c.challanNumber} (${Utils.formatINR(c.amount)})</strong><br>
                ${c.offence}<br>
                Date: ${Utils.formatDate(c.offenceDate, true)}
              </div>
            </div>
          `;
  }).join("")}
      </div>

      <!-- Timeline Legend -->
      <div style="display: flex; gap: var(--space-4); align-items: center; font-size: 11px; color: var(--color-text-muted); border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-3); flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 12px; height: 12px; background: #1D4ED8; border-radius: 2px;"></span> Driver Custody
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 12px; height: 12px; background: #6D28D9; border-radius: 2px;"></span> Corporate Lessee
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 12px; height: 12px; background: #0369A1; border-radius: 2px;"></span> Fleet Operator (Yard)
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 12px; height: 12px; background: #B42318; border-radius: 50%; color: #fff; font-size: 9px; text-align: center; line-height: 12px;">!</span> Challan Offence Event
        </div>
      </div>

      <!-- Custody Table Ledger -->
      <div style="margin-top: var(--space-4);">
        <table class="data-table">
          <thead>
            <tr>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Party Classification</th>
              <th>Designated Party / Entity</th>
              <th>Contract / Roster Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${periods.map(p => `
              <tr>
                <td><strong>${Utils.formatDate(p.startDate)}</strong></td>
                <td><strong>${Utils.formatDate(p.endDate)}</strong></td>
                <td><span class="badge badge--assigned">${p.partyType}</span></td>
                <td><strong>${p.partyName}</strong></td>
                <td class="font-mono text-xs">${p.contractRef || '—'}</td>
                <td><span class="badge badge--paid">Recorded</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Tab 2: Specific Vehicle Challan History
 */
function renderVehicleChallansTab(vehicle, challans) {
  if (challans.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon" style="color: var(--status-paid); background: var(--status-paid-bg);">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        </div>
        <div class="empty-state-title">Clean Infraction Record</div>
        <div class="empty-state-text">No traffic challans have been recorded for ${vehicle.regNumber}.</div>
      </div>
    `;
  }

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Infractions Incurred by ${vehicle.regNumber} (${challans.length})</div>
      </div>
      <div class="card-body" style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Challan No</th>
              <th>Offence & Section</th>
              <th>Offence Date</th>
              <th>Issuing Authority</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Responsible</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${challans.map(c => `
              <tr>
                <td><strong>${c.challanNumber}</strong></td>
                <td>
                  <div>${c.offence}</div>
                  <div class="text-xs text-muted">${c.mvActSection}</div>
                </td>
                <td>${Utils.formatDate(c.offenceDate, true)}</td>
                <td>${c.issuingAuthority}</td>
                <td><strong>${Utils.formatINR(c.amount)}</strong></td>
                <td>${Utils.getStatusBadgeHTML(c.status)}</td>
                <td><strong>${c.responsiblePartyName || c.responsibleParty}</strong></td>
                <td>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn btn--outline btn--sm" onclick="openAssignmentModal('${c.id}')">Assign</button>
                    ${c.status !== 'paid' && c.status !== 'court' ? `
                      <button class="btn btn--secondary btn--sm" onclick="openPaymentModal('${c.id}')">Pay</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Tab 3: Documents Vault
 */
function renderVehicleDocumentsTab(vehicle) {
  return `
    <div class="card" style="padding: var(--space-6);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4);">
        
        <div class="card" style="padding: var(--space-4); border-color: var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong class="text-sm">RC Certificate (Vahan Portal)</strong>
              <div class="text-xs text-muted" style="margin-top: 2px;">Reg: ${vehicle.regNumber}</div>
            </div>
            <span class="badge badge--paid">Active</span>
          </div>
          <div class="text-xs text-muted" style="margin-top: var(--space-3);">Valid until: ${Utils.formatDate(vehicle.rcValidity)}</div>
          <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
            <button class="btn btn--outline btn--sm" onclick="Utils.showToast('Vahan Smartcard', 'Digital RC preview rendered from Parivahan vault.', 'info')">Preview RC</button>
            <button class="btn btn--ghost btn--sm" onclick="Utils.showToast('Download Started', 'Downloading verified RC PDF...', 'success')">Download</button>
          </div>
        </div>

        <div class="card" style="padding: var(--space-4); border-color: var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong class="text-sm">Commercial Motor Insurance</strong>
              <div class="text-xs text-muted" style="margin-top: 2px;">HDFC ERGO General Policy #99214</div>
            </div>
            <span class="badge badge--paid">Covered</span>
          </div>
          <div class="text-xs text-muted" style="margin-top: var(--space-3);">Expires: ${Utils.formatDate(vehicle.insuranceExpiry)}</div>
          <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
            <button class="btn btn--outline btn--sm" onclick="Utils.showToast('Policy Preview', 'Displaying Comprehensive Policy Schedule.', 'info')">View Policy</button>
            <button class="btn btn--ghost btn--sm" onclick="Utils.showToast('Download Started', 'Downloading insurance policy certificate...', 'success')">Download</button>
          </div>
        </div>

        <div class="card" style="padding: var(--space-4); border-color: var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong class="text-sm">Pollution Under Control (PUC)</strong>
              <div class="text-xs text-muted" style="margin-top: 2px;">National PUC Registry ID #DEL-PUC-4410</div>
            </div>
            <span class="badge ${new Date(vehicle.pucExpiry) < new Date() ? 'badge--unassigned' : 'badge--paid'}">
              ${new Date(vehicle.pucExpiry) < new Date() ? 'Expired!' : 'Valid'}
            </span>
          </div>
          <div class="text-xs text-muted" style="margin-top: var(--space-3);">Expiry: ${Utils.formatDate(vehicle.pucExpiry)}</div>
          <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
            <button class="btn btn--outline btn--sm" onclick="Utils.showToast('PUC Test Slip', 'Emission testing slip verified at 0.12 CO ppm.', 'info')">View Certificate</button>
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Tab 4: Vehicle Audit Trail Activity Log
 */
function renderVehicleActivityTab(vehicle) {
  return `
    <div class="card" style="padding: var(--space-6);">
      <h3 class="text-sm font-semibold" style="margin-bottom: var(--space-4);">Asset Compliance & Handover Ledger</h3>
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        <div style="display: flex; gap: var(--space-3); border-left: 2px solid var(--color-primary); padding-left: var(--space-4);">
          <div>
            <div class="text-xs font-semibold text-main">Parivahan Gateway Sync Completed</div>
            <div class="text-xs text-secondary">Verified RC validity and pending notices from Delhi & NCR state portals.</div>
            <div class="text-xs text-muted" style="margin-top: 2px;">Today at 08:30 AM • Automated Sync Bot</div>
          </div>
        </div>
        <div style="display: flex; gap: var(--space-3); border-left: 2px solid var(--color-border); padding-left: var(--space-4);">
          <div>
            <div class="text-xs font-semibold text-main">Driver Responsibility Assigned</div>
            <div class="text-xs text-secondary">Assigned operational duty to Rahul Sharma under trip roster TRIP-REG-991.</div>
            <div class="text-xs text-muted" style="margin-top: 2px;">02 Mar 2026, 03:30 PM • Deepak Tiwari</div>
          </div>
        </div>
        <div style="display: flex; gap: var(--space-3); border-left: 2px solid var(--color-border); padding-left: var(--space-4);">
          <div>
            <div class="text-xs font-semibold text-main">Quarterly Fleet Fitness Inspection Passed</div>
            <div class="text-xs text-secondary">Vehicle cleared mechanical inspection at Okhla Fleet Depot. FASTag reloaded with ₹1,500.</div>
            <div class="text-xs text-muted" style="margin-top: 2px;">15 Jan 2026 • Depot Ops Lead</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 13. STEP 5.3: ADD / EDIT / ARCHIVE VEHICLE CONTROLLER
// --------------------------------------------------------------------------

function openAddVehicleModal() {
  if (StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canAddVehicle", "Vehicle Asset Registration")) {
    return;
  }

  const editIdInput = document.getElementById("addVehEditId");
  if (editIdInput) editIdInput.value = "";

  const title = document.getElementById("addVehModalTitle");
  const subtitle = document.getElementById("addVehModalSubtitle");
  const submitBtn = document.getElementById("addVehSubmitBtn");
  if (title) title.textContent = "Add Vehicle to Fleet";
  if (subtitle) subtitle.textContent = "Register a new commercial asset into Apex Fleet compliance roster";
  if (submitBtn) submitBtn.textContent = "Save & Register Vehicle";

  // Reset inputs to clean defaults
  const regInput = document.getElementById("addVehReg");
  if (regInput) {
    regInput.value = "";
    regInput.readOnly = false;
  }
  const modelInput = document.getElementById("addVehModel");
  if (modelInput) modelInput.value = "";
  const catSelect = document.getElementById("addVehCategory");
  if (catSelect) catSelect.value = "Light Commercial Vehicle (LCV)";
  const yearInput = document.getElementById("addVehYear");
  if (yearInput) yearInput.value = "2024";
  const ownerInput = document.getElementById("addVehOwner");
  if (ownerInput) ownerInput.value = "Apex Fleet Pvt Ltd";
  const contractStart = document.getElementById("addVehContractStart");
  if (contractStart) contractStart.value = new Date().toISOString().split("T")[0];
  const contractEnd = document.getElementById("addVehContractEnd");
  if (contractEnd) contractEnd.value = "2027-12-31";
  const rcInput = document.getElementById("addVehRC");
  if (rcInput) rcInput.value = "2039-01-01";
  const insInput = document.getElementById("addVehInsurance");
  if (insInput) insInput.value = "2027-02-28";
  const pucInput = document.getElementById("addVehPUC");
  if (pucInput) pucInput.value = "2026-12-31";
  const fastagStatus = document.getElementById("addVehFastagStatus");
  if (fastagStatus) fastagStatus.value = "Active";
  const fastagBal = document.getElementById("addVehFastagBalance");
  if (fastagBal) fastagBal.value = "1500";

  const lesseeSelect = document.getElementById("addVehLessee");
  const driverSelect = document.getElementById("addVehDriver");

  if (lesseeSelect) {
    const lessees = StorageManager.getLessees();
    lesseeSelect.innerHTML = `<option value="">None (Direct In-house Operations)</option>` +
      lessees.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
    lesseeSelect.value = "";
  }

  if (driverSelect) {
    const drivers = StorageManager.getDrivers();
    driverSelect.innerHTML = `<option value="">Unassigned (Duty Pool)</option>` +
      drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    driverSelect.value = "";
  }

  Utils.openModal("addVehicleModal");
}

function openEditVehicleModal(vehicleId) {
  const vehicle = StorageManager.getVehicleById(vehicleId);
  if (!vehicle) {
    Utils.showToast("Vehicle Not Found", `Could not find vehicle ${vehicleId}`, "error");
    return;
  }

  const editIdInput = document.getElementById("addVehEditId");
  if (editIdInput) editIdInput.value = vehicle.id;

  const title = document.getElementById("addVehModalTitle");
  const subtitle = document.getElementById("addVehModalSubtitle");
  const submitBtn = document.getElementById("addVehSubmitBtn");
  if (title) title.textContent = `Edit Vehicle (${vehicle.regNumber})`;
  if (subtitle) subtitle.textContent = "Update commercial asset details, lease assignment, and compliance documents.";
  if (submitBtn) submitBtn.textContent = "Save Changes";

  const lesseeSelect = document.getElementById("addVehLessee");
  const driverSelect = document.getElementById("addVehDriver");

  if (lesseeSelect) {
    const lessees = StorageManager.getLessees();
    lesseeSelect.innerHTML = `<option value="">None (Direct In-house Operations)</option>` +
      lessees.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
    lesseeSelect.value = vehicle.currentLesseeId || "";
  }

  if (driverSelect) {
    const drivers = StorageManager.getDrivers();
    driverSelect.innerHTML = `<option value="">Unassigned (Duty Pool)</option>` +
      drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    driverSelect.value = vehicle.currentDriverId || "";
  }

  const regInput = document.getElementById("addVehReg");
  if (regInput) regInput.value = vehicle.regNumber || "";

  const modelInput = document.getElementById("addVehModel");
  if (modelInput) modelInput.value = vehicle.makeModel || "";

  const catSelect = document.getElementById("addVehCategory");
  if (catSelect) catSelect.value = vehicle.category || "Light Commercial Vehicle (LCV)";

  const yearInput = document.getElementById("addVehYear");
  if (yearInput) yearInput.value = vehicle.year || 2024;

  const ownerInput = document.getElementById("addVehOwner");
  if (ownerInput) ownerInput.value = vehicle.ownerName || "Apex Fleet Pvt Ltd";

  const contractStart = document.getElementById("addVehContractStart");
  if (contractStart) contractStart.value = vehicle.contractStart || "2025-01-01";

  const contractEnd = document.getElementById("addVehContractEnd");
  if (contractEnd) contractEnd.value = vehicle.contractEnd || "2027-12-31";

  const rcInput = document.getElementById("addVehRC");
  if (rcInput) rcInput.value = vehicle.rcValidity || "2038-05-15";

  const insInput = document.getElementById("addVehInsurance");
  if (insInput) insInput.value = vehicle.insuranceExpiry || "2027-01-30";

  const pucInput = document.getElementById("addVehPUC");
  if (pucInput) pucInput.value = vehicle.pucExpiry || "2026-12-15";

  const fastagStatus = document.getElementById("addVehFastagStatus");
  if (fastagStatus) fastagStatus.value = vehicle.fastagStatus || "Active";

  const fastagBal = document.getElementById("addVehFastagBalance");
  if (fastagBal) fastagBal.value = vehicle.fastagBalance !== undefined ? vehicle.fastagBalance : 0;

  Utils.openModal("addVehicleModal");
}

function submitAddVehicleForm() {
  const editId = (document.getElementById("addVehEditId")?.value || "").trim();
  const reg = document.getElementById("addVehReg").value.trim().toUpperCase();
  const model = document.getElementById("addVehModel").value.trim();
  const category = document.getElementById("addVehCategory").value;
  const year = parseInt(document.getElementById("addVehYear").value, 10);
  const owner = document.getElementById("addVehOwner").value.trim();
  const lesseeId = document.getElementById("addVehLessee").value || null;
  const driverId = document.getElementById("addVehDriver").value || null;
  const contractStart = document.getElementById("addVehContractStart")?.value || new Date().toISOString().split("T")[0];
  const contractEnd = document.getElementById("addVehContractEnd")?.value || "2027-12-31";
  const rc = document.getElementById("addVehRC").value;
  const insurance = document.getElementById("addVehInsurance").value;
  const puc = document.getElementById("addVehPUC").value;
  const fastagStatus = document.getElementById("addVehFastagStatus").value;
  const fastagBalance = parseFloat(document.getElementById("addVehFastagBalance").value) || 0;

  // 1. Regex validation for Indian vehicle registration: e.g. DL-01-AB-1234 or DL01AB1234
  const regRegex = /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/;
  if (!regRegex.test(reg)) {
    alert("Please enter a valid Indian vehicle registration number (e.g. DL-01-AB-1234).");
    document.getElementById("addVehReg").focus();
    return;
  }

  // 2. Duplicate Check: must not match another vehicle's regNumber
  const allVehicles = StorageManager.getAllVehicles(true) || [];
  const duplicate = allVehicles.find(v => v.regNumber === reg && v.id !== editId);
  if (duplicate) {
    alert(`Vehicle with registration "${reg}" already exists in the fleet repository.`);
    document.getElementById("addVehReg").focus();
    return;
  }

  if (editId) {
    // EDIT MODE
    const existing = StorageManager.getVehicleById(editId);
    if (!existing) {
      alert("Error: Vehicle record could not be found to update.");
      return;
    }

    const updates = {
      regNumber: reg,
      makeModel: model,
      category: category,
      year: year,
      ownerName: owner || "Apex Fleet Pvt Ltd",
      currentLesseeId: lesseeId,
      currentDriverId: driverId,
      contractStart: contractStart,
      contractEnd: contractEnd,
      rcValidity: rc,
      insuranceExpiry: insurance,
      pucExpiry: puc,
      fastagStatus: fastagStatus,
      fastagBalance: fastagBalance,
      defaultResponsibleParty: lesseeId ? "Lessee" : (driverId ? "Driver" : "Fleet Operator")
    };

    StorageManager.updateVehicle(editId, updates);
    Utils.closeModal("addVehicleModal");
    Utils.showToast("Vehicle Updated", `${reg} updated successfully in the fleet roster.`, "success");

    // Re-render
    const hash = window.location.hash || "";
    if (hash.includes("?id=")) {
      renderVehicleDetailsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"), editId);
    } else {
      renderVehiclesTableAndPagination();
    }
  } else {
    // CREATE MODE
    const newVehicle = {
      id: "veh-" + Date.now(),
      regNumber: reg,
      makeModel: model,
      category: category,
      year: year,
      chassisNumber: "MAT" + Math.floor(1000000000 + Math.random() * 9000000000),
      engineNumber: "ENG" + Math.floor(100000 + Math.random() * 900000),
      ownerName: owner || "Apex Fleet Pvt Ltd",
      currentLesseeId: lesseeId,
      currentDriverId: driverId,
      defaultResponsibleParty: lesseeId ? "Lessee" : (driverId ? "Driver" : "Fleet Operator"),
      openChallans: 0,
      outstandingAmount: 0,
      syncStatus: "Synced",
      source: "Manual Upload",
      rcValidity: rc,
      insuranceExpiry: insurance,
      pucExpiry: puc,
      fastagStatus: fastagStatus,
      fastagBalance: fastagBalance,
      contractStart: contractStart,
      contractEnd: contractEnd,
      responsibilityPeriods: [
        {
          startDate: contractStart,
          endDate: contractEnd,
          partyType: lesseeId ? "Lessee" : (driverId ? "Driver" : "Fleet Operator"),
          partyName: owner || "Apex Fleet Pvt Ltd",
          contractRef: "REG-APEX-" + Date.now().toString().slice(-4)
        }
      ]
    };

    StorageManager.addVehicle(newVehicle);
    Utils.closeModal("addVehicleModal");
    Utils.showToast("Vehicle Registered", `${reg} added to Apex Fleet with clean compliance standing.`, "success");

    // Re-render
    navigateTo("vehicles");
  }
}

function archiveVehicle(vehicleId) {
  const vehicle = StorageManager.getVehicleById(vehicleId);
  if (!vehicle) {
    Utils.showToast("Not Found", "Vehicle not found to archive.", "error");
    return;
  }

  const confirmArchive = confirm(`Are you sure you want to archive vehicle "${vehicle.regNumber}"?\n\nIt will be removed from active fleet tables, but historical challans, payments, and custody timeline records will be preserved.`);
  if (!confirmArchive) return;

  StorageManager.archiveVehicle(vehicle.id);
  Utils.showToast("Vehicle Archived", `${vehicle.regNumber} has been archived successfully.`, "info");

  const hash = window.location.hash || "";
  if (hash.includes("?id=")) {
    navigateTo("vehicles");
  } else {
    renderVehiclesTableAndPagination();
  }
}

// --------------------------------------------------------------------------
// 14. STEP 5.4: 7-STEP EXCEL / CSV VEHICLE IMPORT WIZARD
// --------------------------------------------------------------------------

let importWizardState = {
  currentStep: 1,
  rawFileText: "",
  parsedHeaders: [],
  parsedRows: [],
  mappedFields: {},
  validatedRecords: [],
  invalidRecords: []
};

function openImportVehiclesWizard() {
  importWizardState.currentStep = 1;
  importWizardState.rawFileText = "";
  importWizardState.parsedHeaders = [];
  importWizardState.parsedRows = [];
  importWizardState.validatedRecords = [];
  importWizardState.invalidRecords = [];

  showImportWizardStep(1);
  Utils.openModal("importVehiclesModal");
}

function openImportVehiclesModal() {
  openImportVehiclesWizard();
}

function showImportWizardStep(step) {
  importWizardState.currentStep = step;

  // Update Stepper Nodes
  for (let i = 1; i <= 4; i++) {
    const node = document.getElementById(`importStepNode${i}`);
    const pane = document.getElementById(`importPaneStep${i}`);
    if (node) {
      node.classList.remove("active", "completed");
      if (i < step) node.classList.add("completed");
      else if (i === step) node.classList.add("active");
    }
    if (pane) {
      pane.style.display = i === step ? "flex" : "none";
    }
  }

  const subtitle = document.getElementById("importWizardStepSubtitle");
  const nextBtn = document.getElementById("importWizardNextBtn");

  if (step === 1) {
    if (subtitle) subtitle.textContent = "Step 1 of 4: Select and parse CSV file";
    if (nextBtn) {
      nextBtn.disabled = !importWizardState.rawFileText;
      nextBtn.textContent = "Proceed to Mapping →";
    }
  } else if (step === 2) {
    if (subtitle) subtitle.textContent = "Step 2 of 4: Map CSV columns to Hisaab fields";
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = "Validate Data Rows →";
    }
    renderColumnMappingGrid();
  } else if (step === 3) {
    if (subtitle) subtitle.textContent = "Step 3 of 4: Review row-level validation results";
    if (nextBtn) {
      nextBtn.disabled = importWizardState.validatedRecords.length === 0;
      nextBtn.textContent = `Confirm Import (${importWizardState.validatedRecords.length} Valid) →`;
    }
    executeImportValidation();
  } else if (step === 4) {
    if (subtitle) subtitle.textContent = "Step 4 of 4: Commit assets to local database";
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = "Complete Import & Finish ✓";
    }
    const commitText = document.getElementById("importCommitSummaryText");
    if (commitText) {
      commitText.textContent = `${importWizardState.validatedRecords.length} validated vehicles will be registered into Apex Fleet.`;
    }
  }
}

function advanceImportWizard() {
  if (importWizardState.currentStep === 1) {
    showImportWizardStep(2);
  } else if (importWizardState.currentStep === 2) {
    showImportWizardStep(3);
  } else if (importWizardState.currentStep === 3) {
    showImportWizardStep(4);
  } else if (importWizardState.currentStep === 4) {
    // Commit valid records to StorageManager
    importWizardState.validatedRecords.forEach(v => {
      StorageManager.addVehicle(v);
    });

    Utils.closeModal("importVehiclesModal");
    Utils.showToast("Import Complete", `Successfully imported ${importWizardState.validatedRecords.length} vehicles into Apex Fleet.`, "success");
    navigateTo("vehicles");
  }
}

function handleCSVFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    importWizardState.rawFileText = e.target.result;
    parseCSVText(importWizardState.rawFileText);
    const nextBtn = document.getElementById("importWizardNextBtn");
    if (nextBtn) nextBtn.disabled = false;
    Utils.showToast("File Parsed", `Loaded ${importWizardState.parsedRows.length} rows from ${file.name}.`, "info");
    showImportWizardStep(2);
  };
  reader.readAsText(file);
}

function parseCSVText(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    alert("CSV file must contain at least a header row and one data row.");
    return;
  }

  // Parse header
  importWizardState.parsedHeaders = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));

  // Parse rows
  importWizardState.parsedRows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === importWizardState.parsedHeaders.length) {
      importWizardState.parsedRows.push(values);
    }
  }
}

function renderColumnMappingGrid() {
  const grid = document.getElementById("columnMappingGrid");
  if (!grid) return;

  const standardFields = [
    { key: "regNumber", label: "Registration Number *" },
    { key: "makeModel", label: "Make & Model *" },
    { key: "category", label: "Category / Type" },
    { key: "year", label: "Manufacturing Year" },
    { key: "ownerName", label: "Owner Name" },
    { key: "rcValidity", label: "RC Validity Date" },
    { key: "insuranceExpiry", label: "Insurance Expiry Date" },
    { key: "pucExpiry", label: "PUC Expiry Date" }
  ];

  grid.innerHTML = standardFields.map(f => {
    // Auto-detect matched header
    let matchedHeader = importWizardState.parsedHeaders.find(h =>
      h.toLowerCase().includes(f.key.toLowerCase()) ||
      h.toLowerCase().includes(f.label.toLowerCase().slice(0, 4))
    ) || "";

    return `
      <div class="form-group">
        <label class="form-label">${f.label}</label>
        <select class="form-select column-mapping-select" data-field="${f.key}">
          <option value="">-- Ignore Field --</option>
          ${importWizardState.parsedHeaders.map(h => `
            <option value="${h}" ${h === matchedHeader ? 'selected' : ''}>${h}</option>
          `).join("")}
        </select>
      </div>
    `;
  }).join("");
}

function executeImportValidation() {
  // Read column mappings
  const mappingSelects = document.querySelectorAll(".column-mapping-select");
  importWizardState.mappedFields = {};
  mappingSelects.forEach(sel => {
    if (sel.value) {
      importWizardState.mappedFields[sel.dataset.field] = sel.value;
    }
  });

  const regColIdx = importWizardState.parsedHeaders.indexOf(importWizardState.mappedFields.regNumber);
  const modelColIdx = importWizardState.parsedHeaders.indexOf(importWizardState.mappedFields.makeModel);
  const yearColIdx = importWizardState.parsedHeaders.indexOf(importWizardState.mappedFields.year);
  const ownerColIdx = importWizardState.parsedHeaders.indexOf(importWizardState.mappedFields.ownerName);

  importWizardState.validatedRecords = [];
  importWizardState.invalidRecords = [];

  const existingRegs = new Set(StorageManager.getVehicles().map(v => v.regNumber.toUpperCase()));
  const batchRegs = new Set();
  const regRegex = /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/;

  const previewBody = document.getElementById("importPreviewTableBody");

  importWizardState.parsedRows.forEach((row, idx) => {
    const rawReg = (row[regColIdx] || "").trim().toUpperCase();
    const rawModel = (row[modelColIdx] || "").trim();
    const rawYear = parseInt(row[yearColIdx] || "2023", 10);
    const rawOwner = (row[ownerColIdx] || "Apex Fleet Pvt Ltd").trim();

    const errors = [];

    if (!rawReg) errors.push("Missing Registration");
    else if (!regRegex.test(rawReg)) errors.push("Invalid Reg Format");
    else if (existingRegs.has(rawReg)) errors.push("Duplicate in Database");
    else if (batchRegs.has(rawReg)) errors.push("Duplicate in CSV Batch");

    if (!rawModel) errors.push("Missing Model");

    if (errors.length === 0) {
      batchRegs.add(rawReg);
      importWizardState.validatedRecords.push({
        id: "veh-" + (Date.now() + idx),
        regNumber: rawReg,
        makeModel: rawModel,
        category: "Light Commercial Vehicle (LCV)",
        year: rawYear || 2023,
        chassisNumber: "MAT" + Math.floor(1000000000 + Math.random() * 9000000000),
        engineNumber: "ENG" + Math.floor(100000 + Math.random() * 900000),
        ownerName: rawOwner || "Apex Fleet Pvt Ltd",
        currentLesseeId: null,
        currentDriverId: null,
        defaultResponsibleParty: "Fleet Operator",
        openChallans: 0,
        outstandingAmount: 0,
        syncStatus: "Synced",
        source: "CSV Batch Import",
        rcValidity: "2038-05-15",
        insuranceExpiry: "2027-01-30",
        pucExpiry: "2026-12-15",
        fastagStatus: "Active",
        fastagBalance: 1500,
        responsibilityPeriods: [
          {
            startDate: new Date().toISOString().split("T")[0],
            endDate: "2027-12-31",
            partyType: "Fleet Operator",
            partyName: rawOwner || "Apex Fleet Pvt Ltd",
            contractRef: "CSV-IMP-" + Date.now().toString().slice(-4)
          }
        ]
      });
    } else {
      importWizardState.invalidRecords.push({
        rowNumber: idx + 2,
        regNumber: rawReg || "—",
        makeModel: rawModel || "—",
        ownerName: rawOwner || "—",
        errors: errors
      });
    }
  });

  // Render Summary Stats
  const summaryContainer = document.getElementById("importValidationSummary");
  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <span class="badge badge--paid" style="font-size: 12px; padding: 4px 10px;">
        ✓ ${importWizardState.validatedRecords.length} Valid Rows Ready
      </span>
      ${importWizardState.invalidRecords.length > 0 ? `
        <span class="badge badge--unassigned" style="font-size: 12px; padding: 4px 10px;">
          ⚠ ${importWizardState.invalidRecords.length} Rows with Errors
        </span>
      ` : ''}
    `;
  }

  // Render Rows in Preview Table
  if (previewBody) {
    let rowsHTML = "";

    importWizardState.validatedRecords.slice(0, 5).forEach((v, idx) => {
      rowsHTML += `
        <tr class="import-row-valid">
          <td>#${idx + 1}</td>
          <td><strong class="font-mono text-primary">${v.regNumber}</strong></td>
          <td>${v.makeModel}</td>
          <td>${v.ownerName}</td>
          <td><span class="badge badge--paid">Ready to Import</span></td>
        </tr>
      `;
    });

    importWizardState.invalidRecords.slice(0, 5).forEach(inv => {
      rowsHTML += `
        <tr class="import-row-invalid">
          <td>#${inv.rowNumber}</td>
          <td><span class="font-mono">${inv.regNumber}</span></td>
          <td>${inv.makeModel}</td>
          <td>${inv.ownerName}</td>
          <td>
            ${inv.errors.map(err => `<span class="error-pill">${err}</span>`).join(" ")}
          </td>
        </tr>
      `;
    });

    previewBody.innerHTML = rowsHTML;
  }

  // Show Error Download button if errors present
  const errRow = document.getElementById("importErrorDownloadRow");
  if (errRow) {
    errRow.style.display = importWizardState.invalidRecords.length > 0 ? "flex" : "none";
  }
}

function downloadSampleVehicleCSV() {
  const sampleCSV = `Registration Number,Make & Model,Category,Year,Owner Name,RC Validity,Insurance Expiry,PUC Expiry\nDL-01-XY-1001,Tata Ace Gold Diesel,LCV,2023,Apex Fleet Pvt Ltd,2038-04-15,2027-02-14,2026-11-20\nMH-12-AB-2002,Mahindra Bolero Maxx,MCV,2022,Apex Fleet Pvt Ltd,2037-08-10,2026-12-05,2026-08-14\nHR-26-CD-3003,Maruti Super Carry,Mini Truck,2024,Apex Fleet Pvt Ltd,2039-01-20,2027-05-10,2026-12-10`;
  const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "apex-fleet-sample-template.csv";
  link.click();
}

function downloadImportErrorsCSV() {
  const csvRows = ["Row Number,Registration Number,Make & Model,Owner Name,Validation Errors"];
  importWizardState.invalidRecords.forEach(inv => {
    csvRows.push(`"${inv.rowNumber}","${inv.regNumber}","${inv.makeModel}","${inv.ownerName}","${inv.errors.join("; ")}"`);
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "apex-fleet-import-errors.csv";
  link.click();
}

// --------------------------------------------------------------------------
// 15. STEP 5.5: CUSTODY TIMELINE HANDOVER CONTROLLER
// --------------------------------------------------------------------------

let currentTimelineVehicleId = null;

function openAddCustodyModal(vehicleId) {
  currentTimelineVehicleId = vehicleId;
  const partySelect = document.getElementById("custodyPartyType");
  if (partySelect) {
    partySelect.value = "Driver";
    populateCustodyPartyOptions("Driver");
  }

  document.getElementById("custodyStartDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("custodyEndDate").value = "2027-06-30";
  document.getElementById("custodyContractRef").value = "TRIP-" + Math.floor(1000 + Math.random() * 9000);

  Utils.openModal("addCustodyPeriodModal");
}

function openAddCustodyPeriodModal(vehicleId) {
  return openAddCustodyModal(vehicleId);
}
window.openAddCustodyModal = openAddCustodyModal;
window.openAddCustodyPeriodModal = openAddCustodyPeriodModal;

function populateCustodyPartyOptions(partyType) {
  const select = document.getElementById("custodyPartyNameSelect");
  if (!select) return;

  if (partyType === "Driver") {
    const drivers = StorageManager.getDrivers();
    select.innerHTML = drivers.map(d => `<option value="${d.name}">${d.name} (${d.assignedVehicleReg})</option>`).join("");
  } else if (partyType === "Lessee") {
    const lessees = StorageManager.getLessees();
    select.innerHTML = lessees.map(l => `<option value="${l.name}">${l.name}</option>`).join("");
  } else {
    select.innerHTML = `<option value="Apex Fleet Pvt Ltd">Apex Fleet Pvt Ltd (In-House Depot)</option>`;
  }
}

function submitCustodyPeriodForm() {
  if (!currentTimelineVehicleId) return;

  const vehicle = StorageManager.getVehicleById(currentTimelineVehicleId);
  if (!vehicle) return;

  const partyType = document.getElementById("custodyPartyType").value;
  const partyName = document.getElementById("custodyPartyNameSelect").value;
  const startDate = document.getElementById("custodyStartDate").value;
  const endDate = document.getElementById("custodyEndDate").value;
  const ref = document.getElementById("custodyContractRef").value.trim();

  if (new Date(startDate) >= new Date(endDate)) {
    alert("Handover start date must be before end date.");
    return;
  }

  if (!vehicle.responsibilityPeriods) vehicle.responsibilityPeriods = [];

  vehicle.responsibilityPeriods.push({
    startDate: startDate,
    endDate: endDate,
    partyType: partyType,
    partyName: partyName,
    contractRef: ref
  });

  // Sort periods chronologically
  vehicle.responsibilityPeriods.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  StorageManager.updateVehicle(vehicle.id, {
    responsibilityPeriods: vehicle.responsibilityPeriods
  });

  Utils.closeModal("addCustodyPeriodModal");
  Utils.showToast("Custody Period Recorded", `Assigned ${partyType} (${partyName}) from ${startDate} to ${endDate}.`, "success");

  // Re-render
  renderVehicleDetailsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"), vehicle.id);
}

// --------------------------------------------------------------------------
// 16. GLOBAL WINDOW EXPORTS FOR HTML EVENT HANDLERS
// --------------------------------------------------------------------------
window.openAddVehicleModal = openAddVehicleModal;
window.openEditVehicleModal = openEditVehicleModal;
window.submitAddVehicleForm = submitAddVehicleForm;
window.archiveVehicle = archiveVehicle;
window.openImportVehiclesWizard = openImportVehiclesWizard;
window.openImportVehiclesModal = openImportVehiclesModal;
window.advanceImportWizard = advanceImportWizard;
window.handleCSVFileSelect = handleCSVFileSelect;
window.downloadSampleVehicleCSV = downloadSampleVehicleCSV;
window.downloadImportErrorsCSV = downloadImportErrorsCSV;
window.sortVehiclesBy = sortVehiclesBy;
window.changeVehiclePage = changeVehiclePage;
window.clearVehicleSearch = clearVehicleSearch;
window.bulkSyncSelectedVehicles = bulkSyncSelectedVehicles;
window.bulkExportSelectedVehicles = bulkExportSelectedVehicles;
window.deselectAllVehicles = deselectAllVehicles;
window.populateCustodyPartyOptions = populateCustodyPartyOptions;
window.submitCustodyPeriodForm = submitCustodyPeriodForm;


