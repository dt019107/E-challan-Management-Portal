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
  filterVehicleType: "",
  savedView: "all",
  viewMode: "table"
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
    challanTableState.savedView = "all";
  }
  if (params.filter === "due7days") {
    challanTableState.savedView = "due7days";
    challanTableState.activeStatusTab = "all";
  } else if (params.filter === "overdue") {
    challanTableState.savedView = "overdue";
    challanTableState.activeStatusTab = "all";
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
  const unassignedCount = allChallans.filter(c => c.status === "unassigned").length;
  const assignedCount = allChallans.filter(c => c.status === "assigned").length;
  const pendingCount = allChallans.filter(c => c.status === "pending").length;
  const disputedCount = allChallans.filter(c => c.status === "disputed").length;
  const courtCount = allChallans.filter(c => c.status === "court").length;
  const paidCount = allChallans.filter(c => c.status === "paid").length;

  const due7Count = allChallans.filter(c => {
    const d = Utils.getDaysRemaining(c.dueDate);
    return d >= 0 && d <= 7 && c.status !== "paid";
  }).length;
  const overdueCount = allChallans.filter(c => Utils.getDaysRemaining(c.dueDate) < 0 && c.status !== "paid").length;
  const highValCount = allChallans.filter(c => (c.amount || 0) > 2000).length;

  // Unified Operational Tabs (Hick's Law: Consolidated single-decision view bar)
  const tabs = [
    { key: "all", label: "All Notices", count: allChallans.length, type: "status" },
    { key: "unassigned", label: "Needs Attribution", count: unassignedCount, type: "status", alert: unassignedCount > 0 },
    { key: "due7days", label: "Due in 7 Days", count: due7Count, type: "savedView" },
    { key: "overdue", label: "Overdue", count: overdueCount, type: "savedView", alert: overdueCount > 0 },
    { key: "court", label: "In Court", count: courtCount, type: "status" },
    { key: "paid", label: "Settled", count: paidCount, type: "status" }
  ];

  container.innerHTML = `
    <!-- Unified View Tabs -->
    <div class="nav-tabs" id="challanStatusTabs">
      ${tabs.map(t => {
        const isActive = (t.type === "status" && challanTableState.activeStatusTab === t.key && challanTableState.savedView === "all") ||
                         (t.type === "savedView" && challanTableState.savedView === t.key);
        return `
          <button class="nav-tab ${isActive ? 'active' : ''}" data-type="${t.type}" data-key="${t.key}">
            ${t.label} <span class="nav-tab-badge" style="${t.alert ? 'background: rgba(194, 65, 65, 0.14); color: var(--status-unassigned); font-weight: 700;' : ''}">${t.count}</span>
          </button>
        `;
      }).join("")}
    </div>

    <!-- Unified Command & Filter Toolbar -->
    <div class="filter-toolbar" style="margin-top: var(--space-3); margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap;">
      <div class="filter-group" style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
        <div style="position: relative; width: 320px;">
          <svg class="search-icon-prefix" viewBox="0 0 20 20" fill="currentColor" style="left: 10px;">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" class="form-input" id="challanSearchInput" style="padding-left: 36px;"
            placeholder="Search" value="${challanTableState.searchQuery}">
        </div>

        <!-- Vehicle Class Filter -->
        <select class="form-select" id="filterVehicleTypeSelect" style="width: 155px; font-size: 12px; padding: 6px 10px;">
          <option value="">All Vehicle Classes</option>
          <option value="truck" ${challanTableState.filterVehicleType === 'truck' ? 'selected' : ''}>Heavy Trucks</option>
          <option value="bus" ${challanTableState.filterVehicleType === 'bus' ? 'selected' : ''}>Buses &amp; Coaches</option>
          <option value="bike" ${challanTableState.filterVehicleType === 'bike' ? 'selected' : ''}>2-Wheelers</option>
          <option value="car" ${challanTableState.filterVehicleType === 'car' ? 'selected' : ''}>Cabs &amp; Sedans</option>
          <option value="pickup" ${challanTableState.filterVehicleType === 'pickup' ? 'selected' : ''}>Pickups</option>
          <option value="van" ${challanTableState.filterVehicleType === 'van' ? 'selected' : ''}>Vans &amp; LCVs</option>
        </select>

        <!-- Offence Filter -->
        <select class="form-select" id="filterOffenceSelect" style="width: 155px; font-size: 12px; padding: 6px 10px;">
          <option value="">All Violations</option>
          <option value="Speed" ${challanTableState.filterOffence === 'Speed' ? 'selected' : ''}>Overspeeding (Sec 183)</option>
          <option value="Signal" ${challanTableState.filterOffence === 'Signal' ? 'selected' : ''}>Red Light (Sec 184)</option>
          <option value="Seat Belt" ${challanTableState.filterOffence === 'Seat Belt' ? 'selected' : ''}>Seatbelt (Sec 194B)</option>
          <option value="PUC" ${challanTableState.filterOffence === 'PUC' ? 'selected' : ''}>PUC Lapsed (Sec 190(2))</option>
          <option value="Overloading" ${challanTableState.filterOffence === 'Overloading' ? 'selected' : ''}>Overloading (Sec 194)</option>
          <option value="Parking" ${challanTableState.filterOffence === 'Parking' ? 'selected' : ''}>Improper Parking</option>
          <option value="Mobile" ${challanTableState.filterOffence === 'Mobile' ? 'selected' : ''}>Mobile Phone</option>
        </select>

        <!-- Party Filter -->
        <select class="form-select" id="filterPartySelect" style="width: 140px; font-size: 12px; padding: 6px 10px;">
          <option value="">All Attributions</option>
          <option value="Driver" ${challanTableState.filterParty === 'Driver' ? 'selected' : ''}>Driver</option>
          <option value="Lessee" ${challanTableState.filterParty === 'Lessee' ? 'selected' : ''}>Corporate Lessee</option>
          <option value="Fleet Operator" ${challanTableState.filterParty === 'Fleet Operator' ? 'selected' : ''}>Fleet Operator</option>
          <option value="Vehicle Owner" ${challanTableState.filterParty === 'Vehicle Owner' ? 'selected' : ''}>Asset Owner</option>
          <option value="Unassigned" ${challanTableState.filterParty === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
        </select>

        ${hasActiveChallanFilters() ? `
          <button class="btn btn--ghost btn--sm" style="font-size: 11px; padding: 2px 8px;" onclick="resetChallanFilters()">Reset</button>
        ` : ''}
      </div>

      <div class="filter-group" style="display: flex; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <label class="text-xs text-muted">Rows:</label>
          <select class="form-select" id="challanPageSizeSelect" style="width: 70px; padding: 4px 8px; font-size: 12px;">
            <option value="10" ${challanTableState.pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="15" ${challanTableState.pageSize === 15 ? 'selected' : ''}>15</option>
            <option value="30" ${challanTableState.pageSize === 30 ? 'selected' : ''}>30</option>
          </select>
        </div>

        <!-- Dual View Mode Switcher (Screen 5 & 6) -->
        <div class="view-mode-switcher" style="display: inline-flex; border: 1px solid var(--surface-1); border-radius: 8px; overflow: hidden; background: var(--surface-2);">
          <button id="challanViewTableBtn" class="btn btn--sm ${challanTableState.viewMode === 'table' ? 'active' : ''}" style="border: none; border-radius: 0; height: 32px; padding: 0 10px; font-size: 12px; background: ${challanTableState.viewMode === 'table' ? '#FFFFFF' : 'transparent'}; box-shadow: ${challanTableState.viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; color: ${challanTableState.viewMode === 'table' ? 'var(--color-primary)' : 'var(--text-3)'};" onclick="toggleChallanViewMode('table')" title="Ledger Table View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>
          <button id="challanViewGridBtn" class="btn btn--sm ${challanTableState.viewMode === 'grid' ? 'active' : ''}" style="border: none; border-radius: 0; height: 32px; padding: 0 10px; font-size: 12px; background: ${challanTableState.viewMode === 'grid' ? '#FFFFFF' : 'transparent'}; box-shadow: ${challanTableState.viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; color: ${challanTableState.viewMode === 'grid' ? 'var(--color-primary)' : 'var(--text-3)'};" onclick="toggleChallanViewMode('grid')" title="Visual Cards View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Challans Table Card -->
    <div class="card" id="challansTableCardContainer">
      <div class="card-body" style="padding: 0;" id="challansTableBodyContainer"></div>
      <div class="table-pagination" id="challansPaginationContainer"></div>
    </div>

    <!-- Floating Bulk Actions Dock (Jakob's Law) -->
    <div class="bulk-actions-bar" id="challanBulkActionsBar" style="display: none;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #34C759;"></span>
        <span style="font-weight: 600; font-size: 13px; color: #FFFFFF;" id="selectedChallansCountText">0 Challans Selected</span>
        <span class="badge" style="background: rgba(255,255,255,0.18); color: #fff; font-size: 11px; padding: 1.5px 8px; border-radius: 9999px;" id="selectedChallansTotalSum">Total: ₹0</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <button class="btn btn--primary btn--sm" style="height: 32px; padding: 0 14px;" onclick="executeBulkPaymentSimulation()">
          Bulk Settle Notices
        </button>
        <button class="btn btn--outline btn--sm" style="background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); color: #fff; height: 32px;" onclick="openBulkAssignModal()">
          Assign Liability
        </button>
        <button class="btn btn--outline btn--sm" style="background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); color: #fff; height: 32px;" onclick="exportSelectedChallansCSV()">
          Export CSV
        </button>
        <button class="btn btn--ghost btn--sm" style="color: rgba(255,255,255,0.7); height: 32px;" onclick="deselectAllChallans()">
          ${Utils.icon('x', 13)} Cancel
        </button>
      </div>
    </div>
  `;

  // Attach Unified Operational View Tabs (Hick's Law)
  container.querySelectorAll("#challanStatusTabs .nav-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      const type = tabBtn.dataset.type;
      const key = tabBtn.dataset.key;
      if (type === "status") {
        challanTableState.activeStatusTab = key;
        challanTableState.savedView = "all";
      } else if (type === "savedView") {
        challanTableState.savedView = key;
        challanTableState.activeStatusTab = "all";
      }
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

  const vehicleTypeSel = container.querySelector("#filterVehicleTypeSelect") || document.getElementById("filterVehicleTypeSelect");
  if (vehicleTypeSel) {
    vehicleTypeSel.addEventListener("change", (e) => {
      challanTableState.filterVehicleType = e.target.value;
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
    challanTableState.filterVehicleType !== "" ||
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
  challanTableState.filterVehicleType = "";
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

function applyChallanPresetView(presetKey) {
  if (presetKey === 'unassigned') {
    challanTableState.activeStatusTab = 'unassigned';
    challanTableState.savedView = 'all';
  } else if (presetKey === 'all') {
    challanTableState.activeStatusTab = 'all';
    challanTableState.savedView = 'all';
  } else {
    challanTableState.savedView = presetKey;
  }
  challanTableState.currentPage = 1;
  const container = document.getElementById("moduleViewBody");
  const actions = document.getElementById("viewHeaderActions");
  renderChallansView(container, actions);
}
window.applyChallanPresetView = applyChallanPresetView;

function handleChallanRowClick(event, challanId) {
  if (event.target.closest('input[type="checkbox"]') || event.target.closest('button') || event.target.closest('a')) {
    return;
  }
  navigateTo('challans', true, { id: challanId });
}
window.handleChallanRowClick = handleChallanRowClick;

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

  // Filter by Vehicle Type
  if (challanTableState.filterVehicleType) {
    filtered = filtered.filter(c => {
      const veh = StorageManager.getVehicleById(c.vehicleId);
      const vMeta = Utils.getVehicleTypeMeta(veh);
      return vMeta.type === challanTableState.filterVehicleType;
    });
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
  } else if (challanTableState.viewMode === "grid") {
    tableContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; padding: 20px; background: var(--canvas);">
        ${paginatedRows.map(c => {
          const daysLeft = Utils.getDaysRemaining(c.dueDate);
          const isOverdue = daysLeft < 0 && c.status !== "paid";
          const veh = StorageManager.getVehicleById(c.vehicleId);

          return `
            <div class="card" style="padding: 18px; border-radius: 16px; border: 1px solid var(--surface-1); box-shadow: var(--shadow-soft); cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;" onclick="handleChallanRowClick(event, '${c.id}')">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                  <a href="#challans?id=${c.id}" class="font-mono font-bold" style="font-size: 13.5px; color: var(--color-primary); text-decoration: none;">
                    ${c.challanNumber}
                  </a>
                  <div style="font-size: 11.5px; color: var(--text-3); margin-top: 2px;">
                    ${Utils.formatDate(c.offenceDate || c.dueDate)}
                  </div>
                </div>
                ${Utils.getStatusBadgeHTML(c.status)}
              </div>

              <div style="font-size: 13.5px; font-weight: 600; color: var(--ink); margin-bottom: 12px; line-height: 1.35; height: 38px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${c.offence}">
                ${c.offence}
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--surface-2); border-radius: 10px; margin-bottom: 14px; font-size: 12px;">
                <div>
                  <a href="#vehicles?id=${c.vehicleId}" class="plate-chip font-mono font-bold" style="font-size: 11.5px;">${c.vehicleReg}</a>
                  <div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">${veh ? veh.makeModel.split('(')[0].trim() : 'Commercial Fleet'}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600; color: var(--ink);">${c.responsiblePartyName || c.responsibleParty}</div>
                  <div style="font-size: 11px; color: var(--text-3);">${c.responsibleParty === 'Unassigned' ? '<span style="color: var(--status-unassigned); font-weight: 700;">Needs Attribution</span>' : c.responsibleParty}</div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--surface-1); padding-top: 12px; margin-top: auto;">
                <div>
                  <div style="font-size: 17px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums;">${Utils.formatINR(c.amount)}</div>
                  <div style="font-size: 11px; color: ${isOverdue ? 'var(--status-unassigned)' : 'var(--text-3)'}; font-weight: ${isOverdue ? '700' : '500'};">
                    ${isOverdue ? `Overdue (${Utils.formatDate(c.dueDate)})` : `Due ${Utils.formatDate(c.dueDate)}`}
                  </div>
                </div>
                <div onclick="event.stopPropagation()">
                  ${c.status === 'unassigned' ? `
                    <button class="btn btn--primary btn--sm" style="height: 32px; padding: 0 14px; font-size: 12px;" onclick="openAssignmentModal('${c.id}')">Assign</button>
                  ` : (c.status !== 'paid' && c.status !== 'court' ? `
                    <button class="btn btn--secondary btn--sm" style="height: 32px; padding: 0 14px; font-size: 12px;" onclick="openPaymentModal('${c.id}')">Pay</button>
                  ` : `
                    <a href="#challans?id=${c.id}" class="btn btn--outline btn--sm" style="height: 32px; padding: 0 14px; font-size: 12px;">Details</a>
                  `)}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    const isAllSelected = paginatedRows.every(r => challanTableState.selectedChallanIds.has(r.id));

    tableContainer.innerHTML = `
      <table class="data-table" style="width: 100%; min-width: 980px;">
        <thead>
          <tr>
            <th style="width: 52px; text-align: center; padding-left: 18px;">
              <input type="checkbox" class="custom-checkbox" id="selectAllChallansCheckbox" aria-label="Select all traffic notices" ${isAllSelected ? 'checked' : ''} onchange="toggleSelectAllChallans(this.checked)">
            </th>
            <th onclick="sortChallansBy('challanNumber')" style="width: 28%; cursor: pointer;">
              Notice & Violation ${getChallanSortIcon('challanNumber')}
            </th>
            <th onclick="sortChallansBy('vehicleReg')" style="width: 18%; cursor: pointer;">
              Vehicle Asset ${getChallanSortIcon('vehicleReg')}
            </th>
            <th style="width: 20%;">Attributed Custody</th>
            <th onclick="sortChallansBy('amount')" style="width: 16%; cursor: pointer; text-align: right;">
              Penalty Amount ${getChallanSortIcon('amount')}
            </th>
            <th style="width: 18%; text-align: right; padding-right: 24px;">Status & Action</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedRows.map(c => {
            const isChecked = challanTableState.selectedChallanIds.has(c.id);
            const daysLeft = Utils.getDaysRemaining(c.dueDate);
            const isOverdue = daysLeft < 0 && c.status !== "paid";
            const veh = StorageManager.getVehicleById(c.vehicleId);

            return `
              <tr class="${isChecked ? 'row-selected' : ''} row-interactive ${isOverdue ? 'row-urgent-risk' : ''}" onclick="handleChallanRowClick(event, '${c.id}')" title="Click to view full notice details">
                <td style="text-align: center; padding-left: 18px;" onclick="event.stopPropagation()">
                  <input type="checkbox" class="custom-checkbox" aria-label="Select infraction ${c.challanNumber}" ${isChecked ? 'checked' : ''} onchange="toggleChallanRowSelection('${c.id}', this.checked)">
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${isOverdue ? '<span class="urgent-pulse-dot" title="Statutory SLA Overdue: Urgent Action Required"></span>' : ''}
                    <a href="#challans?id=${c.id}" class="font-mono font-bold" style="font-size: 13.5px; color: var(--color-primary); text-decoration: none;">
                      ${c.challanNumber}
                    </a>
                  </div>
                  <div style="font-size: 13px; font-weight: 500; color: var(--color-text-main); margin-top: 3px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.offence}">
                    ${c.offence}
                  </div>
                </td>
                <td>
                  <div>
                    <a href="#vehicles?id=${c.vehicleId}" class="plate-chip font-mono font-bold" title="View vehicle">
                      ${c.vehicleReg}
                    </a>
                  </div>
                  <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 3px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${veh ? veh.makeModel.split('(')[0].trim() : 'Commercial Fleet'}
                  </div>
                </td>
                <td>
                  <div style="font-size: 13.5px; font-weight: 600; color: var(--color-text-main); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${c.responsiblePartyName || c.responsibleParty}
                  </div>
                  <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">
                    ${c.responsibleParty === 'Unassigned' ? '<span style="color: var(--status-unassigned); font-weight: 600;">Needs Attribution</span>' : c.responsibleParty}
                  </div>
                </td>
                <td style="text-align: right;">
                  <strong class="amount-cell" style="font-size: 16px; font-weight: 600; color: var(--ink); white-space: nowrap; font-variant-numeric: tabular-nums;">
                    ${Utils.formatINR(c.amount)}
                  </strong>
                  <div style="font-size: 12px; color: ${isOverdue ? 'var(--status-unassigned)' : 'var(--color-text-muted)'}; margin-top: 4px; font-weight: ${isOverdue ? '600' : '400'};">
                    ${isOverdue ? `Overdue (${Utils.formatDate(c.dueDate)})` : `Due ${Utils.formatDate(c.dueDate)}`}
                  </div>
                </td>
                <td style="text-align: right; padding-right: 24px;" onclick="event.stopPropagation()">
                  <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px;">
                    ${Utils.getStatusBadgeHTML(c.status)}
                    ${c.status === 'unassigned' ? `
                      <button class="btn btn--primary btn--sm" style="height: 32px; padding: 0 12px; font-size: 12px; font-weight: 500;" onclick="openAssignmentModal('${c.id}')" title="Assign Liability">
                        Assign
                      </button>
                    ` : (c.status !== 'paid' && c.status !== 'court' ? `
                      <button class="btn btn--secondary btn--sm" style="height: 32px; padding: 0 14px; font-size: 12px; font-weight: 600;" onclick="openPaymentModal('${c.id}')" title="Pay Notice">
                        Pay
                      </button>
                    ` : `
                      <a href="#challans?id=${c.id}" class="btn btn--outline btn--sm" style="height: 32px; padding: 0 14px; font-size: 12px; font-weight: 600;" title="View Details">
                        Details
                      </a>
                    `)}
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

function toggleChallanViewMode(mode) {
  challanTableState.viewMode = mode;
  renderChallansTableAndPagination();
  const gridBtn = document.getElementById("challanViewGridBtn");
  const tableBtn = document.getElementById("challanViewTableBtn");
  if (gridBtn && tableBtn) {
    gridBtn.style.background = mode === "grid" ? "#FFFFFF" : "transparent";
    gridBtn.style.color = mode === "grid" ? "var(--color-primary)" : "var(--text-3)";
    tableBtn.style.background = mode === "table" ? "#FFFFFF" : "transparent";
    tableBtn.style.color = mode === "table" ? "var(--color-primary)" : "var(--text-3)";
  }
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
  updateBreadcrumbs(["Hisaab", "Challans", challan.challanNumber]);

  const vehicle = StorageManager.getVehicleById(challan.vehicleId) || { regNumber: challan.vehicleReg, makeModel: "Commercial Fleet Vehicle" };
  const vMeta = Utils.getVehicleTypeMeta(vehicle);
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
    <div style="display: inline-flex; gap: 4px;">
      <button class="btn btn--outline btn--sm" onclick="navigateToPrevChallan('${challan.id}')" title="Previous Notice (K)" aria-label="Previous Notice (K)">
        ‹ Prev (K)
      </button>
      <button class="btn btn--outline btn--sm" onclick="navigateToNextChallan('${challan.id}')" title="Next Notice (J)" aria-label="Next Notice (J)">
        Next (J) ›
      </button>
    </div>
    <button class="btn btn--outline btn--sm" onclick="navigateTo('challans')">
      ← Back to Challans
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
      <button class="btn btn--outline btn--sm" style="color: #B45309; border-color: #B45309;" onclick="reconcileSpecificChallan('${challan.id}')">
        ${Utils.icon('clock', 13)} Reconcile Pending Payment
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
      <button class="btn btn--outline btn--sm" style="border-color: #B91C1C; color: #B91C1C;" onclick="openCourtCaseModal('${challan.id}')" title="Direct payment locked. Click to view or record court compounding order.">
        ${Utils.icon('lock', 13)} Payment Locked: Court Stay Awaiting Order
      </button>
    `)}
  `;

  container.innerHTML = `
    <div class="challan-details-grid">
      
      <!-- ===================================================================
           LEFT COLUMN: Infraction Facts & Evidence (Case Study Screen 5)
           =================================================================== -->
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        
        <!-- Evidence Photographic Card (Clean Minimal ANPR Preview) -->
        <div class="card" style="padding: 0; overflow: hidden; border-radius: var(--radius-card); border: 1px solid var(--line); background: var(--surface);">
          <div style="position: relative; width: 100%; height: 220px; background: #0F172A; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="${challan.evidenceImage || 'assets/images/speed-camera-radar.jpg'}" alt="Traffic Infraction Evidence" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='assets/images/speed-camera-radar.jpg'">
            
            <div style="position: absolute; bottom: 12px; left: 16px; display: flex; align-items: center; gap: 8px;">
              <span class="plate-chip plate-chip--commercial" style="font-size: 11px;">
                ${challan.vehicleReg}
              </span>
              <span class="badge badge--neutral" style="background: rgba(17, 24, 39, 0.85); color: #FFF; border: none; font-size: 11px;">
                ANPR Camera Evidence
              </span>
            </div>
            
            <div style="position: absolute; top: 12px; right: 16px;">
              <span class="badge badge--neutral" style="background: rgba(17, 24, 39, 0.85); color: #FFF; border: none; font-size: 11px;">
                ${challan.source || 'Traffic Police'}
              </span>
            </div>
          </div>
          <div style="padding: 12px 16px; font-size: 12px; color: var(--text-2); background: var(--surface); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line);">
            <span>Infraction Location: <strong style="color: var(--ink);">${challan.location || 'Public Thoroughfare'}</strong></span>
            <span>${Utils.formatDate(challan.offenceDate, true)}</span>
          </div>
        </div>

        <!-- Factual Specifications Card -->
        <div class="card" style="padding: 20px; border-radius: var(--radius-card); border: 1px solid var(--line); background: var(--surface);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line);">
            <div>
              <div style="font-size: 11px; font-family: var(--font-family-mono); color: var(--text-3);">
                ${challan.challanNumber}
              </div>
              <h2 style="font-size: 18px; font-weight: 600; color: var(--ink); margin-top: 4px; line-height: 1.3;">
                ${challan.offence}
              </h2>
              <div style="font-size: 12px; font-weight: 600; color: var(--color-primary); margin-top: 4px;">
                ${challan.mvActSection}
              </div>
            </div>
            <div>
              ${Utils.getStatusBadgeHTML(challan.status)}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 12px;">
            <div>
              <span style="color: var(--text-3); font-size: 11px; display: block;">Vehicle Asset</span>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <a href="#vehicles?id=${challan.vehicleId}" class="plate-chip plate-chip--commercial" style="font-size: 11px; padding: 2px 8px;">
                  ${challan.vehicleReg}
                </a>
                <span class="badge ${vMeta.badgeClass}" style="${vMeta.badgeStyle}; font-size: 11px; padding: 2px 6px;">${vMeta.label}</span>
              </div>
            </div>

            <div>
              <span style="color: var(--text-3); font-size: 11px; display: block;">Make & Fleet Owner</span>
              <strong style="color: var(--ink); display: block; margin-top: 2px;">
                ${vehicle.makeModel || 'Commercial Vehicle'} (${vehicle.ownerName || 'Apex Fleet'})
              </strong>
            </div>

            <div>
              <span style="color: var(--text-3); font-size: 11px; display: block;">Issuing Authority</span>
              <strong style="color: var(--ink); display: block; margin-top: 2px;">${challan.issuingAuthority}</strong>
            </div>

            <div>
              <span style="color: var(--text-3); font-size: 11px; display: block;">Offence Timestamp</span>
              <strong style="color: var(--ink); display: block; margin-top: 2px;">${Utils.formatDate(challan.offenceDate, true)}</strong>
            </div>

            <div>
              <span style="color: var(--text-3); font-size: 11px; display: block;">Data Source</span>
              <strong style="color: var(--ink); display: block; margin-top: 2px;">${challan.source || 'e-Challan API'}</strong>
            </div>

            <div>
              <span style="color: var(--text-3); font-size: 11px; display: block;">Current Attribution</span>
              <strong style="color: var(--ink); display: block; margin-top: 2px;">
                ${challan.responsiblePartyName || challan.responsibleParty} (${challan.responsibleParty})
              </strong>
            </div>
          </div>

          <!-- Financial Breakdown & Payable Summary -->
          <div style="margin-top: 16px; background-color: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
              <span style="color: var(--text-2);">Statutory Penalty Amount:</span>
              <strong style="color: var(--ink); font-variant-numeric: tabular-nums;">${Utils.formatINR(challan.amount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-top: 4px;">
              <span style="color: var(--text-2);">Accumulated Late Fee:</span>
              <strong style="color: ${(challan.lateFee || 0) > 0 ? 'var(--status-unassigned)' : 'var(--text-3)'}; font-variant-numeric: tabular-nums;">
                ${Utils.formatINR(challan.lateFee || 0)}
              </strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-top: 4px;">
              <span style="color: var(--text-2);">Gateway Convenience Surcharge:</span>
              <strong style="color: var(--ink); font-variant-numeric: tabular-nums;">${Utils.formatINR(challan.convenienceFee || 25)}</strong>
            </div>
            <div style="height: 1px; background-color: var(--line); margin: 8px 0;"></div>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 13px; font-weight: 600; color: var(--ink);">Total Statutory Payable:</span>
              <span style="font-size: 22px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">
                ${Utils.formatINR(challan.totalPayable || challan.amount + (challan.lateFee || 0) + (challan.convenienceFee || 25))}
              </span>
            </div>
          </div>

          <!-- Statutory Due Date & Dispute Window -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
            <div style="padding: 10px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface);">
              <span style="font-size: 11px; color: var(--text-3); display: block;">Statutory Due Date</span>
              <strong style="font-size: 12.5px; color: var(--ink);">${Utils.formatDate(challan.dueDate)}</strong>
              <div style="font-size: 11px; color: ${isOverdue ? 'var(--status-unassigned)' : 'var(--text-2)'}; font-weight: 600; margin-top: 2px;">
                ${isOverdue ? `Overdue by ${Math.abs(daysDue)} days` : `${daysDue} days remaining`}
              </div>
            </div>

            <div style="padding: 10px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface);">
              <span style="font-size: 11px; color: var(--text-3); display: block;">Dispute Contest Window</span>
              <strong style="font-size: 12.5px; color: var(--ink);">${Utils.formatDate(challan.disputeDeadline)}</strong>
              <div style="font-size: 11px; color: ${daysDispute <= 3 ? 'var(--status-unassigned)' : 'var(--color-primary)'}; font-weight: 600; margin-top: 2px;">
                ${daysDispute < 0 ? 'Window Expired' : `${daysDispute} days left to contest`}
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
            <h4 class="text-xs font-semibold text-muted">Responsibility history</h4>
            <span class="badge badge--neutral" style="font-size: 11px;">Attribution Ledger</span>
          </div>
          <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
            ${challan.previousResponsibleParty ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--color-bg-app); border-radius: var(--radius-sm); border-left: 2px solid var(--color-text-muted);">
                <div>
                  <span class="text-muted">Prior Attribution:</span> 
                  <strong>${challan.previousResponsiblePartyName || challan.previousResponsibleParty}</strong>
                  <span class="badge badge--neutral" style="font-size: 11px; margin-left: 4px;">${challan.previousResponsibleParty}</span>
                </div>
                <span class="text-xs text-muted">Superseded</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--color-bg-app); border-radius: var(--radius-sm); border-left: 2px solid var(--color-primary);">
              <div>
                <span class="text-muted">Current Attribution:</span> 
                <strong>${challan.responsiblePartyName || challan.responsibleParty}</strong>
                <span class="badge badge--assigned" style="font-size: 11px; margin-left: 4px;">${challan.responsibleParty}</span>
              </div>
              <span class="badge badge--paid" style="font-size: 11px;">Active</span>
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
                <div class="party-radio-group">
                  <label class="party-radio-tile">
                    <div style="display: flex; align-items: center;">
                      <input type="radio" name="detailsPartyRadio" value="Driver" ${suggestion.partyType === 'Driver' || challan.responsibleParty === 'Driver' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Driver', ${challan.totalPayable || challan.amount || 2000})">
                      <div>
                        <strong style="font-size: 13px;">Commercial Driver</strong>
                        <div class="text-xs text-muted">Operating custody during moving violation</div>
                      </div>
                    </div>
                    <span class="badge badge--assigned" style="font-size: 10px;">Payroll</span>
                  </label>
                  <label class="party-radio-tile">
                    <div style="display: flex; align-items: center;">
                      <input type="radio" name="detailsPartyRadio" value="Lessee" ${suggestion.partyType === 'Lessee' || challan.responsibleParty === 'Lessee' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Lessee', ${challan.totalPayable || challan.amount || 2000})">
                      <div>
                        <strong style="font-size: 13px;">Corporate Lessee</strong>
                        <div class="text-xs text-muted">Active long-term master lease agreement</div>
                      </div>
                    </div>
                    <span class="badge badge--pending" style="font-size: 10px;">Invoice</span>
                  </label>
                  <label class="party-radio-tile">
                    <div style="display: flex; align-items: center;">
                      <input type="radio" name="detailsPartyRadio" value="Fleet Operator" ${suggestion.partyType === 'Fleet Operator' || challan.responsibleParty === 'Fleet Operator' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Fleet Operator', ${challan.totalPayable || challan.amount || 2000})">
                      <div>
                        <strong style="font-size: 13px;">Fleet Operator</strong>
                        <div class="text-xs text-muted">Statutory documents lapsed / company absorption</div>
                      </div>
                    </div>
                    <span class="badge badge--neutral" style="font-size: 10px;">Opex</span>
                  </label>
                  <label class="party-radio-tile">
                    <div style="display: flex; align-items: center;">
                      <input type="radio" name="detailsPartyRadio" value="Vehicle Owner" ${suggestion.partyType === 'Vehicle Owner' || challan.responsibleParty === 'Vehicle Owner' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Vehicle Owner', ${challan.totalPayable || challan.amount || 2000})">
                      <div>
                        <strong style="font-size: 13px;">Vehicle Owner</strong>
                        <div class="text-xs text-muted">Registered lessor / asset financing covenant</div>
                      </div>
                    </div>
                    <span class="badge badge--neutral" style="font-size: 10px;">Lessor</span>
                  </label>
                  <label class="party-radio-tile">
                    <div style="display: flex; align-items: center;">
                      <input type="radio" name="detailsPartyRadio" value="Split" ${challan.responsibleParty === 'Split' ? 'checked' : ''} onchange="handleDetailsPartyTypeChange('Split', ${challan.totalPayable || challan.amount || 2000})">
                      <div>
                        <strong style="font-size: 13px;">Split Proportional Liability</strong>
                        <div class="text-xs text-muted">Apportion penalty between driver & operator</div>
                      </div>
                    </div>
                    <span class="badge badge--neutral" style="font-size: 10px;">Split</span>
                  </label>
                </div>
              </div>

              <!-- Specific Assignee Dropdown -->
              <div class="form-group" id="detailsEntityGroup">
                <label class="form-label" id="detailsEntityLabel">Assignee Name *</label>
                <select class="form-select" id="detailsEntitySelect"></select>
              </div>

              <!-- Split Liability Percentage Controls (Step 7.4) -->
              <div class="split-liability-box" id="detailsSplitBox" style="display: none; padding: 16px; background: var(--color-bg-app); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
                <div style="font-size: 12px; font-weight: 600; color: var(--color-text-main); margin-bottom: 8px;">
                  Proportional Split Allocation (Must equal exactly 100%)
                </div>
                <div class="split-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span class="text-xs font-medium">Party 1 (Driver / Primary Operator):</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" class="form-input split-input" id="splitDriverPct" value="60" min="0" max="100" style="width: 72px; text-align: right;" oninput="validateSplitTotal(${challan.totalPayable || challan.amount || 2000})">
                    <span class="text-xs font-semibold">%</span>
                  </div>
                </div>
                <div class="split-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span class="text-xs font-medium">Party 2 (Lessee / Fleet Operator):</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" class="form-input split-input" id="splitLesseePct" value="40" min="0" max="100" style="width: 72px; text-align: right;" oninput="validateSplitTotal(${challan.totalPayable || challan.amount || 2000})">
                    <span class="text-xs font-semibold">%</span>
                  </div>
                </div>
                <div style="font-size: 11px; font-weight: 600; margin-top: 8px;" id="splitValidationFeedback" style="color: var(--status-paid);">
                  Total: 100% (Driver Share: 60% = ₹${((challan.amount || 2000) * 0.6).toFixed(0)}, Lessee Share: 40% = ₹${((challan.amount || 2000) * 0.4).toFixed(0)})
                </div>
              </div>

              <!-- Mandatory Audit Notes / Reassignment Reason (Step 7.3) -->
              <div class="form-group">
                <label class="form-label">Mandatory Audit Justification / Reason *</label>
                <textarea class="form-textarea" id="detailsAuditNotes" rows="3" required placeholder="Enter operational justification or override rationale"></textarea>
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
      feedback.innerHTML = `${Utils.icon('check', 13)} Total: 100% (Party 1 Share: ${driverPct}% = ${Utils.formatINR(driverAmt)}, Party 2 Share: ${lesseePct}% = ${Utils.formatINR(lesseeAmt)})`;
      if (submitBtn) submitBtn.disabled = false;
    } else {
      feedback.style.color = "var(--status-unassigned)";
      feedback.innerHTML = `${Utils.icon('alert', 13)} Total equals ${total}%. Split allocation must equal exactly 100% (Discrepancy: ${100 - total}%).`;
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
      feedback.textContent = `Total: 100% (Driver Share: ${dPct}%, Lessee Share: ${lPct}%)`;
      if (confirmBtn) confirmBtn.disabled = false;
    } else {
      feedback.style.color = "var(--status-unassigned)";
      feedback.textContent = `Total is ${total}%. Split allocation must equal exactly 100%.`;
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
    user: "Deepak Tiwari (Fleet Compliance Head)",
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

/**
 * In-Drawer / Detail View Next Notice Navigation (Keyboard Nav J/K)
 */
function navigateToNextChallan(currentId) {
  const challans = StorageManager.getChallans();
  const idx = challans.findIndex(c => c.id === currentId);
  if (idx !== -1 && idx < challans.length - 1) {
    navigateTo('challans', true, { id: challans[idx + 1].id });
  } else if (idx === challans.length - 1) {
    Utils.showToast("Last Notice", "You have reached the last infraction notice.", "info");
  }
}
window.navigateToNextChallan = navigateToNextChallan;

function navigateToPrevChallan(currentId) {
  const challans = StorageManager.getChallans();
  const idx = challans.findIndex(c => c.id === currentId);
  if (idx > 0) {
    navigateTo('challans', true, { id: challans[idx - 1].id });
  } else if (idx === 0) {
    Utils.showToast("First Notice", "You are viewing the first infraction notice.", "info");
  }
}
window.navigateToPrevChallan = navigateToPrevChallan;
window.submitDetailsAssignment = submitDetailsAssignment;
window.validateModalSplitTotal = validateModalSplitTotal;
window.populateEntityOptions = populateEntityOptions;

