/**
 * ChallanOS - Challan Management Module (js/challans.js)
 * 
 * Features:
 * - Challan listing with status tabs (All, Unassigned, Assigned, Pending, Disputed, Virtual Court, Paid)
 * - Saved view shortcuts (Overdue Only, Due in 7 Days, High Value, Unassigned Triage)
 * - Multi-criteria filter toolbar (Search, Offence Category, Source Gateway, Responsible Party)
 * - Dense data table with checkbox selection and sorting
 * - Floating Bulk Actions Bar (Bulk Assign, Bulk Dispute, Bulk Pay, CSV Export)
 * - Flagship Two-Column Challan Details Screen:
 *   * Left Column: CCTV Photographic HUD Telemetry, Speed Radar, Zoomed License Plate Inset, Fee Breakdown, Countdowns
 *   * Right Column: Explainable Automated Recommendation, Conflict Alert, Party Selector Radios, Split Liability Controls, Mandatory Audit Justification, Lifecycle Activity Ledger
 */

let challanTableState = {
  currentPage: 1,
  pageSize: 10,
  sortColumn: "offenceDate",
  sortDirection: "desc",
  activeStatusTab: "all",
  searchQuery: "",
  selectedChallanIds: new Set(),
  filterOffence: "",
  filterSource: "",
  filterParty: "",
  filterDate: "",
  savedView: "all"
};

