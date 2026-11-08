/**
 * ChallanOS - Main Application Shell & Hash Router Module (js/app.js)
 * 
 * Central Product Principle:
 * "A challan is a decision to be made, not a record to be stored."
 * 
 * Features:
 * - Hash Router (#dashboard, #vehicles, #challans, #drivers, #payments, #disputes, #reports, #settings, #components)
 * - Deep linking with query parameters (?id=..., ?status=..., ?filter=..., ?search=...)
 * - Collapsible sidebar with desktop memory & mobile drawer
 * - Global search (Cmd+K / '/' shortcut) with live fuzzy jump results
 * - Notifications flyout with unread badge counter
 * - User profile dropdown & role indicator
 * - Modal coordinators & toast alerts
 */

// --------------------------------------------------------------------------
// 1. ROUTE REGISTRY & DISPATCHER
// --------------------------------------------------------------------------
const ROUTES = {
  dashboard: {
    title: "Operational Dashboard",
    subtitle: "Real-time compliance KPIs, triage queue & liability breakdown",
    breadcrumb: ["ChallanOS", "Dashboard"],
    render: renderDashboardView
  },
  vehicles: {
    title: "Commercial Fleet Directory",
    subtitle: "Vehicle asset inventory, ownership contracts & timeline telemetry",
    breadcrumb: ["ChallanOS", "Vehicles"],
    render: renderVehiclesView
  },
  challans: {
    title: "Traffic Infraction Management",
    subtitle: "Multi-jurisdiction e-challan decision ledger & automated attribution",
    breadcrumb: ["ChallanOS", "Challans"],
    render: renderChallansView
  },
  drivers: {
    title: "Driver Directory & Recoveries",
    subtitle: "Driver license validity, allocated vehicles & payroll deductions",
    breadcrumb: ["ChallanOS", "Drivers"],
    render: renderDriversView
  },
  payments: {
    title: "Payments & Reconciliation",
    subtitle: "Settlement rails, recovery ledgers & verified transaction vouchers",
    breadcrumb: ["ChallanOS", "Payments"],
    render: renderPaymentsView
  },
  disputes: {
    title: "Disputes & Virtual Court Matters",
    subtitle: "Administrative grievances, virtual court compounding & legal stay dockets",
    breadcrumb: ["ChallanOS", "Disputes & Court"],
    render: renderDisputesView
  },
  reports: {
    title: "Compliance & Audit Reports",
    subtitle: "Executive financial exposure, fleet risk scoring & payroll schedules",
    breadcrumb: ["ChallanOS", "Reports"],
    render: renderReportsView
  },
  settings: {
    title: "System Settings & Policies",
    subtitle: "Responsibility rules, maker-checker limits & role simulation",
    breadcrumb: ["ChallanOS", "Settings"],
    render: renderSettingsView
  },
  components: {
    title: "Design System & Component Showcase",
    subtitle: "Atomic UI tokens, badges, buttons, cards & inputs preview",
    breadcrumb: ["ChallanOS", "Design System"],
    render: renderComponentPreviewView
  }
};

let currentRoute = "dashboard";
let currentParams = {};

// --------------------------------------------------------------------------
// 2. APPLICATION BOOTSTRAPPING
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize State Storage
  StorageManager.init();

  // 2. Setup Application Shell Subsystems
  initSidebar();
  initTopbar();
  initGlobalSearch();
  initNotifications();
  initUserProfile();
  if (typeof initModalListeners === "function") {
    initModalListeners();
  }
  initRouting();

  console.log("ChallanOS: Modular Application Shell mounted.");
});

