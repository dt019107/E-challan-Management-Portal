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
      ⚖️ Escalate to Court
    </button>
    <button class="btn btn--primary btn--sm" onclick="openFileDisputeModal()">
      + Contest New Challan
    </button>
  `;

  // 1. Legal & Court KPIs
  const kpiHTML = `
    <div class="kpi-grid">
      <div class="kpi-card" onclick="switchDisputeTab('disputes')">
        <div class="kpi-card-top">
          <span class="kpi-label">Administrative Grievances</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-disputed-bg); color: var(--status-disputed);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-disputed);">${disputed.length}</div>
        <div class="kpi-subtext">Filed on Parivahan grievance cell</div>
      </div>

      <div class="kpi-card" onclick="switchDisputeTab('court')">
        <div class="kpi-card-top">
          <span class="kpi-label">Virtual Court Dockets</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-court-bg); color: var(--status-court);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-court);">${courtCases.length}</div>
        <div class="kpi-subtext">Sub-judice stay active awaiting order</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card-top">
          <span class="kpi-label">Contested Value</span>
          <div class="kpi-icon-wrapper" style="background: #FEF3F2; color: #B42318;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </div>
        <div class="kpi-value">${Utils.formatINR(totalAmountUnderContest)}</div>
        <div class="kpi-subtext">Statutory penalties under challenge</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card-top">
          <span class="kpi-label">Compounded / Waived</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-paid-bg); color: var(--status-paid);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-paid);">₹68,500</div>
        <div class="kpi-subtext">Fines waived or reduced via judicial orders</div>
      </div>
    </div>
  `;

  // 2. Tab Navigation
  const tabsHTML = `
    <div class="nav-tabs" style="margin-top: var(--space-6);">
      <button class="nav-tab ${disputesViewState.activeTab === 'all' ? 'active' : ''}" onclick="switchDisputeTab('all')">
        All Contested Matters (${totalContested})
      </button>
      <button class="nav-tab ${disputesViewState.activeTab === 'disputes' ? 'active' : ''}" onclick="switchDisputeTab('disputes')">
        Administrative Grievances (${disputed.length})
      </button>
      <button class="nav-tab ${disputesViewState.activeTab === 'court' ? 'active' : ''}" onclick="switchDisputeTab('court')">
        Virtual Court Dockets (${courtCases.length})
      </button>
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
    <div class="card" style="margin-top: var(--space-4);">
      <div class="card-header" style="flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <div class="card-title">Legal Dockets & Administrative Contests</div>
          <div class="card-subtitle">Track Parivahan grievance responses, evidence dossiers, and Virtual Court compounding hearings</div>
        </div>

        <input type="text" class="form-input form-input--search" placeholder="Search challan, reg, case no..." style="width: 260px;" oninput="handleDisputesSearch(this.value)">
      </div>

      <div class="card-body" style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Challan / Case Ref</th>
              <th>Vehicle Asset</th>
              <th>Contestation Ground / Court Bench</th>
              <th>Penalty Amount</th>
              <th>Evidence Attached</th>
              <th>Deadline / Hearing Date</th>
              <th>Status</th>
              <th>Payment Gate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${renderDisputeTableRows(visibleRecords)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = kpiHTML + tabsHTML + tableHTML;
}

/**
 * Render Rows for Legal & Contests Table
 */
function renderDisputeTableRows(records) {
  if (!records || records.length === 0) {
    return `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px;">
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
      <tr>
        <td>
          <a href="#challans?id=${c.id}" class="text-primary font-mono" style="font-weight: 600; text-decoration: none; font-size: 13px;">
            ${c.challanNumber}
          </a>
          <div style="font-family: var(--font-family-mono); font-size: 10.5px; color: var(--text-3); margin-top: 2px;">
            ${caseRef}
          </div>
        </td>
        <td style="white-space: nowrap;">
          <div style="margin-bottom: 4px;">
            <span class="plate-chip plate-chip--commercial">${c.vehicleReg}</span>
          </div>
          <div class="text-xs text-muted" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.offence}</div>
        </td>
        <td>
          <div style="font-size: 13px; font-weight: 500;">${ground}</div>
          <div class="text-xs text-muted" style="margin-top: 2px;">Authority: ${c.issuingAuthority}</div>
        </td>
        <td>
          <strong style="font-size: 14px;">${Utils.formatINR(c.amount)}</strong>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span class="text-xs font-mono" style="color: var(--color-primary);">${evidenceFile}</span>
          </div>
        </td>
        <td>
          <div><strong>${Utils.formatDate(deadlineStr)}</strong></div>
          <span class="text-xs" style="color: ${daysLeft < 3 ? 'var(--status-unassigned)' : 'var(--color-primary)'}; font-weight: 600;">
            ${daysLeft < 0 ? 'Hearing Overdue' : `${daysLeft} days remaining`}
          </span>
        </td>
        <td>
          ${Utils.getStatusBadgeHTML(c.status)}
        </td>
        <td>
          ${isCourt ? `
            <span class="badge badge--unassigned" title="Direct settlement locked pending court compounding decree" style="cursor: help;">
              🔒 Locked: Court Stay
            </span>
          ` : `
            <span class="badge badge--pending">
              In Review
            </span>
          `}
        </td>
        <td>
          <div style="display: flex; gap: 4px;">
            ${isCourt ? `
              <button class="btn btn--outline btn--sm" onclick="openCourtCaseModal('${c.id}')" title="Record court compounding judgment outcome">
                Record Order
              </button>
            ` : `
              <button class="btn btn--outline btn--sm" onclick="openSimulateAuthorityModal('${c.id}')" title="Simulate Parivahan grievance authority ruling">
                Authority Ruling
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
  Utils.showToast("Evidence Attached (SIMULATED)", `Loaded evidentiary file: ${next}`, "info");
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
  Utils.showToast("Dispute Filed (SIMULATED)", `Grievance ticket logged with Parivahan Traffic Cell. Fine collection frozen.`, "info");

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

  Utils.openModal("courtModal");
}
window.openCourtCaseModal = openCourtCaseModal;
window.openResolveCourtModal = openCourtCaseModal;

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