function renderChallansView(container, actions, params = {}) {
  // If specific Challan ID requested, render Two-Column Flagship Details Screen!
  if (params.id) {
    renderChallanDetailsView(container, actions, params.id);
    return;
  }

  // Pre-populate filter states if passed from Dashboard or Global Search
  if (params.status) {
    challanTableState.activeStatusTab = params.status;
  }
  if (params.filter === "due7days") {
    challanTableState.savedView = "due7days";
  } else if (params.filter === "overdue") {
    challanTableState.savedView = "overdue";
  }
  if (params.responsibleParty) {
    challanTableState.filterParty = params.responsibleParty;
  }
  if (params.date) {
    challanTableState.filterDate = params.date;
  }
  if (params.search) {
    challanTableState.searchQuery = params.search;
  }

  // Header Actions
  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV(StorageManager.getChallans(), 'apex-fleet-challans.csv')">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      Export CSV
    </button>
    <button class="btn btn--primary btn--sm" onclick="openAssignmentModal('chl-101')">
      + Quick Triage Queue
    </button>
  `;

  const allChallans = StorageManager.getChallans();

  // Status Tabs
  const tabs = [
    { key: "all", label: "All", count: allChallans.length },
    { key: "unassigned", label: "Unassigned", count: allChallans.filter(c => c.status === "unassigned").length },
    { key: "assigned", label: "Assigned", count: allChallans.filter(c => c.status === "assigned").length },
    { key: "pending", label: "Pending", count: allChallans.filter(c => c.status === "pending").length },
    { key: "disputed", label: "Disputed", count: allChallans.filter(c => c.status === "disputed").length },
    { key: "court", label: "Court", count: allChallans.filter(c => c.status === "court").length },
    { key: "paid", label: "Paid", count: allChallans.filter(c => c.status === "paid").length }
  ];

  container.innerHTML = `
    <!-- Status Tabs -->
    <div class="nav-tabs" id="challanStatusTabs">
      ${tabs.map(t => `
        <button class="nav-tab ${challanTableState.activeStatusTab === t.key ? 'active' : ''}" data-status="${t.key}">
          ${t.label} <span class="nav-tab-badge">${t.count}</span>
        </button>
      `).join("")}
    </div>

    <!-- Saved Views Quick Filter Chips -->
    <div class="filter-chips-row" style="margin-bottom: var(--space-4);">
      <span class="text-xs font-semibold text-muted" style="text-transform: uppercase;">Saved Views:</span>
      <span class="filter-chip ${challanTableState.savedView === 'all' ? 'active' : ''}" onclick="applyChallanSavedView('all')">All Violations</span>
      <span class="filter-chip ${challanTableState.savedView === 'overdue' ? 'active' : ''}" onclick="applyChallanSavedView('overdue')">Overdue Only</span>
      <span class="filter-chip ${challanTableState.savedView === 'due7days' ? 'active' : ''}" onclick="applyChallanSavedView('due7days')">Due in 7 Days</span>
      <span class="filter-chip ${challanTableState.savedView === 'highValue' ? 'active' : ''}" onclick="applyChallanSavedView('highValue')">High Value (&gt; ₹2,000)</span>
      <span class="filter-chip ${challanTableState.savedView === 'unassignedTriage' ? 'active' : ''}" onclick="applyChallanSavedView('unassignedTriage')">Unassigned Triage</span>
      ${hasActiveChallanFilters() ? `
        <button class="btn btn--ghost btn--sm" style="font-size: 11px; padding: 2px 6px;" onclick="resetChallanFilters()">Reset All Filters</button>
      ` : ''}
    </div>

    <!-- Multi-Criteria Filter & Search Toolbar -->
    <div class="filter-toolbar" style="margin-bottom: var(--space-4);">
      <div class="filter-group">
        <div style="position: relative; width: 280px;">
          <svg class="search-icon-prefix" viewBox="0 0 20 20" fill="currentColor" style="left: 10px;">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" class="form-input" id="challanSearchInput" style="padding-left: 34px;"
            placeholder="Search challan no, vehicle, driver, location..." value="${challanTableState.searchQuery}">
        </div>

        <!-- Offence Filter -->
        <select class="form-select" id="filterOffenceSelect" style="width: 170px; font-size: 12px; padding: 6px 10px;">
          <option value="">All Offences</option>
          <option value="Speed" ${challanTableState.filterOffence === 'Speed' ? 'selected' : ''}>Overspeeding (Sec 183)</option>
          <option value="Signal" ${challanTableState.filterOffence === 'Signal' ? 'selected' : ''}>Red Light (Sec 184)</option>
          <option value="Seat Belt" ${challanTableState.filterOffence === 'Seat Belt' ? 'selected' : ''}>Seatbelt (Sec 194B)</option>
          <option value="PUC" ${challanTableState.filterOffence === 'PUC' ? 'selected' : ''}>PUC Lapsed (Sec 190(2))</option>
          <option value="Overloading" ${challanTableState.filterOffence === 'Overloading' ? 'selected' : ''}>Overloading (Sec 194)</option>
          <option value="Parking" ${challanTableState.filterOffence === 'Parking' ? 'selected' : ''}>Improper Parking</option>
          <option value="Mobile" ${challanTableState.filterOffence === 'Mobile' ? 'selected' : ''}>Mobile Phone</option>
        </select>

        <!-- Source Filter -->
        <select class="form-select" id="filterSourceSelect" style="width: 150px; font-size: 12px; padding: 6px 10px;">
          <option value="">All Sources</option>
          <option value="Parivahan API" ${challanTableState.filterSource === 'Parivahan API' ? 'selected' : ''}>Parivahan API</option>
          <option value="Manual Upload" ${challanTableState.filterSource === 'Manual Upload' ? 'selected' : ''}>Manual Upload</option>
          <option value="FASTag Gateway" ${challanTableState.filterSource === 'FASTag Gateway' ? 'selected' : ''}>FASTag Gateway</option>
          <option value="Virtual Court" ${challanTableState.filterSource === 'Virtual Court' ? 'selected' : ''}>Virtual Court</option>
        </select>

        <!-- Party Filter -->
        <select class="form-select" id="filterPartySelect" style="width: 150px; font-size: 12px; padding: 6px 10px;">
          <option value="">All Responsible</option>
          <option value="Driver" ${challanTableState.filterParty === 'Driver' ? 'selected' : ''}>Driver</option>
          <option value="Lessee" ${challanTableState.filterParty === 'Lessee' ? 'selected' : ''}>Corporate Lessee</option>
          <option value="Fleet Operator" ${challanTableState.filterParty === 'Fleet Operator' ? 'selected' : ''}>Fleet Operator</option>
          <option value="Vehicle Owner" ${challanTableState.filterParty === 'Vehicle Owner' ? 'selected' : ''}>Vehicle Owner</option>
          <option value="Unassigned" ${challanTableState.filterParty === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
        </select>

        <!-- Date Filter -->
        <select class="form-select" id="filterDateSelect" style="width: 130px; font-size: 12px; padding: 6px 10px;">
          <option value="">All Dates</option>
          <option value="today" ${challanTableState.filterDate === 'today' ? 'selected' : ''}>Today</option>
          <option value="7days" ${challanTableState.filterDate === '7days' ? 'selected' : ''}>Last 7 Days</option>
          <option value="30days" ${challanTableState.filterDate === '30days' ? 'selected' : ''}>Last 30 Days</option>
          <option value="90days" ${challanTableState.filterDate === '90days' ? 'selected' : ''}>Last 90 Days</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="text-xs text-muted">Rows:</label>
        <select class="form-select" id="challanPageSizeSelect" style="width: 70px; padding: 4px 8px; font-size: 12px;">
          <option value="10" ${challanTableState.pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="15" ${challanTableState.pageSize === 15 ? 'selected' : ''}>15</option>
          <option value="30" ${challanTableState.pageSize === 30 ? 'selected' : ''}>30</option>
        </select>
      </div>
    </div>

    <!-- Challans Table Card -->
    <div class="card" id="challansTableCardContainer">
      <div class="card-body" style="padding: 0;" id="challansTableBodyContainer"></div>
      <div class="table-pagination" id="challansPaginationContainer"></div>
    </div>

    <!-- Sticky Bulk Actions Floating Bar -->
    <div class="bulk-actions-bar" id="challanBulkActionsBar" style="display: none;">
      <div style="display: flex; align-items: center; gap: var(--space-3);">
        <span style="font-weight: 600; font-size: 13px;" id="selectedChallansCountText">0 Challans Selected</span>
        <span class="badge badge--neutral" style="background: rgba(255,255,255,0.2); color: #fff;" id="selectedChallansTotalSum">Total: ₹0</span>
      </div>
      <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <button class="btn btn--outline btn--sm" style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #fff;" onclick="openBulkAssignModal()">
          Assign Responsibility
        </button>
        <button class="btn btn--outline btn--sm" style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #fff;" onclick="openBulkDisputeModal()">
          Mark Disputed
        </button>
        <button class="btn btn--secondary btn--sm" onclick="executeBulkPaymentSimulation()">
          Bulk Pay Selected
        </button>
        <button class="btn btn--outline btn--sm" style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #fff;" onclick="exportSelectedChallansCSV()">
          Export CSV
        </button>
        <button class="btn btn--ghost btn--sm" style="color: #fff;" onclick="deselectAllChallans()">
          Deselect All
        </button>
      </div>
    </div>
  `;

  // Attach Status Tabs
  container.querySelectorAll("#challanStatusTabs .nav-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      challanTableState.activeStatusTab = tabBtn.dataset.status;
      challanTableState.savedView = "all";
      challanTableState.currentPage = 1;
      renderChallansView(container, actions);
    });
  });

  // Attach Search Input
  const searchInput = container.querySelector("#challanSearchInput") || document.getElementById("challanSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", Utils.debounce((e) => {
      challanTableState.searchQuery = e.target.value.trim();
      challanTableState.currentPage = 1;
      renderChallansTableAndPagination();
    }, 200));
  }

  // Attach Dropdown Filters
  const offenceSel = container.querySelector("#filterOffenceSelect") || document.getElementById("filterOffenceSelect");
  if (offenceSel) {
    offenceSel.addEventListener("change", (e) => {
      challanTableState.filterOffence = e.target.value;
      challanTableState.currentPage = 1;
      renderChallansTableAndPagination();
    });
  }

  const sourceSel = container.querySelector("#filterSourceSelect") || document.getElementById("filterSourceSelect");
  if (sourceSel) {
    sourceSel.addEventListener("change", (e) => {
      challanTableState.filterSource = e.target.value;
      challanTableState.currentPage = 1;
      renderChallansTableAndPagination();
    });
  }

  const partySel = container.querySelector("#filterPartySelect") || document.getElementById("filterPartySelect");
  if (partySel) {
    partySel.addEventListener("change", (e) => {
      challanTableState.filterParty = e.target.value;
      challanTableState.currentPage = 1;
      renderChallansTableAndPagination();
    });
  }

  const dateSel = container.querySelector("#filterDateSelect") || document.getElementById("filterDateSelect");
  if (dateSel) {
    dateSel.addEventListener("change", (e) => {
      challanTableState.filterDate = e.target.value;
      challanTableState.currentPage = 1;
      renderChallansTableAndPagination();
    });
  }

  const pageSizeSel = container.querySelector("#challanPageSizeSelect") || document.getElementById("challanPageSizeSelect");
  if (pageSizeSel) {
    pageSizeSel.addEventListener("change", (e) => {
      challanTableState.pageSize = parseInt(e.target.value, 10);
      challanTableState.currentPage = 1;
      renderChallansTableAndPagination();
    });
  }

  renderChallansTableAndPagination();
}

function hasActiveChallanFilters() {
  return (
    challanTableState.activeStatusTab !== "all" ||
    challanTableState.savedView !== "all" ||
    challanTableState.searchQuery !== "" ||
    challanTableState.filterOffence !== "" ||
    challanTableState.filterSource !== "" ||
    challanTableState.filterParty !== "" ||
    challanTableState.filterDate !== ""
  );
}

function resetChallanFilters() {
  challanTableState.activeStatusTab = "all";
  challanTableState.savedView = "all";
  challanTableState.searchQuery = "";
  challanTableState.filterOffence = "";
  challanTableState.filterSource = "";
  challanTableState.filterParty = "";
  challanTableState.filterDate = "";
  challanTableState.currentPage = 1;
  navigateTo("challans");
}

function applyChallanSavedView(viewKey) {
  challanTableState.savedView = viewKey;
  challanTableState.currentPage = 1;

  if (viewKey === "all") {
    challanTableState.activeStatusTab = "all";
  } else if (viewKey === "unassignedTriage") {
    challanTableState.activeStatusTab = "unassigned";
  }

  navigateTo("challans", true, viewKey !== 'all' ? { filter: viewKey } : {});
}

function renderChallansTableAndPagination() {
  const allChallans = StorageManager.getChallans();

  // 1. Filter by Status Tab
  let filtered = allChallans;
  if (challanTableState.activeStatusTab !== "all") {
    filtered = filtered.filter(c => c.status.toLowerCase() === challanTableState.activeStatusTab.toLowerCase());
  }

  // 2. Filter by Saved View
  if (challanTableState.savedView === "overdue") {
    filtered = filtered.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== "paid");
  } else if (challanTableState.savedView === "due7days") {
    filtered = filtered.filter(c => {
      const d = Utils.getDaysRemaining(c.dueDate);
      return d >= 0 && d <= 7 && c.status !== "paid";
    });
  } else if (challanTableState.savedView === "highValue") {
    filtered = filtered.filter(c => (c.amount || 0) > 2000);
  }

  // 3. Dropdown Filters
  if (challanTableState.filterOffence) {
    const off = challanTableState.filterOffence.toLowerCase();
    filtered = filtered.filter(c => c.offence.toLowerCase().includes(off) || c.mvActSection.toLowerCase().includes(off));
  }

  if (challanTableState.filterSource) {
    filtered = filtered.filter(c => c.source === challanTableState.filterSource);
  }

  if (challanTableState.filterParty) {
    filtered = filtered.filter(c => c.responsibleParty === challanTableState.filterParty || c.suggestedParty === challanTableState.filterParty);
  }

  // 4. Date Filter
  if (challanTableState.filterDate) {
    const now = new Date();
    filtered = filtered.filter(c => {
      const d = new Date(c.offenceDate);
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (challanTableState.filterDate === "today") return diffDays === 0;
      if (challanTableState.filterDate === "7days") return diffDays >= 0 && diffDays <= 7;
      if (challanTableState.filterDate === "30days") return diffDays >= 0 && diffDays <= 30;
      if (challanTableState.filterDate === "90days") return diffDays >= 0 && diffDays <= 90;
      return true;
    });
  }

  // 5. Search Filter (Challan No, Vehicle Reg/Model, Offence, Location, Driver)
  if (challanTableState.searchQuery) {
    const q = challanTableState.searchQuery.toLowerCase();
    filtered = filtered.filter(c => {
      const veh = StorageManager.getVehicleById(c.vehicleId);
      const drvName = (veh && veh.currentDriverId) ? (StorageManager.getDriverById(veh.currentDriverId)?.name || "") : "";
      return (
        c.challanNumber.toLowerCase().includes(q) ||
        c.vehicleReg.toLowerCase().includes(q) ||
        (veh && veh.makeModel && veh.makeModel.toLowerCase().includes(q)) ||
        c.offence.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q)) ||
        (c.responsiblePartyName && c.responsiblePartyName.toLowerCase().includes(q)) ||
        (c.suggestedPartyName && c.suggestedPartyName.toLowerCase().includes(q)) ||
        drvName.toLowerCase().includes(q)
      );
    });
  }

  // 5. Sorting
  filtered.sort((a, b) => {
    let valA = a[challanTableState.sortColumn];
    let valB = b[challanTableState.sortColumn];

    if (challanTableState.sortColumn === "offenceDate" || challanTableState.sortColumn === "dueDate") {
      const timeA = new Date(valA).getTime() || 0;
      const timeB = new Date(valB).getTime() || 0;
      return challanTableState.sortDirection === "asc" ? timeA - timeB : timeB - timeA;
    }

    if (typeof valA === "string") {
      return challanTableState.sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return challanTableState.sortDirection === "asc"
      ? (valA || 0) - (valB || 0)
      : (valB || 0) - (valA || 0);
  });

  // 6. Pagination
  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / challanTableState.pageSize) || 1;
  if (challanTableState.currentPage > totalPages) challanTableState.currentPage = totalPages;

  const startIndex = (challanTableState.currentPage - 1) * challanTableState.pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + challanTableState.pageSize);

  const tableContainer = document.getElementById("challansTableBodyContainer");
  if (!tableContainer) return;

  if (paginatedRows.length === 0) {
    tableContainer.innerHTML = `
      <div class="empty-state" style="padding: 48px 16px;">
        <div class="empty-state-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div class="empty-state-title">No Challan Infractions Found</div>
        <div class="empty-state-text">No traffic violations match your active filters or search criteria.</div>
        <button class="btn btn--outline btn--sm" onclick="resetChallanFilters()">Reset All Filters</button>
      </div>
    `;
  } else {
    const isAllSelected = paginatedRows.every(r => challanTableState.selectedChallanIds.has(r.id));

    tableContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">
              <input type="checkbox" class="custom-checkbox" id="selectAllChallansCheckbox" ${isAllSelected ? 'checked' : ''} onchange="toggleSelectAllChallans(this.checked)">
            </th>
            <th onclick="sortChallansBy('challanNumber')" style="cursor: pointer;">
              Challan No ${getChallanSortIcon('challanNumber')}
            </th>
            <th onclick="sortChallansBy('vehicleReg')" style="cursor: pointer;">
              Vehicle ${getChallanSortIcon('vehicleReg')}
            </th>
            <th>Offence Description & Section</th>
            <th class="col-nice" onclick="sortChallansBy('offenceDate')" style="cursor: pointer;">
              Offence Date ${getChallanSortIcon('offenceDate')}
            </th>
            <th onclick="sortChallansBy('amount')" style="cursor: pointer;">
              Amount ${getChallanSortIcon('amount')}
            </th>
            <th class="col-nice" onclick="sortChallansBy('lateFee')" style="cursor: pointer;">
              Late Fee ${getChallanSortIcon('lateFee')}
            </th>
            <th class="col-should" onclick="sortChallansBy('dueDate')" style="cursor: pointer;">
              Due Date ${getChallanSortIcon('dueDate')}
            </th>
            <th>Status</th>
            <th class="col-should">Responsible Party</th>
            <th class="col-nice">Source</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedRows.map(c => {
            const isChecked = challanTableState.selectedChallanIds.has(c.id);
            const daysLeft = Utils.getDaysRemaining(c.dueDate);
            const isOverdue = daysLeft < 0 && c.status !== "paid";

            return `
              <tr class="${isChecked ? 'row-selected' : ''}">
                <td style="text-align: center;">
                  <input type="checkbox" class="custom-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleChallanRowSelection('${c.id}', this.checked)">
                </td>
                <td>
                  <a href="#challans?id=${c.id}" class="challan-no-link" title="Open Challan Details Screen">
                    ${c.challanNumber}
                  </a>
                </td>
                <td>
                  <a href="#vehicles?id=${c.vehicleId}" class="plate-chip plate-chip--commercial" title="View vehicle profile">
                    ${c.vehicleReg}
                  </a>
                </td>
                <td>
                  <div class="cell-truncate" style="font-size: 13px; font-weight: 500;" title="${c.offence}">${c.offence}</div>
                  <div class="text-xs text-muted">${c.mvActSection}</div>
                </td>
                <td class="col-nice">
                  <div class="text-xs">${Utils.formatDate(c.offenceDate, true)}</div>
                  <div class="text-xs text-muted" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${c.location || '—'}</div>
                </td>
                <td>
                  <strong class="amount-cell" style="font-size: 13px; white-space: nowrap;">${Utils.formatINR(c.amount)}</strong>
                </td>
                <td class="col-nice">
                  <span style="font-size: 12px; font-weight: 600; color: ${(c.lateFee || 0) > 0 ? 'var(--status-unassigned)' : 'var(--color-text-muted)'};">
                    ${Utils.formatINR(c.lateFee || 0)}
                  </span>
                </td>
                <td class="col-should">
                  <div class="text-xs">${Utils.formatDate(c.dueDate)}</div>
                  <div class="text-xs" style="font-weight: 600; color: ${isOverdue ? 'var(--status-unassigned)' : 'var(--color-text-muted)'};">
                    ${isOverdue ? `Overdue by ${Math.abs(daysLeft)}d` : `${daysLeft} days left`}
                  </div>
                </td>
                <td>${Utils.getStatusBadgeHTML(c.status)}</td>
                <td class="col-should">
                  <div><strong class="cell-truncate" title="${c.responsiblePartyName || c.responsibleParty}">${c.responsiblePartyName || c.responsibleParty}</strong></div>
                  <div class="text-xs text-muted">${c.responsibleParty}</div>
                </td>
                <td class="col-nice">
                  <span class="badge badge--neutral" style="font-size: 10px;">${c.source}</span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 4px;">
                    <a href="#challans?id=${c.id}" class="btn btn--outline btn--sm" title="Open Two-Column Details">
                      Details
                    </a>
                    ${c.status === 'unassigned' ? `
                      <button class="btn btn--secondary btn--sm" onclick="openAssignmentModal('${c.id}')" title="Assign Liability">Assign</button>
                    ` : (c.status !== 'paid' && c.status !== 'court' ? `
                      <button class="btn btn--secondary btn--sm" onclick="openPaymentModal('${c.id}')" title="Pay Now">Pay</button>
                    ` : '')}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  // Pagination Footer
  const paginationContainer = document.getElementById("challansPaginationContainer");
  if (paginationContainer) {
    paginationContainer.innerHTML = `
      <div>
        Showing <strong>${totalRecords > 0 ? startIndex + 1 : 0}</strong> to <strong>${Math.min(startIndex + challanTableState.pageSize, totalRecords)}</strong> of <strong>${totalRecords}</strong> challans
      </div>
      <div style="display: flex; gap: var(--space-2); align-items: center;">
        <button class="btn btn--outline btn--sm" ${challanTableState.currentPage === 1 ? 'disabled' : ''} onclick="changeChallanPage(${challanTableState.currentPage - 1})">
          ← Previous
        </button>
        <span class="text-xs text-muted" style="padding: 0 4px;">Page <strong>${challanTableState.currentPage}</strong> of <strong>${totalPages}</strong></span>
        <button class="btn btn--outline btn--sm" ${challanTableState.currentPage >= totalPages ? 'disabled' : ''} onclick="changeChallanPage(${challanTableState.currentPage + 1})">
          Next →
        </button>
      </div>
    `;
  }

  updateChallanBulkActionsBarVisibility();
}

function getChallanSortIcon(col) {
  if (challanTableState.sortColumn !== col) {
    return `<span style="color: var(--color-text-subtle); font-size: 10px;">↕</span>`;
  }
  return challanTableState.sortDirection === "asc" ? "▲" : "▼";
}

function sortChallansBy(col) {
  if (challanTableState.sortColumn === col) {
    challanTableState.sortDirection = challanTableState.sortDirection === "asc" ? "desc" : "asc";
  } else {
    challanTableState.sortColumn = col;
    challanTableState.sortDirection = "asc";
  }
  renderChallansTableAndPagination();
}

function changeChallanPage(newPage) {
  challanTableState.currentPage = newPage;
  renderChallansTableAndPagination();
}

function toggleChallanRowSelection(id, checked) {
  if (checked) challanTableState.selectedChallanIds.add(id);
  else challanTableState.selectedChallanIds.delete(id);
  renderChallansTableAndPagination();
}

function toggleSelectAllChallans(checked) {
  const allChallans = StorageManager.getChallans();
  if (checked) {
    allChallans.forEach(c => challanTableState.selectedChallanIds.add(c.id));
  } else {
    challanTableState.selectedChallanIds.clear();
  }
  renderChallansTableAndPagination();
}

function deselectAllChallans() {
  challanTableState.selectedChallanIds.clear();
  renderChallansTableAndPagination();
}

function updateChallanBulkActionsBarVisibility() {
  const bar = document.getElementById("challanBulkActionsBar");
  const countText = document.getElementById("selectedChallansCountText");
  const sumText = document.getElementById("selectedChallansTotalSum");
  const count = challanTableState.selectedChallanIds.size;

  if (bar) {
    if (count > 0) {
      bar.style.display = "flex";
      if (countText) countText.textContent = `${count} Challan${count > 1 ? 's' : ''} Selected`;

      const allChallans = StorageManager.getChallans();
      const totalSum = allChallans
        .filter(c => challanTableState.selectedChallanIds.has(c.id))
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      if (sumText) sumText.textContent = `Total Dues: ${Utils.formatINR(totalSum)}`;
    } else {
      bar.style.display = "none";
    }
  }
}

function exportSelectedChallansCSV() {
  const allChallans = StorageManager.getChallans();
  const selected = allChallans.filter(c => challanTableState.selectedChallanIds.has(c.id));
  Utils.exportToCSV(selected, "selected-apex-challans.csv");
}

function openBulkAssignModal() {
  const count = challanTableState.selectedChallanIds.size;
  document.getElementById("bulkAssignSubtitle").textContent = `Batch allocate liability for ${count} selected infractions`;
  populateBulkPartyOptions("Driver");
  document.getElementById("bulkAssignAuditNotes").value = `Batch verified trip rosters for ${count} traffic camera notices.`;
  Utils.openModal("bulkAssignModal");
}

function populateBulkPartyOptions(partyType) {
  const select = document.getElementById("bulkEntitySelect");
  if (!select) return;

  if (partyType === "Driver") {
    const drivers = StorageManager.getDrivers();
    select.innerHTML = drivers.map(d => `<option value="${d.id}">${d.name} (${d.assignedVehicleReg})</option>`).join("");
  } else if (partyType === "Lessee") {
    const lessees = StorageManager.getLessees();
    select.innerHTML = lessees.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
  } else {
    select.innerHTML = `<option value="Apex Fleet Pvt Ltd">Apex Fleet Pvt Ltd (Self Absorbed)</option>`;
  }
}

function executeBulkAssignment() {
  const partyType = document.getElementById("bulkPartyTypeSelect").value;
  const select = document.getElementById("bulkEntitySelect");
  const entityName = select.options[select.selectedIndex]?.text || partyType;
  const entityId = select.value;
  const notes = document.getElementById("bulkAssignAuditNotes").value.trim() || "Batch assignment applied.";

  const count = challanTableState.selectedChallanIds.size;
  challanTableState.selectedChallanIds.forEach(id => {
    StorageManager.assignChallan(id, {
      partyType: partyType,
      partyName: entityName,
      partyId: entityId
    }, notes);
  });

  Utils.closeModal("bulkAssignModal");
  deselectAllChallans();
  Utils.showToast("Batch Assignment Completed", `Successfully attributed ${count} challans to ${partyType} (${entityName}).`, "success");
  renderChallansTableAndPagination();
}

function openBulkDisputeModal() {
  const count = challanTableState.selectedChallanIds.size;
  document.getElementById("bulkDisputeSubtitle").textContent = `Initiate contestation for ${count} selected violations`;
  document.getElementById("bulkDisputeNotes").value = `Telemetry logs confirm equipment calibration defect across batch.`;
  Utils.openModal("bulkDisputeModal");
}

function executeBulkDispute() {
  const reason = document.getElementById("bulkDisputeReasonSelect").value;
  const notes = document.getElementById("bulkDisputeNotes").value.trim();
  const count = challanTableState.selectedChallanIds.size;

  challanTableState.selectedChallanIds.forEach(id => {
    StorageManager.raiseDispute(id, {
      reason: `${reason}: ${notes}`
    });
  });

  Utils.closeModal("bulkDisputeModal");
  deselectAllChallans();
  Utils.showToast("Disputes Registered", `${count} challans marked as Disputed with authorities.`, "success");
  renderChallansTableAndPagination();
}

function executeBulkPaymentSimulation() {
  const count = challanTableState.selectedChallanIds.size;
  const allChallans = StorageManager.getChallans();
  const selected = allChallans.filter(c => challanTableState.selectedChallanIds.has(c.id));
  const totalAmount = selected.reduce((sum, c) => sum + (c.totalPayable || c.amount + 25), 0);

  if (confirm(`Authorize bulk settlement of ${Utils.formatINR(totalAmount)} for ${count} selected challans via Corporate Fleet Account?`)) {
    selected.forEach(c => {
      StorageManager.recordPayment(c.id, {
        method: "Corporate Net Banking (HDFC)",
        payerType: "Fleet Operator",
        recoveryParty: c.responsiblePartyName || c.responsibleParty || "Driver",
        recoveryMethod: "Payroll / Invoice Recovery"
      });
    });

    deselectAllChallans();
    Utils.showToast("Bulk Settlement Successful", `Settled ${Utils.formatINR(totalAmount)} across ${count} challans. Receipts generated.`, "success");
    renderChallansTableAndPagination();
  }
}

// --------------------------------------------------------------------------
// 9. STEP 6.5: CHALLAN DETAILS TWO-COLUMN FLAGSHIP VIEW
// --------------------------------------------------------------------------

function renderChallanDetailsView(container, actions, challanId) {
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Challan Record Not Found</div>
        <p class="text-xs text-muted">Notice reference ID "${challanId}" could not be located in database.</p>
        <button class="btn btn--primary btn--sm" onclick="navigateTo('challans')">Return to Challan Listing</button>
      </div>
    `;
    return;
  }

  // Update Breadcrumbs
  updateBreadcrumbs(["ChallanOS", "Challans", challan.challanNumber]);

  const vehicle = StorageManager.getVehicleById(challan.vehicleId) || { regNumber: challan.vehicleReg, makeModel: "Commercial Fleet Vehicle" };
  const drivers = StorageManager.getDrivers();
  const lessees = StorageManager.getLessees();

  // Calculate Automated Responsibility Suggestion
  const suggestion = Utils.calculateResponsibility(challan, vehicle, drivers, lessees);

  // Deadlines
  const daysDue = Utils.getDaysRemaining(c_dueDate = challan.dueDate);
  const isOverdue = daysDue < 0 && challan.status !== "paid";
  const daysDispute = Utils.getDaysRemaining(challan.disputeDeadline);

  // Actions Bar
  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="navigateTo('challans')">
      ← Back to Challan List
    </button>
    <button class="btn btn--outline btn--sm" onclick="openEditChallanModal('${challan.id}')">
      Edit Challan
    </button>
    ${challan.status !== 'disputed' && challan.status !== 'paid' ? `
      <button class="btn btn--outline btn--sm" style="color: var(--status-disputed); border-color: rgba(116,82,200,0.3);" onclick="openFileDisputeModal('${challan.id}')">
        Mark Disputed
      </button>
    ` : ''}
    <button class="btn btn--outline btn--sm" onclick="Utils.showToast('Download PDF', 'Generating official Parivahan notice PDF...', 'info')">
      Download Official Notice PDF
    </button>
    ${challan.paymentStatus === 'Pending Confirmation' ? `
      <button class="btn btn--outline btn--sm" style="color: #B7791F; border-color: #B7791F;" onclick="reconcileSpecificChallan('${challan.id}')">
        ⏳ Reconcile Pending Payment
      </button>
    ` : ''}
    ${challan.status === 'paid' ? `
      <button class="btn btn--secondary btn--sm" onclick="openReceiptModal('${challan.id}')">
        View Payment Receipt
      </button>
    ` : (challan.status !== 'court' ? `
      <button class="btn btn--primary btn--sm" onclick="openPaymentModal('${challan.id}')">
        Pay Fine Now (${Utils.formatINR(challan.totalPayable || (challan.amount + (challan.lateFee || 0) + (challan.convenienceFee || 25)))})
      </button>
    ` : `
      <button class="btn btn--outline btn--sm" style="border-color: #B42318; color: #B42318;" onclick="openCourtCaseModal('${challan.id}')" title="Direct payment locked. Click to view or record court compounding order.">
        🔒 Payment Locked: Court Stay Awaiting Order
      </button>
    `)}
  `;

  container.innerHTML = `
    <div class="challan-details-grid">
      
      <!-- ===================================================================
           LEFT COLUMN: Challan Information & Evidence (Step 6.5)
           =================================================================== -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        
        <!-- Evidence Photographic Card with Telemetry HUD -->
        <div class="evidence-card">
          <div class="evidence-photo-wrapper">
            <img src="${challan.evidenceImage || 'assets/images/speed-camera-radar.jpg'}" alt="Traffic Infraction Evidence" onerror="this.src='assets/images/speed-camera-radar.jpg'">
            
            <!-- HUD Camera Telemetry Overlay -->
            <div class="evidence-telemetry-hud">
              <span class="hud-tag">CAM: ANPR-DEL-DND-04</span>
              <span class="hud-tag" style="color: #4ADE80;">CCTV FRAME: VERIFIED</span>
            </div>

            <!-- Inset Zoomed License Plate Badge -->
            <div class="evidence-inset-plate">
              <span class="plate-ind-strip">IND</span>
              <span>${challan.vehicleReg}</span>
            </div>
          </div>

          <div style="padding: var(--space-3) var(--space-4); background-color: #0F172A; color: #94A3B8; font-size: 11px; display: flex; justify-content: space-between;">
            <span>GPS: 28.5672° N, 77.2100° E</span>
            <span>Speed Sensor: <strong>78.4 km/h</strong> (Radar Calibrated)</span>
          </div>
        </div>

        <!-- Infraction Summary Details: Signature Challan Ticket -->
        <div class="challan-ticket">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span class="badge badge--neutral font-mono" style="letter-spacing: 0.04em;">${challan.challanNumber}</span>
              <h2 style="font-family: var(--font-family-serif, serif); font-size: 26px; font-weight: 400; color: var(--ink); margin-top: 8px; line-height: 1.2;">
                ${challan.offence}
              </h2>
              <div class="text-xs" style="color: var(--accent); font-weight: 600; margin-top: 4px;">
                ${challan.mvActSection}
              </div>
            </div>
            <div>
              ${Utils.getStatusBadgeHTML(challan.status)}
            </div>
          </div>

          <!-- Perforation Line -->
          <div class="challan-ticket-perforation">
            <div class="challan-ticket-notch-left"></div>
            <div class="challan-ticket-dashed"></div>
            <div class="challan-ticket-notch-right"></div>
          </div>

          <!-- Key Metadata Specs Grid -->
          <div class="specs-meta-grid">
            <div class="spec-item">
              <span class="spec-label">Vehicle Registration</span>
              <span class="spec-value" style="display: flex; align-items: center; gap: 8px;">
                <a href="#vehicles?id=${challan.vehicleId}" class="plate-chip plate-chip--commercial">
                  ${challan.vehicleReg}
                </a> <span style="color: var(--text-2); font-size: 12px;">(${vehicle.makeModel || 'LCV'})</span>
              </span>
            </div>

            <div class="spec-item">
              <span class="spec-label">Vehicle Category & Fleet Owner</span>
              <span class="spec-value">
                <strong>${vehicle.category || 'Commercial Vehicle'}</strong> • ${vehicle.ownerName || 'Apex Fleet Pvt Ltd'}
              </span>
            </div>

            <div class="spec-item">
              <span class="spec-label">Issuing Authority</span>
              <span class="spec-value">${challan.issuingAuthority}</span>
            </div>

            <div class="spec-item">
              <span class="spec-label">Offence Timestamp</span>
              <span class="spec-value">${Utils.formatDate(challan.offenceDate, true)}</span>
            </div>

            <div class="spec-item">
              <span class="spec-label">Infraction Location</span>
              <span class="spec-value">${challan.location || 'Ring Road, New Delhi'}</span>
            </div>

            <div class="spec-item">
              <span class="spec-label">Data Source</span>
              <span class="spec-value">${challan.source}</span>
            </div>

            <div class="spec-item">
              <span class="spec-label">Current Responsible</span>
              <span class="spec-value">
                <strong>${challan.responsiblePartyName || challan.responsibleParty}</strong> (${challan.responsibleParty})
              </span>
            </div>
          </div>

          <!-- Fee & Payable Breakdown -->
          <div style="margin-top: var(--space-4); background-color: var(--surface-2); border: 1px solid var(--line); border-radius: 14px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span class="text-secondary" style="color: var(--text-2);">Statutory Penalty Amount:</span>
              <strong>${Utils.formatINR(challan.amount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 6px;">
              <span class="text-secondary" style="color: var(--text-2);">Accumulated Late Fee:</span>
              <strong style="color: ${(challan.lateFee || 0) > 0 ? 'var(--status-unassigned)' : 'inherit'};">
                ${Utils.formatINR(challan.lateFee || 0)}
              </strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 6px;">
              <span class="text-secondary" style="color: var(--text-2);">Gateway Convenience Surcharge:</span>
              <strong>${Utils.formatINR(challan.convenienceFee || 25)}</strong>
            </div>
            <div style="height: 1px; background-color: var(--line); margin: 10px 0;"></div>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 14px; font-weight: 600; color: var(--ink);">Total Payable Amount:</span>
              <span style="font-family: var(--font-family-serif, serif); color: var(--ink); font-size: 28px; font-weight: 400; letter-spacing: -0.01em;">
                ${Utils.formatINR(challan.totalPayable || challan.amount + (challan.lateFee || 0) + (challan.convenienceFee || 25))}
              </span>
            </div>
          </div>

          <!-- Statutory Due Date & Signature Deadline Ruler -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-4);">
            <div style="padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface);">
              <div class="text-xs text-muted">Statutory Due Date</div>
              <strong class="text-sm" style="color: var(--ink); font-size: 13px;">${Utils.formatDate(challan.dueDate)}</strong>
              <div class="deadline-ruler" style="margin-top: 6px;">
                <div class="deadline-ruler-track">
                  ${[0, 1, 2, 3, 4, 5, 6].map(i => {
                    const isPast = daysDue <= 0 ? true : (i < Math.max(0, 7 - daysDue));
                    const isDue = (7 - daysDue) === i;
                    let style = "background: var(--surface-3);";
                    if (isPast) style = "background: var(--signal); height: 10px;";
                    if (isDue) style = "background: var(--ink); height: 12px; width: 2px;";
                    return `<span class="deadline-ruler-tick" style="${style}" title="Day ${i+1}"></span>`;
                  }).join("")}
                </div>
              </div>
              <div class="text-xs" style="color: ${isOverdue ? 'var(--status-unassigned)' : 'var(--text-2)'}; font-weight: 600; margin-top: 2px;">
                ${isOverdue ? `Overdue by ${Math.abs(daysDue)} days!` : `${daysDue} days remaining`}
              </div>
            </div>

            <div style="padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface);">
              <div class="text-xs text-muted">Dispute Filing Window</div>
              <strong class="text-sm" style="color: var(--ink); font-size: 13px;">${Utils.formatDate(challan.disputeDeadline)}</strong>
              <div class="text-xs" style="color: ${daysDispute <= 3 ? 'var(--status-unassigned)' : 'var(--accent)'}; font-weight: 600; margin-top: 18px;">
                ${daysDispute < 0 ? 'Window Closed' : `${daysDispute} days left to contest`}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ===================================================================
           RIGHT COLUMN: Responsibility Decision Engine (Phase 7 Flagship Module)
           =================================================================== -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        
        <!-- Automated Recommendation Banner & Conflict Handling (ResponsibilityEngine) -->
        ${ResponsibilityEngine.renderSuggestionBannerHTML(suggestion)}

        <!-- Responsibility History Card -->
        <div class="card" style="padding: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 class="text-xs font-semibold text-muted" style="text-transform: uppercase;">Responsibility History</h4>
            <span class="badge badge--neutral" style="font-size: 10px;">Attribution Ledger</span>
          </div>
          <div style="font-size: 12px; display: flex; flex-direction: column; gap: 6px;">
            ${challan.previousResponsibleParty ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: var(--color-bg-app); border-radius: var(--radius-sm); border-left: 2px solid var(--color-text-muted);">
                <div>
                  <span class="text-muted">Prior Attribution:</span> 
                  <strong>${challan.previousResponsiblePartyName || challan.previousResponsibleParty}</strong>
                  <span class="badge badge--neutral" style="font-size: 10px; margin-left: 4px;">${challan.previousResponsibleParty}</span>
                </div>
                <span class="text-xs text-muted">Superseded</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: var(--color-bg-app); border-radius: var(--radius-sm); border-left: 2px solid var(--color-primary);">
              <div>
                <span class="text-muted">Current Attribution:</span> 
                <strong>${challan.responsiblePartyName || challan.responsibleParty}</strong>
                <span class="badge badge--assigned" style="font-size: 10px; margin-left: 4px;">${challan.responsibleParty}</span>
              </div>
              <span class="badge badge--paid" style="font-size: 10px;">Active</span>
            </div>
            ${challan.manualOverrideReason ? `
              <div class="text-xs text-secondary" style="margin-top: 4px; padding: 6px 8px; background: var(--color-bg-app); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">
                <strong>Latest Justification:</strong> ${challan.manualOverrideReason}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Responsibility Assignment & Manual Override Card (Step 7.2 & 7.3) -->
        <div class="card" style="padding: var(--space-6);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <div>
              <h3 class="text-sm font-semibold">
                ${challan.responsibleParty && challan.responsibleParty !== 'Unassigned' ? 'Reassign / Override Liability' : 'Assign Responsible Party'}
              </h3>
              <p class="text-xs text-muted">A challan is a decision to be made, not a record to be stored.</p>
            </div>
            ${challan.isManualOverride ? `
              <span class="badge badge--pending" title="Manual compliance override active">Manual Override</span>
            ` : ''}
          </div>

          <form id="detailsAssignmentForm" onsubmit="event.preventDefault(); submitDetailsAssignment('${challan.id}');">
            <div style="display: flex; flex-direction: column; gap: var(--space-4);">
              
              <!-- Option Selection Radios (Step 7.2) -->
              <div class="form-group">
                <label class="form-label">Select Responsible Party *</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                    <input type="radio" name="detailsPartyRadio" value="Driver" ${suggestion.partyType === 'Driver' || challan.responsibleParty === 'Driver' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Driver', ${challan.totalPayable || challan.amount || 2000})">
                    <strong>Driver</strong> <span class="text-xs text-muted">(Operating custody & moving violations)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                    <input type="radio" name="detailsPartyRadio" value="Lessee" ${suggestion.partyType === 'Lessee' || challan.responsibleParty === 'Lessee' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Lessee', ${challan.totalPayable || challan.amount || 2000})">
                    <strong>Corporate Lessee</strong> <span class="text-xs text-muted">(Master lease contract liability terms)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                    <input type="radio" name="detailsPartyRadio" value="Fleet Operator" ${suggestion.partyType === 'Fleet Operator' || challan.responsibleParty === 'Fleet Operator' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Fleet Operator', ${challan.totalPayable || challan.amount || 2000})">
                    <strong>Fleet Operator</strong> <span class="text-xs text-muted">(Apex Fleet internal absorption / paperwork lapses)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                    <input type="radio" name="detailsPartyRadio" value="Vehicle Owner" ${suggestion.partyType === 'Vehicle Owner' || challan.responsibleParty === 'Vehicle Owner' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Vehicle Owner', ${challan.totalPayable || challan.amount || 2000})">
                    <strong>Vehicle Owner</strong> <span class="text-xs text-muted">(Commercial lessor / financing asset covenant)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                    <input type="radio" name="detailsPartyRadio" value="Split" ${challan.responsibleParty === 'Split' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Split', ${challan.totalPayable || challan.amount || 2000})">
                    <strong>Split Liability</strong> <span class="text-xs text-muted">(Divide fine proportionally between multiple parties)</span>
                  </label>
                </div>
              </div>

              <!-- Specific Assignee Dropdown -->
              <div class="form-group" id="detailsEntityGroup">
                <label class="form-label" id="detailsEntityLabel">Assignee Name *</label>
                <select class="form-select" id="detailsEntitySelect"></select>
              </div>

              <!-- Split Liability Percentage Controls (Step 7.4) -->
              <div class="split-liability-box" id="detailsSplitBox" style="display: none; padding: 14px; background: var(--color-bg-app); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
                <div style="font-size: 12px; font-weight: 700; color: var(--color-text-main); margin-bottom: 8px;">
                  Proportional Split Allocation (Must equal exactly 100%)
                </div>
                <div class="split-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span class="text-xs font-medium">Party 1 (Driver / Primary Operator):</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" class="form-input split-input" id="splitDriverPct" value="60" min="0" max="100" style="width: 70px; text-align: right;" oninput="validateSplitTotal(${challan.totalPayable || challan.amount || 2000})">
                    <span class="text-xs font-semibold">%</span>
                  </div>
                </div>
                <div class="split-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span class="text-xs font-medium">Party 2 (Lessee / Fleet Operator):</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" class="form-input split-input" id="splitLesseePct" value="40" min="0" max="100" style="width: 70px; text-align: right;" oninput="validateSplitTotal(${challan.totalPayable || challan.amount || 2000})">
                    <span class="text-xs font-semibold">%</span>
                  </div>
                </div>
                <div style="font-size: 11px; font-weight: 600; margin-top: 6px;" id="splitValidationFeedback" style="color: var(--status-paid);">
                  ✓ Total: 100% (Driver Share: 60% = ₹${((challan.amount || 2000) * 0.6).toFixed(0)}, Lessee Share: 40% = ₹${((challan.amount || 2000) * 0.4).toFixed(0)})
                </div>
              </div>

              <!-- Mandatory Audit Notes / Reassignment Reason (Step 7.3) -->
              <div class="form-group">
                <label class="form-label">Mandatory Audit Justification / Reason *</label>
                <textarea class="form-textarea" id="detailsAuditNotes" rows="3" required placeholder="State exact operational justification, telematics roster match, or reason for manual override..."></textarea>
                <span class="text-xs text-muted">Immutable note recorded permanently in the audit trail.</span>
              </div>

              <!-- Automated Notification Dispatch -->
              <div style="padding: 10px 12px; background: var(--color-bg-app); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; user-select: none;">
                  <input type="checkbox" class="custom-checkbox" id="detailsNotifyToggle" checked>
                  <span>Simulate automated notification alert (WhatsApp & Email with payment link)</span>
                </label>
              </div>

              <button class="btn btn--primary" type="submit" style="width: 100%; padding: 10px 16px;">
                Confirm Assignment & Record Audit Entry →
              </button>
            </div>
          </form>
        </div>

        <!-- Immutable Activity Audit Trail -->
        <div class="card" style="padding: var(--space-6);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <h3 class="text-sm font-semibold">Challan Lifecycle & Audit Ledger</h3>
            <span class="badge badge--neutral">${(challan.activityLog || []).length} Events</span>
          </div>
          <p class="text-xs text-muted" style="margin-bottom: var(--space-3);">Chronological immutable trail of detections, liability attributions, and payments.</p>

          <div class="audit-timeline">
            ${(challan.activityLog || []).map(act => {
              let nodeMod = "";
              if (act.action.includes("Paid")) nodeMod = "action-paid";
              else if (act.action.includes("Dispute")) nodeMod = "action-dispute";

              return `
                <div class="audit-event-node ${nodeMod}">
                  <div class="audit-event-title">
                    <span>${act.action}</span>
                    <span class="badge badge--neutral" style="font-size: 10px;">${act.user}</span>
                  </div>
                  <div class="audit-event-desc">${act.notes}</div>
                  <div class="audit-event-meta">${Utils.formatDate(act.timestamp, true)}</div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

      </div>

    </div>
  `;

  // Initialize Entity Options based on selected radio
  const selectedRadio = container.querySelector('input[name="detailsPartyRadio"]:checked');
  const initialParty = selectedRadio ? selectedRadio.value : (suggestion.partyType || "Driver");
  handleDetailsPartyTypeChange(initialParty);
}

function handleDetailsPartyTypeChange(partyType, totalAmount = 2000) {
  const entityGroup = document.getElementById("detailsEntityGroup");
  const entitySelect = document.getElementById("detailsEntitySelect");
  const entityLabel = document.getElementById("detailsEntityLabel");
  const splitBox = document.getElementById("detailsSplitBox");

  if (!entitySelect) return;

  const drivers = StorageManager.getDrivers();
  const lessees = StorageManager.getLessees();

  if (partyType === "Driver") {
    entityGroup.style.display = "flex";
    if (splitBox) splitBox.style.display = "none";
    entityLabel.textContent = "Select Driver on Duty *";
    entitySelect.innerHTML = drivers.map(d => `<option value="${d.id}">${d.name} (${d.assignedVehicleReg})</option>`).join("");
  } else if (partyType === "Lessee") {
    entityGroup.style.display = "flex";
    if (splitBox) splitBox.style.display = "none";
    entityLabel.textContent = "Select Corporate Lessee *";
    entitySelect.innerHTML = lessees.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
  } else if (partyType === "Fleet Operator") {
    entityGroup.style.display = "flex";
    if (splitBox) splitBox.style.display = "none";
    entityLabel.textContent = "Fleet Operator Entity";
    entitySelect.innerHTML = `<option value="Apex Fleet Pvt Ltd">Apex Fleet Pvt Ltd (In-House Operating Expense)</option>`;
  } else if (partyType === "Vehicle Owner") {
    entityGroup.style.display = "flex";
    if (splitBox) splitBox.style.display = "none";
    entityLabel.textContent = "Vehicle Owner / Registered Lessor *";
    entitySelect.innerHTML = `
      <option value="Apex Fleet Pvt Ltd">Apex Fleet Pvt Ltd (Primary Asset Owner)</option>
      <option value="Tata Motors Fleet Finance Ltd">Tata Motors Fleet Finance Ltd (Commercial Lessor)</option>
      <option value="Sundaram Finance Ltd">Sundaram Finance Ltd (Institutional Lessor)</option>
    `;
  } else if (partyType === "Split") {
    entityGroup.style.display = "none";
    if (splitBox) splitBox.style.display = "block";
    validateSplitTotal(totalAmount);
  }
}

function validateSplitTotal(challanAmount = 2000) {
  const driverPct = parseFloat(document.getElementById("splitDriverPct")?.value) || 0;
  const lesseePct = parseFloat(document.getElementById("splitLesseePct")?.value) || 0;
  const feedback = document.getElementById("splitValidationFeedback");
  const submitBtn = document.querySelector('#detailsAssignmentForm button[type="submit"]');
  const total = driverPct + lesseePct;

  const driverAmt = Math.round((challanAmount * driverPct) / 100);
  const lesseeAmt = Math.round((challanAmount * lesseePct) / 100);

  if (feedback) {
    if (total === 100) {
      feedback.style.color = "var(--status-paid)";
      feedback.innerHTML = `✓ Total: 100% (Party 1 Share: ${driverPct}% = ${Utils.formatINR(driverAmt)}, Party 2 Share: ${lesseePct}% = ${Utils.formatINR(lesseeAmt)})`;
      if (submitBtn) submitBtn.disabled = false;
    } else {
      feedback.style.color = "var(--status-unassigned)";
      feedback.innerHTML = `⚠ Total equals ${total}%. Split allocation must equal exactly 100% (Discrepancy: ${100 - total}%).`;
      if (submitBtn) submitBtn.disabled = true;
    }
  }
}

function submitDetailsAssignment(challanId) {
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const selectedRadio = document.querySelector('input[name="detailsPartyRadio"]:checked');
  const partyType = selectedRadio ? selectedRadio.value : "Driver";
  const entitySelect = document.getElementById("detailsEntitySelect");
  const notes = document.getElementById("detailsAuditNotes").value.trim();
  const notify = document.getElementById("detailsNotifyToggle").checked;

  let splitDetails = null;
  if (partyType === "Split") {
    const driverPct = parseFloat(document.getElementById("splitDriverPct").value) || 0;
    const lesseePct = parseFloat(document.getElementById("splitLesseePct").value) || 0;
    if (driverPct + lesseePct !== 100) {
      alert("Split percentages must equal exactly 100%.");
      return;
    }
    const amt = challan.totalPayable || challan.amount || 2000;
    splitDetails = {
      shares: [
        { partyType: "Driver", partyName: challan.driverName || "Rahul Sharma", percentage: driverPct, amount: Math.round((amt * driverPct) / 100) },
        { partyType: "Lessee", partyName: challan.lesseeName || "Corporate Lessee", percentage: lesseePct, amount: Math.round((amt * lesseePct) / 100) }
      ]
    };
  }

  if (!notes) {
    alert("Please provide a mandatory audit justification for this assignment.");
    document.getElementById("detailsAuditNotes").focus();
    return;
  }

  let entityName = partyType;
  let entityId = null;

  if (partyType !== "Split") {
    entityName = entitySelect.options[entitySelect.selectedIndex]?.text || partyType;
    entityId = entitySelect.value;
  } else {
    const dPct = document.getElementById("splitDriverPct").value;
    const lPct = document.getElementById("splitLesseePct").value;
    entityName = `Split (${dPct}% Driver / ${lPct}% Lessee)`;
  }

  const vehicle = StorageManager.getVehicleById(challan.vehicleId);
  const suggestion = Utils.calculateResponsibility(challan, vehicle, StorageManager.getDrivers(), StorageManager.getLessees());
  const isOverride = (partyType !== suggestion.partyType) || (challan.responsibleParty && challan.responsibleParty !== "Unassigned");

  StorageManager.assignChallan(challanId, {
    partyType: partyType,
    partyName: entityName,
    partyId: entityId,
    isOverride: isOverride,
    splitDetails: splitDetails
  }, notes);

  if (notify) {
    Utils.showToast("Notification Dispatched", `Sent WhatsApp & Email alert to ${entityName} with compliance resolution link.`, "info");
  }

  Utils.showToast("Responsibility Saved", `Attributed to ${partyType} (${entityName}). Activity log updated.`, "success");

  // Re-render
  renderChallanDetailsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"), challanId);
}

// --------------------------------------------------------------------------
// 10. MODALS SYSTEM: ASSIGNMENT & PAYMENT CONTROLLERS
// --------------------------------------------------------------------------

let currentModalChallanId = null;

function initModalListeners() {
  const partyTypeSelect = document.getElementById("assignPartyTypeSelect");
  const entitySelect = document.getElementById("assignEntitySelect");
  const confirmAssignBtn = document.getElementById("confirmAssignBtn");
  const confirmPayBtn = document.getElementById("confirmPayBtn");

  // Dynamically update entity options when Party Type changes
  if (partyTypeSelect && entitySelect) {
    partyTypeSelect.addEventListener("change", () => {
      populateEntityOptions(partyTypeSelect.value);
    });
  }

  // Handle Assignment Confirmation (Step 7.3 & Step 7.4)
  if (confirmAssignBtn) {
    confirmAssignBtn.addEventListener("click", () => {
      if (!currentModalChallanId) return;

      const partyType = partyTypeSelect.value;
      const entityId = entitySelect.value;
      let entityName = entitySelect.options[entitySelect.selectedIndex]?.text || partyType;
      const notes = document.getElementById("assignAuditNotes").value.trim();

      let splitDetails = null;
      if (partyType === "Split") {
        const dPct = parseFloat(document.getElementById("assignModalSplitDriverPct").value) || 0;
        const lPct = parseFloat(document.getElementById("assignModalSplitLesseePct").value) || 0;
        if (dPct + lPct !== 100) {
          alert("Split percentages must equal exactly 100%.");
          return;
        }
        const ch = StorageManager.getChallanById(currentModalChallanId);
        const amt = ch.totalPayable || ch.amount || 2000;
        splitDetails = {
          shares: [
            { partyType: "Driver", partyName: "Rahul Sharma", percentage: dPct, amount: Math.round((amt * dPct) / 100) },
            { partyType: "Lessee", partyName: "Corporate Lessee", percentage: lPct, amount: Math.round((amt * lPct) / 100) }
          ]
        };
        entityName = `Split (${dPct}% Driver / ${lPct}% Lessee)`;
      }

      if (!notes) {
        alert("Please provide a mandatory audit reason for this assignment.");
        document.getElementById("assignAuditNotes").focus();
        return;
      }

      const challan = StorageManager.getChallanById(currentModalChallanId);
      const vehicle = StorageManager.getVehicleById(challan.vehicleId);
      const suggestion = Utils.calculateResponsibility(challan, vehicle, StorageManager.getDrivers(), StorageManager.getLessees());
      const isOverride = (partyType !== suggestion.partyType) || (challan.responsibleParty && challan.responsibleParty !== "Unassigned");

      StorageManager.assignChallan(currentModalChallanId, {
        partyType: partyType,
        partyName: entityName,
        partyId: entityId,
        isOverride: isOverride,
        splitDetails: splitDetails
      }, notes);

      Utils.closeModal("assignmentModal");
      Utils.showToast("Responsibility Assigned", `Challan allocated to ${partyType} (${entityName}). Audit trail recorded.`, "success");

      // Re-render active view
      navigateTo(currentRoute, false, currentParams);
    });
  }

  // Handle Payment Confirmation
  if (confirmPayBtn) {
    confirmPayBtn.addEventListener("click", () => {
      if (!currentModalChallanId) return;

      const challan = StorageManager.getChallanById(currentModalChallanId);
      const payer = document.getElementById("payPayerSelect") ? document.getElementById("payPayerSelect").value : "Fleet Company";
      const recoveryEl = document.getElementById("payRecoveryChannelSelect");
      const recovery = recoveryEl ? recoveryEl.value : "payroll";
      const activeMethodBtn = document.querySelector(".pay-method-btn.active");
      const method = activeMethodBtn ? activeMethodBtn.dataset.method : "UPI";

      StorageManager.recordPayment(currentModalChallanId, {
        method: method,
        payerType: payer,
        recoveryParty: challan.responsiblePartyName || challan.responsibleParty || "Driver",
        recoveryMethod: recovery
      });

      Utils.closeModal("paymentModal");
      Utils.showToast("Payment Successful", `Settled ${Utils.formatINR(challan.totalPayable)} via ${method}. Receipt generated.`, "success");

      // Re-render active view
      navigateTo(currentRoute, false, currentParams);
    });
  }

  // Payment method toggle buttons
  document.querySelectorAll(".pay-method-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pay-method-btn").forEach(b => {
        b.classList.remove("active");
        b.style.borderColor = "var(--color-border)";
        b.style.background = "var(--color-bg-surface)";
        b.style.color = "var(--color-text-main)";
      });
      btn.classList.add("active");
      btn.style.borderColor = "var(--color-primary)";
      btn.style.background = "var(--color-primary-light)";
      btn.style.color = "var(--color-primary)";
    });
  });
}

function populateEntityOptions(partyType) {
  const entitySelect = document.getElementById("assignEntitySelect");
  const entityGroup = document.getElementById("assignEntityGroup");
  const entityLabel = document.getElementById("assignEntityLabel");
  const splitBox = document.getElementById("assignModalSplitBox");

  if (!entitySelect) return;

  const drivers = StorageManager.getDrivers();
  const lessees = StorageManager.getLessees();

  if (splitBox) splitBox.style.display = partyType === "Split" ? "block" : "none";

  if (partyType === "Driver") {
    entityGroup.style.display = "flex";
    entityLabel.textContent = "Select Driver *";
    entitySelect.innerHTML = drivers.map(d => `<option value="${d.id}">${d.name} (${d.assignedVehicleReg})</option>`).join("");
  } else if (partyType === "Lessee") {
    entityGroup.style.display = "flex";
    entityLabel.textContent = "Select Corporate Lessee *";
    entitySelect.innerHTML = lessees.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
  } else if (partyType === "Fleet Operator") {
    entityGroup.style.display = "flex";
    entityLabel.textContent = "Fleet Entity";
    entitySelect.innerHTML = `<option value="apex-fleet">Apex Fleet Pvt Ltd (Self-Absorbed Operating Expense)</option>`;
  } else if (partyType === "Vehicle Owner") {
    entityGroup.style.display = "flex";
    entityLabel.textContent = "Vehicle Owner / Registered Lessor *";
    entitySelect.innerHTML = `
      <option value="Apex Fleet Pvt Ltd">Apex Fleet Pvt Ltd (Primary Asset Owner)</option>
      <option value="Tata Motors Fleet Finance Ltd">Tata Motors Fleet Finance Ltd (Commercial Lessor)</option>
      <option value="Sundaram Finance Ltd">Sundaram Finance Ltd (Institutional Lessor)</option>
    `;
  } else if (partyType === "Split") {
    entityGroup.style.display = "none";
    validateModalSplitTotal();
  } else {
    entityGroup.style.display = "none";
  }
}

function validateModalSplitTotal() {
  const dPct = parseFloat(document.getElementById("assignModalSplitDriverPct")?.value) || 0;
  const lPct = parseFloat(document.getElementById("assignModalSplitLesseePct")?.value) || 0;
  const feedback = document.getElementById("assignModalSplitFeedback");
  const confirmBtn = document.getElementById("confirmAssignBtn");
  const total = dPct + lPct;

  if (feedback) {
    if (total === 100) {
      feedback.style.color = "var(--status-paid)";
      feedback.textContent = `✓ Total: 100% (Driver Share: ${dPct}%, Lessee Share: ${lPct}%)`;
      if (confirmBtn) confirmBtn.disabled = false;
    } else {
      feedback.style.color = "var(--status-unassigned)";
      feedback.textContent = `⚠ Total is ${total}%. Split allocation must equal exactly 100%.`;
      if (confirmBtn) confirmBtn.disabled = true;
    }
  }
}

function openAssignmentModal(challanId) {
  if (StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canAssign", "Liability Assignment")) {
    return;
  }

  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  currentModalChallanId = challanId;

  document.getElementById("assignChallanNo").textContent = challan.challanNumber;
  document.getElementById("assignChallanOffence").textContent = `${challan.offence} — ${challan.mvActSection}`;
  document.getElementById("assignChallanVehicle").textContent = challan.vehicleReg;
  document.getElementById("assignChallanAmount").textContent = Utils.formatINR(challan.amount);

  // Suggested Rule Attribution (Phase 7 Priority Engine)
  const vehicle = StorageManager.getVehicleById(challan.vehicleId);
  const suggestion = Utils.calculateResponsibility(challan, vehicle, StorageManager.getDrivers(), StorageManager.getLessees());

  const conflictBox = document.getElementById("assignConflictAlert");
  if (conflictBox) {
    if (suggestion.hasConflict) {
      conflictBox.style.display = "block";
      document.getElementById("assignConflictTitle").textContent = suggestion.conflictType || "Custody Conflict Detected";
      document.getElementById("assignConflictDesc").textContent = suggestion.conflictMessage || suggestion.reason;
    } else {
      conflictBox.style.display = "none";
    }
  }

  const confidenceBadge = document.getElementById("assignRuleConfidence");
  if (confidenceBadge) {
    confidenceBadge.textContent = `${suggestion.confidenceLevel || 'High'} Confidence (${suggestion.confidence}%)`;
    confidenceBadge.className = `badge ${suggestion.confidence >= 80 ? 'badge--assigned' : suggestion.confidence >= 50 ? 'badge--pending' : 'badge--unassigned'}`;
  }

  document.getElementById("assignRuleParty").textContent = `Suggested: ${suggestion.partyType} (${suggestion.partyName || 'Apex Fleet'})`;
  document.getElementById("assignRuleReason").textContent = suggestion.reason;

  // Preset party dropdown to suggestion
  const partySelect = document.getElementById("assignPartyTypeSelect");
  if (partySelect) {
    partySelect.value = suggestion.partyType === "Unassigned" ? "Driver" : suggestion.partyType;
    populateEntityOptions(partySelect.value);
  }

  document.getElementById("assignAuditNotes").value = `Verified trip roster. Attributed to ${partySelect.value} based on operational duty manifest.`;

  Utils.openModal("assignmentModal");
}

function openPaymentModal(challanId) {
  if (typeof window.openPaymentModal === 'function' && window.openPaymentModal !== openPaymentModal) {
    return window.openPaymentModal(challanId);
  }

  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  currentModalChallanId = challanId;

  const baseAmt = challan.amount || 1000;
  const lateFee = challan.lateFee || 0;
  const convFee = challan.convenienceFee !== undefined ? challan.convenienceFee : 25;
  const total = challan.totalPayable || (baseAmt + lateFee + convFee);

  const baseEl = document.getElementById("payBaseAmount");
  if (baseEl) baseEl.textContent = Utils.formatINR(baseAmt);
  const convEl = document.getElementById("payConvFee");
  if (convEl) convEl.textContent = Utils.formatINR(convFee);
  const lateEl = document.getElementById("payLateFee");
  if (lateEl) lateEl.textContent = Utils.formatINR(lateFee);
  const totEl = document.getElementById("payTotalAmount");
  if (totEl) totEl.textContent = Utils.formatINR(total);

  Utils.openModal("paymentModal");
}

// --------------------------------------------------------------------------
// 11. EDIT CHALLAN CONTROLLER
// --------------------------------------------------------------------------

function openEditChallanModal(challanId) {
  if (StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canAssign", "Editing Challan Metadata")) {
    return;
  }

  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const vehicle = StorageManager.getVehicleById(challan.vehicleId) || { regNumber: challan.vehicleReg };

  const idInput = document.getElementById("editChallanId");
  if (idInput) idInput.value = challan.id;

  const numDisp = document.getElementById("editChallanNumberDisplay");
  if (numDisp) numDisp.textContent = challan.challanNumber;

  const offDisp = document.getElementById("editChallanOffenceDisplay");
  if (offDisp) offDisp.textContent = `${challan.offence} (${challan.mvActSection})`;

  const vehDisp = document.getElementById("editChallanVehicleDisplay");
  if (vehDisp) vehDisp.textContent = `${challan.vehicleReg} (${vehicle.makeModel || 'Commercial Vehicle'})`;

  const amtDisp = document.getElementById("editChallanOriginalAmount");
  if (amtDisp) amtDisp.textContent = Utils.formatINR(challan.amount);

  const locInput = document.getElementById("editChallanLocation");
  if (locInput) locInput.value = challan.location || "";

  const dueInput = document.getElementById("editChallanDueDate");
  if (dueInput) dueInput.value = challan.dueDate ? challan.dueDate.split("T")[0] : "";

  const dispInput = document.getElementById("editChallanDisputeDeadline");
  if (dispInput) dispInput.value = challan.disputeDeadline ? challan.disputeDeadline.split("T")[0] : "";

  const lateInput = document.getElementById("editChallanLateFee");
  if (lateInput) lateInput.value = challan.lateFee !== undefined ? challan.lateFee : 0;

  const convInput = document.getElementById("editChallanConvenienceFee");
  if (convInput) convInput.value = challan.convenienceFee !== undefined ? challan.convenienceFee : 25;

  const notesInput = document.getElementById("editChallanNotes");
  if (notesInput) notesInput.value = "";

  Utils.openModal("editChallanModal");
}

function submitEditChallanForm() {
  const challanId = document.getElementById("editChallanId").value;
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const newLocation = document.getElementById("editChallanLocation").value.trim();
  const newDueDate = document.getElementById("editChallanDueDate").value;
  const newDisputeDeadline = document.getElementById("editChallanDisputeDeadline").value;
  const newLateFee = parseFloat(document.getElementById("editChallanLateFee").value) || 0;
  const newConvenienceFee = parseFloat(document.getElementById("editChallanConvenienceFee").value) || 0;
  const notes = document.getElementById("editChallanNotes").value.trim();

  const updates = {
    location: newLocation,
    dueDate: newDueDate,
    disputeDeadline: newDisputeDeadline,
    lateFee: newLateFee,
    convenienceFee: newConvenienceFee,
    totalPayable: (challan.amount || 0) + newLateFee + newConvenienceFee
  };

  if (!challan.activityLog) challan.activityLog = [];
  challan.activityLog.push({
    timestamp: new Date().toISOString(),
    user: "Vikram Malhotra (Fleet Compliance Head)",
    action: "Challan Details Updated",
    notes: notes || `Updated location to "${newLocation}", due date to ${newDueDate}, late fee to ₹${newLateFee}.`
  });

  StorageManager.updateChallan(challanId, updates);
  Utils.closeModal("editChallanModal");
  Utils.showToast("Challan Updated", `Notice ${challan.challanNumber} records successfully saved.`, "success");

  // Re-render
  const hash = window.location.hash || "";
  if (hash.includes("?id=")) {
    renderChallanDetailsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"), challanId);
  } else {
    renderChallansTableAndPagination();
  }
}

// --------------------------------------------------------------------------
// 12. GLOBAL WINDOW EXPORTS FOR HTML EVENT HANDLERS
// --------------------------------------------------------------------------
window.openAssignmentModal = openAssignmentModal;
window.openPaymentModal = openPaymentModal;
window.openEditChallanModal = openEditChallanModal;
window.submitEditChallanForm = submitEditChallanForm;
window.sortChallansBy = sortChallansBy;
window.changeChallanPage = changeChallanPage;
window.toggleChallanRowSelection = toggleChallanRowSelection;
window.toggleSelectAllChallans = toggleSelectAllChallans;
window.deselectAllChallans = deselectAllChallans;
window.exportSelectedChallansCSV = exportSelectedChallansCSV;
window.openBulkAssignModal = openBulkAssignModal;
window.populateBulkPartyOptions = populateBulkPartyOptions;
window.executeBulkAssignment = executeBulkAssignment;
window.openBulkDisputeModal = openBulkDisputeModal;
window.executeBulkDispute = executeBulkDispute;
window.executeBulkPaymentSimulation = executeBulkPaymentSimulation;
window.applyChallanSavedView = applyChallanSavedView;
window.resetChallanFilters = resetChallanFilters;
window.handleDetailsPartyTypeChange = handleDetailsPartyTypeChange;
window.validateSplitTotal = validateSplitTotal;
window.submitDetailsAssignment = submitDetailsAssignment;
window.validateModalSplitTotal = validateModalSplitTotal;
window.populateEntityOptions = populateEntityOptions;