// --------------------------------------------------------------------------
// 3. SIDEBAR CONTROLLER
// --------------------------------------------------------------------------
function initSidebar() {
  const sidebar = document.getElementById("appSidebar");
  const collapseBtn = document.getElementById("sidebarCollapseBtn");
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  // Desktop Collapse Toggle
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      const isCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem("challanos_sidebar_collapsed", isCollapsed ? "1" : "0");
      
      const textSpan = collapseBtn.querySelector(".sidebar-collapse-text");
      if (textSpan) {
        textSpan.textContent = isCollapsed ? "Expand" : "Collapse";
      }
    });

    if (localStorage.getItem("challanos_sidebar_collapsed") === "1" && window.innerWidth > 1024) {
      sidebar.classList.add("collapsed");
    }
  }

  // Mobile Drawer Toggle
  if (mobileToggle && sidebar && sidebarOverlay) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.add("mobile-open");
      sidebarOverlay.classList.add("active");
    });

    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("active");
    });
  }

  // Global Escape key listener: closes mobile drawer and active modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (sidebar && sidebar.classList.contains("mobile-open")) {
        sidebar.classList.remove("mobile-open");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
      }
      const openModal = document.querySelector(".modal.show");
      if (openModal) {
        openModal.classList.remove("show");
        if (document.body && document.body.style) document.body.style.overflow = "";
      }
    }
  });

  updateSidebarBadges();
  window.addEventListener("state:updated", updateSidebarBadges);
}

function updateSidebarBadges() {
  const challans = StorageManager.getChallans();
  const unassignedCount = challans.filter(c => c.status === "unassigned").length;
  const badge = document.getElementById("unassignedNavBadge");
  if (badge) {
    badge.textContent = unassignedCount;
    badge.style.display = unassignedCount > 0 ? "inline-flex" : "none";
  }
}

// --------------------------------------------------------------------------
// 4. TOPBAR & USER CONTEXT CONTROLLER
// --------------------------------------------------------------------------
function initTopbar() {
  const currentUser = StorageManager.getCurrentUser();
  const workspaces = StorageManager.getWorkspaces();
  const activeWs = workspaces.find(w => w.id === currentUser.workspaceId) || workspaces[0];

  const wsTitleEl = document.getElementById("activeWorkspaceTitle");
  const wsRoleEl = document.getElementById("activeWorkspaceRole");
  if (wsTitleEl) wsTitleEl.textContent = activeWs.name;
  if (wsRoleEl) wsRoleEl.textContent = activeWs.role;

  const userNameEl = document.getElementById("currentUserName");
  const userRoleEl = document.getElementById("currentUserRole");
  const userAvatarEl = document.getElementById("currentUserAvatar");
  if (userNameEl) userNameEl.textContent = currentUser.name;
  if (userRoleEl) userRoleEl.textContent = currentUser.role;
  if (userAvatarEl) userAvatarEl.textContent = currentUser.avatar;
}

