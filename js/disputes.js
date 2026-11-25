/**
 * ChallanOS - Disputes & Virtual Court Docket Module (js/disputes.js)
 * 
 * Features:
 * - Two distinct compliance streams:
 *     1. Administrative Grievance Disputes (Parivahan / State Police online dispute cell)
 *     2. Virtual Traffic Court Dockets (Special Metropolitan Magistrate judicial compounding)
 * - Strict Judicial Stay Enforcement: If a challan has been referred to Virtual Court and is
 *   awaiting judicial decision, direct Parivahan payment is locked with explicit legal reasoning
 *   to prevent contempt of court or double payment.
 * - Compounding Order Execution: Allows entering court orders reducing statutory fines
 *   (e.g., from ₹20,000 to ₹1,000 compounding penalty) or quashing violations entirely.
 * - Simulated Evidence Upload: Attaches telematics velocity logs, CCTV footage, and duty rosters.
 */

let disputesViewState = {
  activeTab: "all", // "all" | "disputes" | "court"
  searchQuery: ""
};

/**
 * Main Disputes View Renderer
 */
function renderDisputesView(container, actions) {
  const challans = StorageManager.getChallans();
  const disputed = challans.filter(c => c.status === "disputed");
  const courtCases = challans.filter(c => c.status === "court");
  const totalContested = disputed.length + courtCases.length;
  const totalAmountUnderContest = [...disputed, ...courtCases].reduce((sum, c) => sum + (c.amount || 0), 0);

  // Header Actions
  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="Utils.exportToCSV('contested-court-docket.csv', [...disputed, ...courtCases])">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      Export Legal Docket
    </button>
    <button class="btn btn--outline btn--sm" onclick="openEscalateCourtModal()">
      ${Utils.icon('scale', 14)} Escalate to Court
    </button>
    <button class="btn btn--primary btn--sm" onclick="openFileDisputeModal()">
      + Contest New Challan
    </button>
  `;

  // 1. Hairline 4-Column Legal KPI Strip
  const kpiHTML = `
    <div class="editorial-kpi-strip" style="margin-bottom: 24px;">
      <div class="editorial-kpi-cell" onclick="switchDisputeTab('disputes')">
        <div class="editorial-kpi-label"><span>Administrative Grievances</span></div>
        <div class="editorial-kpi-figure" style="color: var(--status-disputed);">${disputed.length}</div>
        <div class="editorial-kpi-sub">Parivahan portal grievances</div>
      </div>

      <div class="editorial-kpi-cell" onclick="switchDisputeTab('court')">
        <div class="editorial-kpi-label"><span>Virtual Court Dockets</span></div>
        <div class="editorial-kpi-figure" style="color: var(--status-court);">${courtCases.length}</div>
        <div class="editorial-kpi-sub">Sub-judice stay lock active</div>
      </div>

      <div class="editorial-kpi-cell" style="cursor: default;">
        <div class="editorial-kpi-label"><span>Contested Value</span></div>
        <div class="editorial-kpi-figure">${Utils.formatINR(totalAmountUnderContest)}</div>
        <div class="editorial-kpi-sub">Penalties under legal dispute</div>
      </div>

      <div class="editorial-kpi-cell" style="cursor: default;">
        <div class="editorial-kpi-label"><span>Compounded / Waived</span></div>
        <div class="editorial-kpi-figure" style="color: var(--status-paid);">₹68,500</div>
        <div class="editorial-kpi-sub">Mitigated via judicial decrees</div>
      </div>
    </div>
  `;

  // 2. Segmented Tabs + Search Toolbar Row
  const tabsHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
      <div class="editorial-tabs" role="tablist" aria-label="Disputes and Court Filter">
        <button class="editorial-tab-btn ${disputesViewState.activeTab === 'all' ? 'active' : ''}" onclick="switchDisputeTab('all')">
          All Contested <span class="editorial-tab-count">${totalContested}</span>
        </button>
        <button class="editorial-tab-btn ${disputesViewState.activeTab === 'disputes' ? 'active' : ''}" onclick="switchDisputeTab('disputes')">
          Grievances <span class="editorial-tab-count">${disputed.length}</span>
        </button>
        <button class="editorial-tab-btn ${disputesViewState.activeTab === 'court' ? 'active' : ''}" onclick="switchDisputeTab('court')">
          Virtual Court <span class="editorial-tab-count">${courtCases.length}</span>
        </button>
      </div>

      <input type="text" class="form-input form-input--search" placeholder="Search challan, reg, case no..." aria-label="Search legal dockets" style="width: 240px; height: 34px; font-size: 12px;" value="${disputesViewState.searchQuery}" oninput="handleDisputesSearch(this.value)">
    </div>
  `;

  // 3. Tab Filtered Data
  let visibleRecords = [...disputed, ...courtCases];
  if (disputesViewState.activeTab === "disputes") visibleRecords = disputed;
  if (disputesViewState.activeTab === "court") visibleRecords = courtCases;

  if (disputesViewState.searchQuery) {
    const q = disputesViewState.searchQuery;
    visibleRecords = visibleRecords.filter(r =>
      r.challanNumber.toLowerCase().includes(q) ||
      r.vehicleReg.toLowerCase().includes(q) ||
      r.offence.toLowerCase().includes(q) ||
      (r.disputeDetails?.authorityDocketNumber && r.disputeDetails.authorityDocketNumber.toLowerCase().includes(q)) ||
      (r.courtDetails?.caseNumber && r.courtDetails.caseNumber.toLowerCase().includes(q))
    );
  }

  const tableHTML = `
    <!-- Judicial Stay Notice -->
    <div style="background: rgba(180, 83, 9, 0.05); border: 1px solid rgba(180, 83, 9, 0.2); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
      <span style="color: var(--status-pending); display: flex; align-items: center;">${Utils.icon('scale', 16)}</span>
      <div style="font-size: 12px; color: var(--ink); line-height: 1.45;">
        <strong>Sub-Judice Statutory Stay Guard Active:</strong> Contested notices under Special Metropolitan Magistrate review maintain active legal stay. Direct Parivahan settlement is locked to prevent contempt of court or double payment.
      </div>
    </div>

    <div style="overflow-x: auto; border-top: 1px solid #EBEBEB;">
      <table class="data-table" style="width: 100%; min-width: 960px;">
        <thead>
          <tr>
            <th>Challan & Case Ref</th>
            <th>Vehicle Asset</th>
            <th>Contestation Ground / Court</th>
            <th>Penalty Amount</th>
            <th>Deadline / Hearing</th>
            <th style="text-align: right; min-width: 140px; padding-right: 20px;">Status & Action</th>
          </tr>
        </thead>
        <tbody>
          ${renderDisputeTableRows(visibleRecords)}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = `<div class="view-enter">${kpiHTML}${tabsHTML}${tableHTML}</div>`;
}

/**
 * Render Rows for Legal & Contests Table
 */
function renderDisputeTableRows(records) {
  if (!records || records.length === 0) {
    return `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px;">
          <div class="empty-state">
            <div class="empty-state-title">No Contested Infractions in this View</div>
            <div class="empty-state-text">All fleet infractions are currently uncontested or settled.</div>
          </div>
        </td>
      </tr>
    `;
  }

  return records.map(c => {
    const isCourt = c.status === "court";
    const caseRef = isCourt
      ? (c.courtDetails?.caseNumber || `DLCT01-002931-2026`)
      : (c.disputeDetails?.ticketRef || `DISP-PARIVAHAN-${c.id.replace('chl-', '448')}`);

    const ground = isCourt
      ? `Virtual Court (${c.courtDetails?.courtJurisdiction || c.courtDetails?.courtName || 'Patiala House Court'})`
      : (c.disputeDetails?.reason || "Incorrect speed radar calibration & vehicle visual mismatch");

    const evidenceFile = c.disputeDetails?.evidenceFile || "telematics-gps-log.pdf";
    const deadlineStr = c.courtDetails?.hearingDate || c.disputeDeadline || c.dueDate;
    const daysLeft = Utils.getDaysRemaining(deadlineStr);

    return `
      <tr class="row-interactive" onclick="if(!event.target.closest('button') && !event.target.closest('a')) navigateTo('challans', true, { id: '${c.id}' })" title="Click to view contested notice details">
        <td>
          <a href="#challans?id=${c.id}" class="text-primary font-mono" style="font-weight: 600; text-decoration: none; font-size: 13px;">
            ${c.challanNumber}
          </a>
          <div class="font-mono text-xs text-muted" style="margin-top: 2px;">
            ${caseRef}
          </div>
        </td>
        <td>
          <span class="plate-chip plate-chip--commercial font-mono font-bold">${c.vehicleReg}</span>
          <div class="text-xs text-muted cell-truncate" style="max-width: 190px; margin-top: 2px;" title="${c.offence}">${c.offence}</div>
        </td>
        <td>
          <div class="cell-truncate" style="font-size: 12px; font-weight: 500;" title="${ground}">${ground}</div>
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
            <span class="text-xs text-muted">${c.issuingAuthority} •</span>
            <span class="text-xs font-mono" style="color: var(--color-primary);">${evidenceFile}</span>
          </div>
        </td>
        <td>
          <strong class="amount-cell" style="font-size: 16px; font-weight: 700; color: var(--ink); white-space: nowrap; font-variant-numeric: tabular-nums;">${Utils.formatINR(c.amount)}</strong>
        </td>
        <td>
          <div style="font-size: 13px; font-weight: 500;">${Utils.formatDate(deadlineStr)}</div>
          <span class="text-xs font-semibold" style="color: ${daysLeft < 3 ? 'var(--status-unassigned)' : 'var(--color-primary)'};">
            ${daysLeft < 0 ? 'Hearing Overdue' : `${daysLeft} days left`}
          </span>
        </td>
        <td style="text-align: right; padding-right: 20px;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            ${isCourt ? `
              <span class="badge badge--court" title="Settlement locked pending judicial compounding decree" style="display: inline-flex; align-items: center; gap: 5px;">
                ${Utils.icon('lock', 12)} Court Stay
              </span>
              <button class="btn btn--outline btn--sm" style="height: 32px; padding: 0 14px; font-size: 12px; font-weight: 600;" onclick="openCourtCaseModal('${c.id}')" title="Record court compounding judgment outcome">
                Order
              </button>
            ` : `
              <span class="badge badge--pending">In Review</span>
              <button class="btn btn--outline btn--sm" style="height: 32px; padding: 0 14px; font-size: 12px; font-weight: 600;" onclick="openSimulateAuthorityModal('${c.id}')" title="Simulate Parivahan grievance authority ruling">
                Ruling
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * Switch Dispute Tab
 */
function switchDisputeTab(tabKey) {
  disputesViewState.activeTab = tabKey;
  renderDisputesView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.switchDisputeTab = switchDisputeTab;

/**
 * Handle Search
 */
function handleDisputesSearch(q) {
  disputesViewState.searchQuery = q.toLowerCase().trim();
  renderDisputesView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.handleDisputesSearch = handleDisputesSearch;

/**
 * Open Modal to Contest Challan (#fileDisputeModal)
 */
function openFileDisputeModal(challanId = null) {
  if (StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canDispute", "Administrative Contests")) {
    return;
  }

  const challans = StorageManager.getChallans();
  const targetChallan = challanId
    ? StorageManager.getChallanById(challanId)
    : challans.find(c => c.status !== 'paid' && c.status !== 'court');

  if (!targetChallan) {
    Utils.showToast("No Eligible Challan", "Select an open challan to raise a contest.", "warning");
    return;
  }

  const modal = document.getElementById("fileDisputeModal");
  if (modal) {
    document.getElementById("disputeModalChallanNo").textContent = targetChallan.challanNumber;
    document.getElementById("disputeModalVehicle").textContent = targetChallan.vehicleReg;
    document.getElementById("disputeModalOffence").textContent = `${targetChallan.offence} (${targetChallan.mvActSection || 'Sec 183'})`;
    document.getElementById("disputeModalAmount").textContent = Utils.formatINR(targetChallan.amount);
    document.getElementById("disputeModalChallanId").value = targetChallan.id;

    const deadline = targetChallan.disputeDeadline || targetChallan.dueDate || "2026-03-31";
    document.getElementById("disputeDeadlineDisplay").textContent = `Contest Window: ${Utils.formatDate(deadline)}`;

    // Reset notes and evidence
    document.getElementById("disputeNotesInput").value = "Telematics GPS velocity log verifies vehicle remained below 48 km/h. Camera speed radar calibration discrepancy cited.";
    document.getElementById("disputeEvidenceFilename").textContent = "telematics-gps-speed-log.pdf";
    document.getElementById("disputeEvidenceUploadedFile").value = "telematics-gps-speed-log.pdf";

    Utils.openModal("fileDisputeModal");
  }
}
window.openFileDisputeModal = openFileDisputeModal;
window.openDisputeModal = openFileDisputeModal;

/**
 * Simulate Evidence File Attachment
 */
function simulateEvidenceUpload() {
  const options = [
    "telematics-gps-speed-log.pdf",
    "dashcam-cctv-still-frame.jpg",
    "emergency-ambulance-yielding-telemetry.csv",
    "commercial-contract-clause-indemnity.pdf",
    "anpr-number-plate-comparison.png"
  ];
  const current = document.getElementById("disputeEvidenceUploadedFile").value;
  const next = options[(options.indexOf(current) + 1) % options.length];

  document.getElementById("disputeEvidenceFilename").textContent = next;
  document.getElementById("disputeEvidenceUploadedFile").value = next;
  Utils.showToast("Evidence Attached", `Loaded evidentiary file: ${next}`, "info");
}
window.simulateEvidenceUpload = simulateEvidenceUpload;

/**
 * Submit Administrative Dispute
 */
function submitDisputeContest(challanId, ground) {
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const evidenceFile = document.getElementById("disputeEvidenceUploadedFile")?.value || "telematics-gps-speed-log.pdf";
  const notes = document.getElementById("disputeNotesInput")?.value || "Administrative contest filed with telematics evidence";

  const result = StorageManager.raiseDispute(challanId, {
    reason: ground || "Disputed on Parivahan grievance portal",
    evidenceFile: evidenceFile,
    notes: notes
  });

  Utils.closeModal("fileDisputeModal");
  Utils.showToast("Dispute Filed", `Grievance ticket logged with Parivahan Traffic Cell. Fine collection frozen.`, "info");

  if (typeof navigateTo === 'function') {
    const currentHash = window.location.hash || "";
    if (currentHash.includes("disputes")) {
      renderDisputesView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
    } else {
      navigateTo("disputes");
    }
  }
}
window.submitDisputeContest = submitDisputeContest;

/**
 * Simulate Authority Decision for Administrative Grievance
 */
function openSimulateAuthorityModal(challanId) {
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const proceed = confirm(
    `Parivahan Authority Grievance Review Simulation:\n\n` +
    `Challan: ${challan.challanNumber} (${challan.vehicleReg})\n` +
    `Penalty: ₹${challan.amount}\n\n` +
    `Click OK to simulate AUTHORITY APPROVAL (Fine waived & cancelled to ₹0).\n` +
    `Click CANCEL to simulate AUTHORITY REJECTION (Fine confirmed payable).`
  );

  if (proceed) {
    StorageManager.resolveDispute(challanId, "APPROVED_WAIVED", "DSP Traffic Cell: CCTV verified emergency ambulance yield. Infraction cancelled and waived.");
    Utils.showToast("Dispute Accepted by Authority", `Fine of ₹${challan.amount} cancelled and quashed.`, "success");
  } else {
    StorageManager.resolveDispute(challanId, "REJECTED", "DSP Traffic Cell: Speed calibration logs verified valid. Contestation rejected. Penalty upheld.");
    Utils.showToast("Dispute Rejected by Authority", `Fine of ₹${challan.amount} confirmed payable.`, "warning");
  }

  renderDisputesView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.openSimulateAuthorityModal = openSimulateAuthorityModal;

/**
 * Open Court Case Modal (#courtModal)
 */
function openCourtCaseModal(challanId) {
  if (StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canCourt", "Virtual Court Compounding")) {
    return;
  }

  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const modal = document.getElementById("courtModal");
  if (!modal) return;

  document.getElementById("courtModalChallanId").value = challan.id;
  document.getElementById("courtModalCaseRef").textContent = challan.courtDetails?.caseNumber || "DLCT01-002931-2026";
  document.getElementById("courtModalChallanDisplay").textContent = `${challan.challanNumber} (${challan.vehicleReg})`;
  document.getElementById("courtModalOriginalFine").textContent = Utils.formatINR(challan.amount);
  document.getElementById("courtModalBench").textContent = challan.courtDetails?.courtJurisdiction || challan.courtDetails?.courtName || "Virtual Traffic Court, Tis Hazari";
  document.getElementById("courtModalHearingDate").textContent = Utils.formatDate(challan.courtDetails?.hearingDate || "2026-04-18");
  document.getElementById("courtModalCounsel").textContent = challan.courtDetails?.legalCounsel || "Adv. Meenakshi Sundaram (Chamber 402, High Court Bar)";

  // Defaults
  document.getElementById("courtOrderOutcomeSelect").value = "COMPOUNDED";
  document.getElementById("courtCompoundedAmountInput").value = Math.min(1000, Math.floor(challan.amount / 5));
  document.getElementById("courtOrderRefInput").value = `ORDER-VC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  document.getElementById("courtOrderNotesInput").value = "Special Metropolitan Magistrate: First offence compounding granted. Fine mitigated upon vehicle telematics submission.";
  document.getElementById("courtCompoundedAmountContainer").style.display = "grid";

  // Real-Time Compounding Math Update
  updateCompoundingCalculation();

  Utils.openModal("courtModal");
}
window.openCourtCaseModal = openCourtCaseModal;
window.openResolveCourtModal = openCourtCaseModal;

/**
 * Real-Time Judicial Compounding Math Calculation (UI Designer + Usability Psychologist)
 */
function updateCompoundingCalculation() {
  const challanId = document.getElementById("courtModalChallanId")?.value;
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const originalFine = challan.amount || 1000;
  const outcome = document.getElementById("courtOrderOutcomeSelect")?.value || "COMPOUNDED";
  const savingsText = document.getElementById("courtCompoundingSavingsText");
  const savingsPill = document.getElementById("courtCompoundingReductionPill");
  if (!savingsText || !savingsPill) return;

  if (outcome === "DISMISSED") {
    savingsText.textContent = "Case Dismissed / Quashed: 100% fine waived by judicial decree";
    savingsPill.textContent = `Full Waiver (${Utils.formatINR(originalFine)})`;
    savingsPill.className = "badge badge--paid";
    return;
  }

  if (outcome === "UPHELD") {
    savingsText.textContent = "Statutory Fine Upheld: No compounding reduction applied";
    savingsPill.textContent = "₹0 Saved";
    savingsPill.className = "badge badge--unassigned";
    return;
  }

  const inputEl = document.getElementById("courtCompoundedAmountInput");
  const decreedAmount = parseFloat(inputEl?.value) || 0;
  const savings = Math.max(0, originalFine - decreedAmount);
  const percentage = originalFine > 0 ? Math.round((savings / originalFine) * 100) : 0;

  savingsText.innerHTML = `Compounding Savings: <strong>${Utils.formatINR(savings)}</strong> (${Utils.formatINR(originalFine)} &rarr; ${Utils.formatINR(decreedAmount)})`;
  savingsPill.textContent = `${percentage}% Compounded`;
  savingsPill.className = percentage > 0 ? "badge badge--paid" : "badge badge--unassigned";
}
window.updateCompoundingCalculation = updateCompoundingCalculation;

/**
 * Handle Court Outcome Dropdown Change
 */
function handleCourtOutcomeChange(outcome) {
  const container = document.getElementById("courtCompoundedAmountContainer");
  if (outcome === "COMPOUNDED") {
    container.style.display = "grid";
  } else {
    container.style.display = "none";
  }
  updateCompoundingCalculation();
}
window.handleCourtOutcomeChange = handleCourtOutcomeChange;

/**
 * Submit Court Order Resolution
 */
function submitCourtOrderResolution() {
  const challanId = document.getElementById("courtModalChallanId").value;
  const outcome = document.getElementById("courtOrderOutcomeSelect").value;
  const compoundedAmt = parseFloat(document.getElementById("courtCompoundedAmountInput").value) || 500;
  const orderRef = document.getElementById("courtOrderRefInput").value || `ORDER-VC-${Date.now()}`;
  const notes = document.getElementById("courtOrderNotesInput").value || "Judicial order entered.";

  StorageManager.resolveCourtCase(challanId, {
    outcome: outcome,
    compoundedAmount: compoundedAmt,
    courtOrder: orderRef,
    notes: notes
  });

  Utils.closeModal("courtModal");

  if (outcome === "COMPOUNDED") {
    Utils.showToast("Court Order Recorded", `Fine compounded to ${Utils.formatINR(compoundedAmt)}. Court stay lifted; online payment unlocked.`, "success");
  } else if (outcome === "DISMISSED") {
    Utils.showToast("Case Dismissed", `Case acquitted by judicial order ${orderRef}. Fine quashed to ₹0.`, "success");
  } else {
    Utils.showToast("Court Order: Upheld", `Full statutory fine upheld. Payment unlocked.`, "warning");
  }

  renderDisputesView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.submitCourtOrderResolution = submitCourtOrderResolution;

/**
 * Escalate an open challan to Virtual Court
 */
function openEscalateCourtModal() {
  const challans = StorageManager.getChallans();
  const eligible = challans.find(c => c.status === "assigned" || c.status === "pending" || c.status === "disputed");
  if (!eligible) {
    Utils.showToast("No Eligible Challan", "No open challans available to escalate.", "warning");
    return;
  }

  const caseNo = `DLCT01-${Math.floor(100000 + Math.random() * 900000)}-2026`;
  const courtName = "Virtual Traffic Court, Tis Hazari, Delhi";
  const hearingDate = "2026-04-24";

  StorageManager.createCourtCase(eligible.id, {
    caseNumber: caseNo,
    courtName: courtName,
    hearingDate: hearingDate,
    notes: "Summons received via Parivahan e-Court integration. Direct payment locked pending compounding."
  });

  Utils.showToast("Escalated to Court", `Challan ${eligible.challanNumber} referred to Virtual Court (${caseNo}). Payment stay activated.`, "info");
  renderDisputesView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.openEscalateCourtModal = openEscalateCourtModal;
