/**
 * ChallanOS - Command Palette (Cmd+K) & Slide-Over Quick Inspector Drawer
 * Linear / Mercury architectural navigation & context-preserving triage.
 */

const CommandPalette = {
  selectedIndex: 0,
  items: [],

  open() {
    const backdrop = document.getElementById("commandPaletteBackdrop");
    const input = document.getElementById("commandPaletteInput");
    if (!backdrop || !input) return;

    backdrop.classList.add("show");
    input.value = "";
    this.selectedIndex = 0;
    this.renderResults("");
    setTimeout(() => input.focus(), 20);
  },

  close() {
    const backdrop = document.getElementById("commandPaletteBackdrop");
    if (backdrop) backdrop.classList.remove("show");
  },

  buildItems(query = "") {
    const q = (query || "").trim().toLowerCase();
    const routes = [
      { group: "Navigation", label: "Dashboard — Fleet Liability Overview", hint: "G D", action: () => navigateTo("dashboard") },
      { group: "Navigation", label: "Challans — Traffic Infractions Ledger", hint: "G C", action: () => navigateTo("challans") },
      { group: "Navigation", label: "Vehicles — Commercial Asset Directory", hint: "G V", action: () => navigateTo("vehicles") },
      { group: "Navigation", label: "Drivers — Duty Roster & Payroll Holds", hint: "G R", action: () => navigateTo("drivers") },
      { group: "Navigation", label: "Payments — Treasury & Audit Vouchers", hint: "G P", action: () => navigateTo("payments") },
      { group: "Navigation", label: "Disputes & Virtual Court Dockets", hint: "G L", action: () => navigateTo("disputes") },
      { group: "Navigation", label: "Reports — 6 Statutory Audit Ledgers", hint: "G A", action: () => navigateTo("reports") },
      { group: "Navigation", label: "Settings — Governance & RBAC", hint: "G S", action: () => navigateTo("settings") }
    ];

    const challans = (typeof StorageManager !== "undefined" ? StorageManager.getChallans() : []).map(c => ({
      group: "Traffic Notices",
      label: `${c.challanNumber} — ${c.vehicleReg} (${c.offence})`,
      hint: Utils.formatINR(c.amount),
      action: () => openQuickInspectorDrawer(c.id)
    }));

    const vehicles = (typeof StorageManager !== "undefined" ? StorageManager.getVehicles() : []).map(v => ({
      group: "Fleet Vehicles",
      label: `${v.regNumber} — ${v.makeModel}`,
      hint: v.status || "Active",
      action: () => navigateTo("vehicles", true, { id: v.id })
    }));

    const all = [...routes, ...challans, ...vehicles];
    if (!q) return [...routes.slice(0, 5), ...challans.slice(0, 5)];
    return all.filter(item => item.label.toLowerCase().includes(q)).slice(0, 12);
  },

  renderResults(query = "") {
    const container = document.getElementById("commandPaletteResults");
    if (!container) return;

    this.items = this.buildItems(query);
    if (this.items.length === 0) {
      container.innerHTML = `<div style="padding: 28px; text-align: center; font-size: 13px; color: var(--text-3);">No matching notices, vehicles, or routes found.</div>`;
      return;
    }

    if (this.selectedIndex >= this.items.length) this.selectedIndex = 0;

    let lastGroup = "";
    container.innerHTML = this.items.map((item, idx) => {
      const groupHdr = item.group !== lastGroup
        ? `<div class="cmd-palette-group-label">${item.group}</div>`
        : "";
      lastGroup = item.group;
      return `
        ${groupHdr}
        <button type="button" class="cmd-palette-item ${idx === this.selectedIndex ? 'selected' : ''}" data-cmd-idx="${idx}">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.label}</span>
          <span style="font-size: 11px; color: var(--text-3); font-family: var(--font-family-mono); flex-shrink: 0;">${item.hint}</span>
        </button>
      `;
    }).join("");

    container.querySelectorAll(".cmd-palette-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.cmdIdx, 10);
        if (this.items[i]) {
          this.close();
          this.items[i].action();
        }
      });
    });
  },

  handleKey(e) {
    const backdrop = document.getElementById("commandPaletteBackdrop");
    const isOpen = backdrop && backdrop.classList.contains("show");

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen ? this.close() : this.open();
      return;
    }

    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.items.length) {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        this.renderResults(document.getElementById("commandPaletteInput")?.value || "");
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.items.length) {
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
        this.renderResults(document.getElementById("commandPaletteInput")?.value || "");
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this.items[this.selectedIndex]) {
        const item = this.items[this.selectedIndex];
        this.close();
        item.action();
      }
    }
  }
};

function openCommandPalette() {
  CommandPalette.open();
}
window.openCommandPalette = openCommandPalette;
window.CommandPalette = CommandPalette;