// --------------------------------------------------------------------------
// 5. GLOBAL SEARCH (CMD+K / '/') CONTROLLER
// --------------------------------------------------------------------------
function initGlobalSearch() {
  const searchInput = document.getElementById("globalSearchInput");
  const searchDropdown = document.getElementById("globalSearchDropdown");

  if (!searchInput || !searchDropdown) return;

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "/" && document.activeElement !== searchInput && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  const performSearch = (query) => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      searchDropdown.style.display = "none";
      searchDropdown.innerHTML = "";
      return;
    }

    const challans = StorageManager.getChallans();
    const vehicles = StorageManager.getVehicles();
    const drivers = StorageManager.getDrivers();

    const matchedVehicles = vehicles.filter(v => 
      v.regNumber.toLowerCase().includes(q) || 
      v.makeModel.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedChallans = challans.filter(c => 
      c.challanNumber.toLowerCase().includes(q) || 
      c.offence.toLowerCase().includes(q) || 
      c.vehicleReg.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedDrivers = drivers.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.dlNumber.toLowerCase().includes(q)
    ).slice(0, 2);

    let html = "";

    if (matchedVehicles.length > 0) {
      html += `<div class="search-category-title">Vehicles (${matchedVehicles.length})</div>`;
      matchedVehicles.forEach(v => {
        html += `
          <div class="search-result-item" onclick="navigateTo('vehicles', true, { id: '${v.id}' }); closeSearch();">
            <span class="search-item-badge">VEHICLE</span>
            <div class="search-item-title">${v.regNumber}</div>
            <div class="search-item-sub">${v.makeModel} • Open Fines: ${v.openChallans || 0}</div>
          </div>
        `;
      });
    }

    if (matchedChallans.length > 0) {
      html += `<div class="search-category-title">Traffic Challans (${matchedChallans.length})</div>`;
      matchedChallans.forEach(c => {
        html += `
          <div class="search-result-item" onclick="navigateTo('challans', true, { id: '${c.id}' }); closeSearch();">
            <span class="search-item-badge" style="background: var(--status-unassigned-bg); color: var(--status-unassigned);">CHALLAN</span>
            <div class="search-item-title">${c.challanNumber} — ${c.vehicleReg}</div>
            <div class="search-item-sub">${c.offence} • ${Utils.formatINR(c.amount)} • Status: ${c.status}</div>
          </div>
        `;
      });
    }

    if (matchedDrivers.length > 0) {
      html += `<div class="search-category-title">Drivers (${matchedDrivers.length})</div>`;
      matchedDrivers.forEach(d => {
        html += `
          <div class="search-result-item" onclick="navigateTo('drivers'); closeSearch();">
            <span class="search-item-badge" style="background: var(--status-assigned-bg); color: var(--status-assigned);">DRIVER</span>
            <div class="search-item-title">${d.name}</div>
            <div class="search-item-sub">DL: ${d.dlNumber} • Assigned: ${d.assignedVehicleReg}</div>
          </div>
        `;
      });
    }

    if (!html) {
      html = `<div style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 13px;">No results found matching "<strong>${Utils.escapeHTML(q)}</strong>"</div>`;
    }

    searchDropdown.innerHTML = html;
    searchDropdown.style.display = "block";
  };

  window.closeSearch = () => {
    searchDropdown.style.display = "none";
    searchInput.value = "";
  };

  searchInput.addEventListener("input", (e) => {
    performSearch(e.target.value);
  });

  searchInput.addEventListener("focus", (e) => {
    if (e.target.value.trim().length >= 2) {
      searchDropdown.style.display = "block";
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.style.display = "none";
    }
  });
}

// --------------------------------------------------------------------------
// 6. NOTIFICATIONS FLYOUT CONTROLLER
// --------------------------------------------------------------------------
function initNotifications() {
  const bellBtn = document.getElementById("notificationsBellBtn");
  const panel = document.getElementById("notificationsFlyout");
  const list = document.getElementById("notificationsList");
  const badge = document.getElementById("unreadNotificationBadge");

  if (!bellBtn || !panel || !list) return;

  const renderNotifs = () => {
    const notifs = StorageManager.getNotifications();
    const unreadCount = notifs.filter(n => !n.read).length;

    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? "inline-flex" : "none";
    }
    const unreadPill = document.getElementById("flyoutUnreadPill");
    if (unreadPill) {
      unreadPill.textContent = unreadCount > 0 ? `${unreadCount} new` : "All read";
    }

    if (notifs.length === 0) {
      list.innerHTML = `
        <div style="padding: 32px 16px; text-align: center; color: var(--text-3); font-size: 13px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 8px; opacity: 0.6;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          No notifications. All fleet compliance notices clear!
        </div>
      `;
      return;
    }

    list.innerHTML = notifs.map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}" onclick="handleNotificationClick('${n.id}')">
        <div class="notification-indicator">
          <span class="notification-dot" style="background-color: ${n.type === 'danger' ? 'var(--status-unassigned)' : (n.type === 'warning' ? '#E8A33D' : 'var(--accent)')};"></span>
        </div>
        <div class="notification-content">
          <div class="notification-title-row">
            <span class="notification-title">${n.title}</span>
            <span class="notification-time">${n.timestamp || n.time || ''}</span>
          </div>
          <div class="notification-desc">${n.message || n.desc || ''}</div>
        </div>
      </div>
    `).join("");
  };

  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const profileMenu = document.getElementById("userProfileMenu");
    if (profileMenu) {
      profileMenu.style.display = "none";
      profileMenu.classList.remove("show");
    }

    const isVisible = panel.classList.contains("show") || panel.style.display === "flex";
    if (isVisible) {
      panel.style.display = "none";
      panel.classList.remove("show");
    } else {
      panel.style.display = "flex";
      panel.classList.add("show");
      renderNotifs();
    }
  });

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !bellBtn.contains(e.target)) {
      panel.style.display = "none";
      panel.classList.remove("show");
    }
  });

  renderNotifs();
  window.addEventListener("state:updated", renderNotifs);

  if (window.location.hash.includes("open=notifications")) {
    setTimeout(() => bellBtn.click(), 250);
  }
}

function handleNotificationClick(notifId) {
  StorageManager.markNotificationRead(notifId);
  const panel = document.getElementById("notificationsFlyout");
  if (panel) {
    panel.style.display = "none";
    panel.classList.remove("show");
  }
  navigateTo("challans", true, { status: "unassigned" });
}

function markAllNotificationsRead() {
  const notifs = StorageManager.getNotifications();
  notifs.forEach(n => StorageManager.markNotificationRead(n.id));
  Utils.showToast("Notifications Read", "All alert notifications marked as read.", "info");
  const panel = document.getElementById("notificationsFlyout");
  if (panel && (panel.classList.contains("show") || panel.style.display === "flex")) {
    const list = document.getElementById("notificationsList");
    const unreadPill = document.getElementById("flyoutUnreadPill");
    const badge = document.getElementById("unreadNotificationBadge");
    if (badge) badge.style.display = "none";
    if (unreadPill) unreadPill.textContent = "All read";
    if (list) {
      const notifsUpdated = StorageManager.getNotifications();
      list.innerHTML = notifsUpdated.map(n => `
        <div class="notification-item" onclick="handleNotificationClick('${n.id}')">
          <div class="notification-indicator">
            <span class="notification-dot" style="background-color: ${n.type === 'danger' ? 'var(--status-unassigned)' : (n.type === 'warning' ? '#E8A33D' : 'var(--accent)')};"></span>
          </div>
          <div class="notification-content">
            <div class="notification-title-row">
              <span class="notification-title">${n.title}</span>
              <span class="notification-time">${n.timestamp || n.time || ''}</span>
            </div>
            <div class="notification-desc">${n.message || n.desc || ''}</div>
          </div>
        </div>
      `).join("");
    }
  }
}

// --------------------------------------------------------------------------
// 7. USER PROFILE FLYOUT CONTROLLER
// --------------------------------------------------------------------------
function initUserProfile() {
  const profileBtn = document.getElementById("userProfileBtn");
  const profileMenu = document.getElementById("userProfileMenu");

  if (!profileBtn || !profileMenu) return;

  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const notifPanel = document.getElementById("notificationsFlyout");
    if (notifPanel) {
      notifPanel.style.display = "none";
      notifPanel.classList.remove("show");
    }

    const isVisible = profileMenu.classList.contains("show") || profileMenu.style.display === "block";
    if (isVisible) {
      profileMenu.style.display = "none";
      profileMenu.classList.remove("show");
    } else {
      profileMenu.style.display = "block";
      profileMenu.classList.add("show");
    }
  });

  document.addEventListener("click", (e) => {
    if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
      profileMenu.style.display = "none";
      profileMenu.classList.remove("show");
    }
  });

  if (window.location.hash.includes("open=profile")) {
    setTimeout(() => profileBtn.click(), 250);
  }
}

// --------------------------------------------------------------------------
// 8. HASH ROUTING CONTROLLER
// --------------------------------------------------------------------------
function initRouting() {
  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
}

function handleHashChange() {
  const hash = window.location.hash.slice(1) || "dashboard";
  const [routePath, queryString] = hash.split("?");
  
  const params = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((val, key) => {
      params[key] = val;
    });
  }

  const targetRoute = ROUTES[routePath] ? routePath : "dashboard";
  navigateTo(targetRoute, false, params);
  if (params.modal && typeof Utils !== "undefined" && Utils.openModal) {
    setTimeout(() => Utils.openModal(params.modal), 150);
  }
}

function navigateTo(routeKey, updateHash = true, params = {}) {
  const route = ROUTES[routeKey] || ROUTES.dashboard;
  currentRoute = routeKey;
  currentParams = params;

  if (updateHash) {
    const qStr = Object.keys(params).length > 0 
      ? "?" + new URLSearchParams(params).toString() 
      : "";
    window.location.hash = `#${routeKey}${qStr}`;
    return;
  }

  // Update Active Sidebar Link
  document.querySelectorAll(".nav-item, .nav-link").forEach(link => {
    link.classList.remove("active");
    if (link.dataset.route === routeKey) {
      link.classList.add("active");
    }
  });

  // Close Mobile Drawer if open
  const sidebar = document.getElementById("appSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar && overlay) {
    sidebar.classList.remove("mobile-open");
    overlay.classList.remove("active");
  }

  // Update Page Header & Breadcrumbs
  const titleEl = document.getElementById("pageTitle");
  const subtitleEl = document.getElementById("pageSubtitle");
  const breadcrumbEl = document.getElementById("breadcrumbContainer");
  const viewBody = document.getElementById("moduleViewBody");
  const viewActions = document.getElementById("viewHeaderActions");
  const viewHeader = document.querySelector(".view-header");

  // On the Dashboard route, the integrated Finexy greeting header takes priority
  if (viewHeader) {
    viewHeader.style.display = routeKey === "dashboard" ? "none" : "flex";
  }

  if (titleEl) titleEl.textContent = route.title;
  if (subtitleEl) subtitleEl.textContent = route.subtitle;

  if (breadcrumbEl && route.breadcrumb) {
    breadcrumbEl.innerHTML = route.breadcrumb.map((b, idx) => {
      const isLast = idx === route.breadcrumb.length - 1;
      return isLast 
        ? `<span class="breadcrumb-item current">${b}</span>`
        : `<span class="breadcrumb-item" onclick="navigateTo('${routeKey}')">${b}</span><span class="breadcrumb-separator">/</span>`;
    }).join("");
  }

  if (viewActions) viewActions.innerHTML = "";
  if (viewBody && typeof route.render === "function") {
    viewBody.scrollTop = 0;
    route.render(viewBody, viewActions, params);
  }
}