/**
 * Slide-Over Quick Inspector Drawer (Context-Preserving Triage)
 */
function openQuickInspectorDrawer(challanId) {
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) {
    navigateTo("challans", true, { id: challanId });
    return;
  }

  const backdrop = document.getElementById("quickInspectorDrawer");
  const body = document.getElementById("quickDrawerBody");
  const title = document.getElementById("quickDrawerTitle");
  const subtitle = document.getElementById("quickDrawerSubtitle");
  const footer = document.getElementById("quickDrawerFooter");
  if (!backdrop || !body) {
    navigateTo("challans", true, { id: challanId });
    return;
  }

  const vehicle = StorageManager.getVehicleById(challan.vehicleId);
  const daysLeft = Utils.getDaysRemaining(challan.dueDate);
  const isOverdue = daysLeft < 0 && challan.status !== "paid";
  const totalPayable = challan.totalPayable || ((challan.amount || 0) + (challan.lateFee || 0) + (challan.convenienceFee !== undefined ? challan.convenienceFee : 25));

  title.textContent = challan.challanNumber;
  subtitle.textContent = `${challan.vehicleReg} • ${vehicle ? vehicle.makeModel : "Commercial Asset"}`;

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid #EBEBEB;">
        <div>
          <div style="font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Statutory Penalty</div>
          <div style="font-size: 28px; font-weight: 500; color: var(--ink); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; margin-top: 2px;">
            ${Utils.formatINR(totalPayable)}
          </div>
        </div>
        <div style="text-align: right;">
          ${Utils.getStatusBadgeHTML(challan.status)}
          <div style="font-size: 11.5px; color: ${isOverdue ? 'var(--status-unassigned)' : 'var(--text-3)'}; margin-top: 6px; font-weight: ${isOverdue ? '600' : '400'};">
            ${isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : `Due ${Utils.formatDate(challan.dueDate)}`}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12.5px;">
        <div>
          <div style="color: var(--text-3); font-size: 11px; margin-bottom: 2px;">Infraction</div>
          <div style="color: var(--ink); font-weight: 500;">${challan.offence}</div>
        </div>
        <div>
          <div style="color: var(--text-3); font-size: 11px; margin-bottom: 2px;">Statutory Section</div>
          <div style="color: var(--ink); font-family: var(--font-family-mono); font-size: 12px;">${challan.mvActSection || "MV Act Sec 183"}</div>
        </div>
        <div>
          <div style="color: var(--text-3); font-size: 11px; margin-bottom: 2px;">Issuing Authority</div>
          <div style="color: var(--ink);">${challan.issuingAuthority || "State Traffic Police"}</div>
        </div>
        <div>
          <div style="color: var(--text-3); font-size: 11px; margin-bottom: 2px;">Attributed Custody</div>
          <div style="color: var(--ink); font-weight: 600;">${challan.responsiblePartyName || challan.responsibleParty || "Unassigned"}</div>
        </div>
      </div>

      <div style="padding: 12px 14px; background: #FAFAFA; border: 1px solid #EBEBEB; border-radius: 8px; font-size: 12px; color: var(--text-2); line-height: 1.5;">
        <strong style="color: var(--ink); display: block; margin-bottom: 4px;">Location &amp; Evidence Metadata</strong>
        ${challan.location || "National Highway ANPR Corridor"} &bull; Recorded ${Utils.formatDate(challan.offenceDate || challan.date, true)}
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn--outline btn--sm" onclick="closeQuickInspectorDrawer(); navigateTo('challans', true, { id: '${challan.id}' });">
      Open Full Case &rarr;
    </button>
    <div style="display: flex; gap: 8px;">
      ${challan.status === "unassigned" ? `
        <button type="button" class="btn btn--primary btn--sm" onclick="closeQuickInspectorDrawer(); openAssignmentModal('${challan.id}');">
          Assign Liability
        </button>
      ` : (challan.status !== "paid" && challan.status !== "court" ? `
        <button type="button" class="btn btn--primary btn--sm" onclick="closeQuickInspectorDrawer(); openPaymentModal('${challan.id}');">
          Settle Fine
        </button>
      ` : "")}
    </div>
  `;

  backdrop.classList.add("show");
}

function closeQuickInspectorDrawer() {
  const backdrop = document.getElementById("quickInspectorDrawer");
  if (backdrop) backdrop.classList.remove("show");
}

window.openQuickInspectorDrawer = openQuickInspectorDrawer;
window.closeQuickInspectorDrawer = closeQuickInspectorDrawer;

document.addEventListener("keydown", (e) => {
  CommandPalette.handleKey(e);
  if (e.key === "Escape") {
    closeQuickInspectorDrawer();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("commandPaletteInput");
  if (input) {
    input.addEventListener("input", () => {
      CommandPalette.selectedIndex = 0;
      CommandPalette.renderResults(input.value);
    });
  }
});