/**
 * Dynamically update breadcrumbs bar for nested/detail views
 */
function updateBreadcrumbs(crumbs = []) {
  const breadcrumbEl = document.getElementById("breadcrumbContainer");
  if (!breadcrumbEl || !crumbs.length) return;
  breadcrumbEl.innerHTML = crumbs.map((b, idx) => {
    const isLast = idx === crumbs.length - 1;
    let clickAttr = "";
    if (idx === 0) clickAttr = `onclick="navigateTo('dashboard')" style="cursor: pointer;"`;
    else if (idx === 1) {
      const lower = b.toLowerCase();
      if (ROUTES[lower]) clickAttr = `onclick="navigateTo('${lower}')" style="cursor: pointer;"`;
    }
    return isLast
      ? `<span class="breadcrumb-item current">${b}</span>`
      : `<span class="breadcrumb-item" ${clickAttr}>${b}</span><span class="breadcrumb-separator">/</span>`;
  }).join("");
}
window.updateBreadcrumbs = updateBreadcrumbs;

// --------------------------------------------------------------------------
// 9. DRIVER DIRECTORY CONTROLLER
// --------------------------------------------------------------------------
function renderDriversView(container, actions) {
  const drivers = StorageManager.getDrivers();
  const totalRecovery = drivers.reduce((sum, d) => sum + (d.pendingRecovery || 0), 0);

  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV('commercial-drivers-ledger.csv', StorageManager.getDrivers())">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      Export Drivers Directory
    </button>
  `;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: var(--space-4);">
      
      <!-- Driver KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Active Roster Drivers</span>
          <div class="kpi-value">${drivers.length}</div>
          <div class="kpi-subtext">Verified Commercial Heavy / Transport Licenses</div>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Total Pending Recovery</span>
          <div class="kpi-value" style="color: var(--status-pending);">${Utils.formatINR(totalRecovery)}</div>
          <div class="kpi-subtext">Queued for monthly payroll deduction</div>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Average Driver Safety Score</span>
          <div class="kpi-value" style="color: var(--status-paid);">92 / 100</div>
          <div class="kpi-subtext">Based on moving infractions per 10k km</div>
        </div>
      </div>

      <!-- Drivers Table -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Commercial Driver Directory & Allocation</div>
            <div class="card-subtitle">Tracks driver duty allocations, commercial license compliance & HR payroll deductions</div>
          </div>
          <span class="badge badge--neutral">${drivers.length} Drivers</span>
        </div>

        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>Contact Phone</th>
                <th>Commercial DL Number</th>
                <th>Assigned Vehicle</th>
                <th>Pending Fine Recovery</th>
                <th>Operational Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${drivers.map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${d.phone}</td>
                  <td style="font-family: var(--font-family-mono); font-size: 12px;">${d.dlNumber}</td>
                  <td>
                    <span class="plate-chip plate-chip--commercial" style="cursor: pointer;" onclick="navigateTo('vehicles', true, { search: '${d.assignedVehicleReg}' })">
                      ${d.assignedVehicleReg}
                    </span>
                  </td>
                  <td style="color: ${d.pendingRecovery > 0 ? 'var(--status-unassigned)' : 'inherit'}; font-weight: 600;">
                    ${Utils.formatINR(d.pendingRecovery)}
                  </td>
                  <td><span class="badge badge--paid">${d.status}</span></td>
                  <td>
                    <button class="btn btn--outline btn--sm" onclick="navigateTo('challans', true, { responsibleParty: 'Driver' })">
                      View Fines
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// --------------------------------------------------------------------------
// 10. DESIGN SYSTEM & COMPONENT SHOWCASE LAB
// --------------------------------------------------------------------------
function renderComponentPreviewView(container, actions) {
  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="Utils.showToast('Design Tokens Verified', 'Typography and design tokens checked.', 'success')">
      Trigger Toast
    </button>
    <button class="btn btn--primary btn--sm" onclick="Utils.openModal('assignmentModal')">
      Launch Test Modal
    </button>
  `;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: var(--space-6);">
      <!-- Palette -->
      <div class="card" style="padding: var(--space-6);">
        <h3 class="text-md font-semibold" style="margin-bottom: var(--space-2);">1. Design Tokens & Palette</h3>
        <p class="text-xs text-muted" style="margin-bottom: var(--space-4);">Mandatory enterprise color tokens verified against case study</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
          <div style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div style="height: 36px; background: var(--color-primary); border-radius: var(--radius-sm); margin-bottom: 6px;"></div>
            <strong class="text-xs">Primary</strong>
            <div class="text-xs text-muted font-mono">#2F4BE0</div>
          </div>
          <div style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div style="height: 36px; background: var(--status-unassigned); border-radius: var(--radius-sm); margin-bottom: 6px;"></div>
            <strong class="text-xs">Unassigned</strong>
            <div class="text-xs text-muted font-mono">#B42318</div>
          </div>
          <div style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div style="height: 36px; background: var(--status-assigned); border-radius: var(--radius-sm); margin-bottom: 6px;"></div>
            <strong class="text-xs">Assigned</strong>
            <div class="text-xs text-muted font-mono">#1D4ED8</div>
          </div>
          <div style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div style="height: 36px; background: var(--status-pending); border-radius: var(--radius-sm); margin-bottom: 6px;"></div>
            <strong class="text-xs">Pending</strong>
            <div class="text-xs text-muted font-mono">#B45309</div>
          </div>
          <div style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div style="height: 36px; background: var(--status-paid); border-radius: var(--radius-sm); margin-bottom: 6px;"></div>
            <strong class="text-xs">Paid</strong>
            <div class="text-xs text-muted font-mono">#15803D</div>
          </div>
          <div style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div style="height: 36px; background: var(--status-disputed); border-radius: var(--radius-sm); margin-bottom: 6px;"></div>
            <strong class="text-xs">Disputed</strong>
            <div class="text-xs text-muted font-mono">#6D28D9</div>
          </div>
          <div style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div style="height: 36px; background: var(--status-court); border-radius: var(--radius-sm); margin-bottom: 6px;"></div>
            <strong class="text-xs">Court</strong>
            <div class="text-xs text-muted font-mono">#0369A1</div>
          </div>
        </div>
      </div>

      <!-- Buttons & Status Badges -->
      <div class="card" style="padding: var(--space-6);">
        <h3 class="text-md font-semibold" style="margin-bottom: var(--space-4);">2. Buttons & Semantic Status Badges</h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
          <button class="btn btn--primary">Primary (38px)</button>
          <button class="btn btn--secondary">Secondary</button>
          <button class="btn btn--outline">Outline</button>
          <button class="btn btn--danger">Danger</button>
          <button class="btn btn--ghost">Ghost</button>
          <button class="btn btn--primary btn--sm">Compact (30px)</button>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span class="badge badge--unassigned">Unassigned</span>
          <span class="badge badge--assigned">Assigned</span>
          <span class="badge badge--pending">Pending Payment</span>
          <span class="badge badge--paid">Paid / Settled</span>
          <span class="badge badge--disputed">Disputed</span>
          <span class="badge badge--court">Virtual Court</span>
          <span class="badge badge--neutral">Neutral</span>
        </div>
      </div>

      <!-- 3. Form Controls & Inputs -->
      <div class="card" style="padding: var(--space-6);">
        <h3 class="text-md font-semibold" style="margin-bottom: var(--space-4);">3. Form Controls & Inputs</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
          <div class="form-group">
            <label class="form-label">Standard Text Input</label>
            <input class="form-input" type="text" placeholder="e.g. DL-01-AB-1234" value="DL-01-AB-1234">
          </div>
          <div class="form-group">
            <label class="form-label">Search Input with Icon</label>
            <div class="search-input-wrapper">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input class="search-input" type="search" placeholder="Search violations or vehicles...">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Standard Dropdown Select</label>
            <select class="form-select">
              <option>Driver (Payroll Recovery)</option>
              <option>Corporate Lessee</option>
              <option>Fleet Operator</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 4. KPI Card & Filter Chips -->
      <div class="card" style="padding: var(--space-6);">
        <h3 class="text-md font-semibold" style="margin-bottom: var(--space-4);">4. KPI Card & Filter Chips</h3>
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          <span class="filter-chip active">All Notice Sources</span>
          <span class="filter-chip">Parivahan API</span>
          <span class="filter-chip">Virtual Court</span>
          <span class="filter-chip">Manual ANPR</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div class="kpi-card" style="cursor: default;">
            <div class="kpi-card-top">
              <span class="kpi-label">Outstanding Liability</span>
              <div class="kpi-icon-wrapper" style="background: var(--color-primary-light); color: var(--color-primary);">₹</div>
            </div>
            <div class="kpi-value">₹18,40,000</div>
            <div class="kpi-subtext">Verified against Parivahan gateway</div>
          </div>
        </div>
      </div>

      <!-- 5. Empty State -->
      <div class="card" style="padding: var(--space-6);">
        <h3 class="text-md font-semibold" style="margin-bottom: var(--space-4);">5. Empty State Pattern</h3>
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
          </div>
          <h4 class="empty-state-title">No Unassigned Challans</h4>
          <p class="empty-state-desc">All commercial fleet infractions have been attributed to designated parties or settled.</p>
          <button class="btn btn--outline btn--sm" onclick="navigateTo('challans')">View Full Challan Ledger</button>
        </div>
      </div>
    </div>
  `;
}
