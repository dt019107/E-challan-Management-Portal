/**
 * ChallanOS - Payments & Recovery Management Module (js/payments.js)
 * 
 * Core Architectural Principle:
 * "Payer is separate from Responsible Party."
 * Apex Fleet settles fines directly with Parivahan / State Traffic Police to protect asset
 * registration and prevent vehicle blacklisting, then tracks downstream financial recovery:
 *   1. Driver liability -> Payroll deduction (payslip hold)
 *   2. Lessee liability -> Monthly corporate leasing invoice
 *   3. Fleet statutory lapses / disputes -> Write-off / Operational expense absorption
 * 
 * Features:
 * - Full Simulation Mode: Success, Failure (with Retry), and Pending Confirmation (with Bank Reconciliation)
 * - Judicial Stay Guard: Prevents settlement if a challan is active before Virtual Traffic Court
 * - Recovery Ledger: Granular lifecycle tracking (Queued, Deducted, Invoiced, Written Off)
 * - Official Printable / Downloadable Receipt Voucher (with DEMO/SIMULATION seal)
 */

let paymentsViewState = {
  activeTab: "settlements", // "settlements" | "recovery" | "pending"
  searchQuery: "",
  recoveryFilter: "all"
};

/**
 * Main View Renderer
 */
function renderPaymentsView(container, actions) {
  const challans = StorageManager.getChallans();
  const paidChallans = challans.filter(c => c.status === "paid" || c.paymentStatus === "Paid");
  const pendingChallans = challans.filter(c => c.paymentStatus === "Pending Confirmation");
  const recoveries = StorageManager.getRecoveries();

  const totalSettledAmount = paidChallans.reduce((sum, c) => sum + (c.totalPayable || c.amount || 0), 0);
  const pendingPayrollAmount = recoveries
    .filter(r => r.recoveryMethod === "Payroll deduction" && r.recoveryStatus !== "Deducted")
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const invoicedLesseeAmount = recoveries
    .filter(r => r.recoveryMethod === "Invoice")
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const writtenOffAmount = recoveries
    .filter(r => r.recoveryMethod === "Write-off" || r.recoveryStatus === "Written Off")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  // Header action buttons
  actions.innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="exportPaymentsRecoveryCSV()">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      Export Financial Ledger
    </button>
    <button class="btn btn--primary btn--sm" onclick="openPaymentModal('${challans.find(c => c.status !== 'paid' && c.status !== 'court')?.id || 'chl-101'}')">
      + Settle Pending Challan
    </button>
  `;

  // 1. KPI Metric Cards
  const kpiHTML = `
    <div class="kpi-grid">
      <div class="kpi-card" onclick="switchPaymentsTab('settlements')">
        <div class="kpi-card-top">
          <span class="kpi-label">Settled YTD (Direct)</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-paid-bg); color: var(--status-paid);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>
        <div class="kpi-value">${Utils.formatINR(totalSettledAmount)}</div>
        <div class="kpi-subtext">Across ${paidChallans.length} settled infraction receipts</div>
      </div>

      <div class="kpi-card" onclick="switchPaymentsTab('recovery')">
        <div class="kpi-card-top">
          <span class="kpi-label">Pending Recovery (Payroll)</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-pending-bg); color: var(--status-pending);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-pending);">${Utils.formatINR(pendingPayrollAmount)}</div>
        <div class="kpi-subtext">Queued for driver salary deduction</div>
      </div>

      <div class="kpi-card" onclick="switchPaymentsTab('recovery')">
        <div class="kpi-card-top">
          <span class="kpi-label">Corporate Invoiced (Lessee)</span>
          <div class="kpi-icon-wrapper" style="background: var(--status-assigned-bg); color: var(--status-assigned);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--status-assigned);">${Utils.formatINR(invoicedLesseeAmount)}</div>
        <div class="kpi-subtext">Included in lessee monthly billing</div>
      </div>

      <div class="kpi-card" onclick="switchPaymentsTab('recovery')">
        <div class="kpi-card-top">
          <span class="kpi-label">Fleet Absorbed / Written-Off</span>
          <div class="kpi-icon-wrapper" style="background: var(--color-bg-app); color: var(--color-text-muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
        </div>
        <div class="kpi-value">${Utils.formatINR(writtenOffAmount)}</div>
        <div class="kpi-subtext">Operational paperwork / fine waivers</div>
      </div>
    </div>
  `;

  // 2. Tab Navigation
  const tabsHTML = `
    <div class="nav-tabs" style="margin-top: var(--space-6);">
      <button class="nav-tab ${paymentsViewState.activeTab === 'settlements' ? 'active' : ''}" onclick="switchPaymentsTab('settlements')">
        Settlement Receipts (${paidChallans.length})
      </button>
      <button class="nav-tab ${paymentsViewState.activeTab === 'recovery' ? 'active' : ''}" onclick="switchPaymentsTab('recovery')">
        Recovery Ledger (${recoveries.length})
      </button>
      <button class="nav-tab ${paymentsViewState.activeTab === 'pending' ? 'active' : ''}" onclick="switchPaymentsTab('pending')">
        Pending Confirmation (${pendingChallans.length})
      </button>
    </div>
  `;

  // 3. Tab Content
  let contentHTML = "";
  if (paymentsViewState.activeTab === "settlements") {
    contentHTML = renderSettlementsTabHTML(paidChallans);
  } else if (paymentsViewState.activeTab === "recovery") {
    contentHTML = renderRecoveryLedgerTabHTML(recoveries);
  } else {
    contentHTML = renderPendingConfirmationTabHTML(pendingChallans);
  }

  container.innerHTML = kpiHTML + tabsHTML + contentHTML;
}

/**
 * Switch Sub-Tab
 */
function switchPaymentsTab(tabKey) {
  paymentsViewState.activeTab = tabKey;
  renderPaymentsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.switchPaymentsTab = switchPaymentsTab;

/**
 * Render Settlements Receipts Tab
 */
function renderSettlementsTabHTML(paidChallans) {
  let records = paidChallans;
  if (paymentsViewState.searchQuery) {
    const q = paymentsViewState.searchQuery;
    records = records.filter(c =>
      (c.receiptNumber && c.receiptNumber.toLowerCase().includes(q)) ||
      c.challanNumber.toLowerCase().includes(q) ||
      c.vehicleReg.toLowerCase().includes(q) ||
      (c.transactionReference && c.transactionReference.toLowerCase().includes(q))
    );
  }

  return `
    <div class="card" style="margin-top: var(--space-4);">
      <div class="card-header" style="flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <div class="card-title">Settlement Vouchers & Direct Receipts</div>
          <div class="card-subtitle">Official verified Parivahan settlement records with printable audit receipts</div>
        </div>

        <input type="text" class="form-input form-input--search" placeholder="Search receipt, challan, vehicle, txn..." style="width: 280px;" oninput="handlePaymentsSearch(this.value)">
      </div>

      <div class="card-body" style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Receipt / Voucher</th>
              <th>Challan No</th>
              <th>Vehicle Asset</th>
              <th>Settled Amount</th>
              <th>Payment Rail</th>
              <th>Transaction Ref</th>
              <th>Payer Entity</th>
              <th>Recovery Target</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.length === 0 ? `
              <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                  <div class="empty-state">
                    <div class="empty-state-title">No Settlement Receipts Found</div>
                    <div class="empty-state-text">Settle an open challan to generate official settlement vouchers.</div>
                  </div>
                </td>
              </tr>
            ` : records.map(c => {
              const receiptNo = c.receiptNumber || `RCPT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
              const txnRef = c.transactionReference || `TXN-PARIVAHAN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
              return `
                <tr>
                  <td>
                    <strong style="color: var(--color-primary); cursor: pointer;" onclick="openReceiptModal('${c.id}')">
                      ${receiptNo}
                    </strong>
                    <div class="text-xs text-muted">${Utils.formatDate(c.paymentDate || c.offenceDate, true)}</div>
                  </td>
                  <td>
                    <strong>${c.challanNumber}</strong>
                    <div class="text-xs text-muted">${c.offence}</div>
                  </td>
                  <td>
                    <span class="plate-chip plate-chip--commercial">${c.vehicleReg}</span>
                  </td>
                  <td>
                    <strong style="font-size: 14px;">${Utils.formatINR(c.totalPayable || c.amount)}</strong>
                    <div class="text-xs text-muted">Incl. ₹${c.convenienceFee || 25} fee</div>
                  </td>
                  <td>
                    <span class="badge badge--neutral">${c.paymentMethod || 'UPI'}</span>
                  </td>
                  <td>
                    <span class="font-mono text-xs text-muted">${txnRef}</span>
                  </td>
                  <td>
                    <div style="font-size: 12px; font-weight: 600;">${c.payerType || 'Apex Fleet Pvt Ltd'}</div>
                    <div class="text-xs text-muted">Direct Settlement</div>
                  </td>
                  <td>
                    <div style="font-size: 12px; font-weight: 600;">${c.recoveryParty || c.responsiblePartyName || 'Rahul Sharma'}</div>
                    <span class="badge ${c.responsibleParty === 'Driver' ? 'badge--assigned' : 'badge--pending'}">
                      ${c.recoveryMethod || (c.responsibleParty === 'Driver' ? 'Payroll deduction' : 'Invoice')}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge--paid">✓ Settled</span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 4px;">
                      <button class="btn btn--outline btn--sm" onclick="openReceiptModal('${c.id}')" title="View receipt voucher modal">
                        View
                      </button>
                      <button class="btn btn--ghost btn--icon btn--sm" onclick="downloadReceiptVoucher('${c.id}')" title="Download text voucher">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
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

/**
 * Render Recovery Ledger Tab
 */
function renderRecoveryLedgerTabHTML(recoveries) {
  let records = recoveries;
  if (paymentsViewState.recoveryFilter !== "all") {
    records = records.filter(r => r.recoveryMethod === paymentsViewState.recoveryFilter);
  }
  if (paymentsViewState.searchQuery) {
    const q = paymentsViewState.searchQuery;
    records = records.filter(r =>
      r.challanNumber.toLowerCase().includes(q) ||
      r.vehicleReg.toLowerCase().includes(q) ||
      r.responsiblePartyName.toLowerCase().includes(q) ||
      (r.cycleRef && r.cycleRef.toLowerCase().includes(q))
    );
  }

  return `
    <div class="card" style="margin-top: var(--space-4);">
      <div class="card-header" style="flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <div class="card-title">Financial Recovery Ledger</div>
          <div class="card-subtitle">Enforces strict separation of Payer (Apex Fleet) from Recovery Target (Driver / Lessee)</div>
        </div>

        <div style="display: flex; gap: var(--space-2); align-items: center;">
          <input type="text" class="form-input form-input--search" placeholder="Search target, reg, ref..." style="width: 220px;" oninput="handlePaymentsSearch(this.value)">
          <select class="form-select" style="width: 190px;" onchange="handlePaymentsRecoveryFilter(this.value)">
            <option value="all" ${paymentsViewState.recoveryFilter === 'all' ? 'selected' : ''}>All Recovery Channels</option>
            <option value="Payroll deduction" ${paymentsViewState.recoveryFilter === 'Payroll deduction' ? 'selected' : ''}>Payroll Deduction (Driver)</option>
            <option value="Invoice" ${paymentsViewState.recoveryFilter === 'Invoice' ? 'selected' : ''}>Corporate Invoice (Lessee)</option>
            <option value="Write-off" ${paymentsViewState.recoveryFilter === 'Write-off' ? 'selected' : ''}>Write-off (Fleet Absorbed)</option>
          </select>
        </div>
      </div>

      <div class="card-body" style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Recovery ID</th>
              <th>Challan & Vehicle</th>
              <th>Upfront Payer</th>
              <th>Recovery Target</th>
              <th>Channel</th>
              <th>Billing / Payroll Cycle</th>
              <th>Recoverable Amount</th>
              <th>Recovery Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                  <div class="empty-state">
                    <div class="empty-state-title">No Recovery Records Found</div>
                    <div class="empty-state-text">Settled challans generate recovery ledger records automatically.</div>
                  </div>
                </td>
              </tr>
            ` : records.map(r => {
              const isPayroll = r.recoveryMethod === "Payroll deduction";
              const isInvoice = r.recoveryMethod === "Invoice";
              const isWriteOff = r.recoveryMethod === "Write-off";

              let statusBadge = `<span class="badge badge--pending">Queued</span>`;
              if (r.recoveryStatus === "Deducted" || r.recoveryStatus === "Settled") {
                statusBadge = `<span class="badge badge--paid">✓ Deducted</span>`;
              } else if (r.recoveryStatus === "Invoiced") {
                statusBadge = `<span class="badge badge--assigned">✓ Invoiced</span>`;
              } else if (r.recoveryStatus === "Written Off") {
                statusBadge = `<span class="badge badge--neutral">Written Off</span>`;
              }

              return `
                <tr>
                  <td>
                    <strong class="font-mono text-xs" style="color: var(--color-primary);">${r.id}</strong>
                    <div class="text-xs text-muted">${Utils.formatDate(r.createdAt)}</div>
                  </td>
                  <td>
                    <strong>${r.challanNumber}</strong>
                    <div style="margin-top: 3px;">
                      <span class="plate-chip plate-chip--commercial">${r.vehicleReg}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 12px; font-weight: 600;">${r.payer || 'Apex Fleet Pvt Ltd'}</div>
                    <div class="text-xs text-muted">Liquidity Provider</div>
                  </td>
                  <td>
                    <div style="font-size: 13px; font-weight: 600;">${r.responsiblePartyName}</div>
                    <span class="badge ${r.responsibleParty === 'Driver' ? 'badge--assigned' : 'badge--neutral'}">${r.responsibleParty}</span>
                  </td>
                  <td>
                    <span class="text-xs font-medium">${r.recoveryMethod}</span>
                  </td>
                  <td>
                    <span class="font-mono text-xs text-muted">${r.cycleRef || 'Nov 2026'}</span>
                  </td>
                  <td>
                    <strong style="font-size: 14px;">${Utils.formatINR(r.amount)}</strong>
                  </td>
                  <td>
                    ${statusBadge}
                  </td>
                  <td>
                    <div style="display: flex; gap: 4px;">
                      ${isPayroll && r.recoveryStatus !== 'Deducted' ? `
                        <button class="btn btn--outline btn--sm" onclick="handleRecoveryAction('${r.id}', 'DEDUCT')" title="Process payroll deduction">
                          Deduct
                        </button>
                      ` : ''}
                      ${isInvoice && r.recoveryStatus !== 'Invoiced' ? `
                        <button class="btn btn--outline btn--sm" onclick="handleRecoveryAction('${r.id}', 'INVOICE')" title="Append to lessee invoice">
                          Invoice
                        </button>
                      ` : ''}
                      ${!isWriteOff && r.recoveryStatus !== 'Written Off' && r.recoveryStatus !== 'Deducted' && r.recoveryStatus !== 'Invoiced' ? `
                        <button class="btn btn--ghost btn--sm" style="color: var(--status-unassigned);" onclick="handleRecoveryAction('${r.id}', 'WRITEOFF')" title="Approve operational write-off">
                          Write-off
                        </button>
                      ` : ''}
                      ${(r.recoveryStatus === 'Deducted' || r.recoveryStatus === 'Invoiced' || r.recoveryStatus === 'Written Off') ? `
                        <span class="text-xs text-muted">Reconciled</span>
                      ` : ''}
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

/**
 * Render Pending Confirmation Tab
 */
function renderPendingConfirmationTabHTML(pendingChallans) {
  return `
    <div class="card" style="margin-top: var(--space-4);">
      <div class="card-header">
        <div>
          <div class="card-title">In-Flight Transactions Awaiting Webhook Confirmation</div>
          <div class="card-subtitle">Payments initiated but pending asynchronous bank or Parivahan gateway reconciliation</div>
        </div>
      </div>

      <div class="card-body" style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pending Txn Ref</th>
              <th>Challan No</th>
              <th>Vehicle Asset</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Initiated At</th>
              <th>Gateway Status</th>
              <th>Reconciliation Action</th>
            </tr>
          </thead>
          <tbody>
            ${pendingChallans.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                  <div class="empty-state">
                    <div class="empty-state-title">No Pending Transactions</div>
                    <div class="empty-state-text">All initiated payments have been confirmed or settled.</div>
                  </div>
                </td>
              </tr>
            ` : pendingChallans.map(c => `
              <tr>
                <td>
                  <strong class="font-mono text-xs" style="color: #B7791F;">${c.transactionReference || 'TXN-PENDING-000'}</strong>
                </td>
                <td>
                  <strong>${c.challanNumber}</strong>
                  <div class="text-xs text-muted">${c.offence}</div>
                </td>
                <td>
                  <span class="plate-chip plate-chip--commercial">${c.vehicleReg}</span>
                </td>
                <td>
                  <strong>${Utils.formatINR(c.totalPayable || c.amount)}</strong>
                </td>
                <td>
                  <span class="badge badge--neutral">${c.paymentMethod || 'UPI'}</span>
                </td>
                <td>
                  <span class="text-xs">${Utils.formatDate(c.pendingPaymentDetails?.initiatedAt || new Date().toISOString(), true)}</span>
                </td>
                <td>
                  <span class="badge badge--pending" style="background: #FEF8E8; color: #B7791F;">
                    ⏳ Awaiting Webhook
                  </span>
                </td>
                <td>
                  <button class="btn btn--outline btn--sm" onclick="reconcileSpecificChallan('${c.id}')" title="Simulate bank inquiry & mark paid">
                    ✓ Reconcile Now
                  </button>
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
 * Handle Search Input
 */
function handlePaymentsSearch(q) {
  paymentsViewState.searchQuery = q.toLowerCase().trim();
  renderPaymentsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.handlePaymentsSearch = handlePaymentsSearch;

/**
 * Handle Recovery Filter
 */
function handlePaymentsRecoveryFilter(filter) {
  paymentsViewState.recoveryFilter = filter;
  renderPaymentsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.handlePaymentsRecoveryFilter = handlePaymentsRecoveryFilter;

/**
 * Open Payment Settlement Modal (#paymentModal)
 */
function openPaymentModal(challanId) {
  if (StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canPay", "Fine Settlement")) {
    return;
  }

  const challan = StorageManager.getChallanById(challanId);
  if (!challan) {
    Utils.showToast("Challan Not Found", "Unable to load challan for payment.", "error");
    return;
  }

  const modal = document.getElementById("paymentModal");
  if (!modal) return;

  // Set hidden ID
  document.getElementById("payModalChallanId").value = challan.id;

  // Check Court Lock
  const courtLock = StorageManager.isPaymentLockedByCourt(challan);
  const lockAlert = document.getElementById("payCourtLockAlert");
  const lockMsg = document.getElementById("payCourtLockMessage");
  const confirmBtn = document.getElementById("confirmPayBtn");
  const retryBtn = document.getElementById("payRetryBtn");
  const reconcileBtn = document.getElementById("payReconcileBtn");
  const failAlert = document.getElementById("payFailureAlert");
  const pendingAlert = document.getElementById("payPendingAlert");

  // Reset alerts
  failAlert.style.display = "none";
  pendingAlert.style.display = "none";
  retryBtn.style.display = "none";
  reconcileBtn.style.display = "none";

  if (courtLock.locked) {
    lockAlert.style.display = "block";
    lockMsg.textContent = courtLock.reason;
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.5";
    confirmBtn.title = "Online payment locked due to active court proceedings";
  } else {
    lockAlert.style.display = "none";
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = "1";
    confirmBtn.title = "";
  }

  // Populate Challan Metadata
  document.getElementById("payChallanNo").textContent = challan.challanNumber;
  document.getElementById("payAuthority").textContent = challan.issuingAuthority || "State Traffic Police";
  document.getElementById("payVehicleReg").textContent = challan.vehicleReg;
  
  const vehicle = StorageManager.getVehicleById(challan.vehicleId);
  document.getElementById("payVehicleModel").textContent = vehicle ? vehicle.makeModel : "Fleet Asset";
  document.getElementById("payOffence").textContent = `${challan.offence} (${challan.mvActSection || 'Motor Vehicles Act'})`;

  // Amount Breakdown
  const baseAmt = challan.amount || 1000;
  const lateFee = challan.lateFee || 0;
  const convFee = challan.convenienceFee !== undefined ? challan.convenienceFee : 25;
  const totalPayable = challan.totalPayable || (baseAmt + lateFee + convFee);

  document.getElementById("payBaseAmount").textContent = Utils.formatINR(baseAmt);
  document.getElementById("payLateFee").textContent = Utils.formatINR(lateFee);
  document.getElementById("payConvFee").textContent = Utils.formatINR(convFee);
  document.getElementById("payTotalAmount").textContent = Utils.formatINR(totalPayable);

  // Financial Entity Fields
  const responsibleParty = challan.responsibleParty || "Driver";
  const responsiblePartyName = challan.responsiblePartyName || (vehicle ? (vehicle.driverName || vehicle.lesseeName) : "Rahul Sharma");
  document.getElementById("payResponsiblePartyDisplay").value = `${responsibleParty} (${responsiblePartyName})`;

  // Payer Entity default
  const payerSelect = document.getElementById("payPayerSelect");
  payerSelect.value = "Apex Fleet Pvt Ltd";

  // Recovery defaults
  const recoveryPartyInput = document.getElementById("payRecoveryPartyInput");
  recoveryPartyInput.value = responsiblePartyName;

  const recoveryChannelSelect = document.getElementById("payRecoveryChannelSelect");
  if (responsibleParty === "Driver") {
    recoveryChannelSelect.value = "Payroll deduction";
  } else if (responsibleParty === "Lessee") {
    recoveryChannelSelect.value = "Invoice";
  } else {
    recoveryChannelSelect.value = "Write-off";
  }

  // Default rail
  selectPayRail("UPI");

  // Default simulation outcome
  const successRadio = document.querySelector('input[name="paySimOutcome"][value="SUCCESS"]');
  if (successRadio) successRadio.checked = true;

  Utils.openModal("paymentModal");
}
window.openPaymentModal = openPaymentModal;

/**
 * Select Payment Rail
 */
function selectPayRail(method) {
  document.getElementById("paySelectedMethod").value = method;

  // Toggle button active states
  document.querySelectorAll(".pay-method-btn").forEach(btn => {
    if (btn.getAttribute("data-method") === method) {
      btn.classList.add("active");
      btn.style.borderColor = "var(--color-primary)";
      btn.style.background = "var(--color-primary-light)";
      btn.style.color = "var(--color-primary)";
    } else {
      btn.classList.remove("active");
      btn.style.borderColor = "var(--color-border)";
      btn.style.background = "transparent";
      btn.style.color = "var(--color-text-main)";
    }
  });

  // Toggle Method Details Container
  document.getElementById("payMethodUPI").style.display = method === "UPI" ? "block" : "none";
  document.getElementById("payMethodNetBanking").style.display = method === "Net Banking" ? "block" : "none";
  document.getElementById("payMethodCard").style.display = method === "Corporate Card" ? "block" : "none";
  document.getElementById("payMethodPrepaid").style.display = method === "Prepaid Fleet Credit" ? "block" : "none";
}
window.selectPayRail = selectPayRail;

/**
 * Handle Payer Entity Change
 */
function handlePayPayerChange(payer) {
  const recoveryChannelSelect = document.getElementById("payRecoveryChannelSelect");
  if (payer === "Driver Direct") {
    recoveryChannelSelect.value = "Payroll deduction";
  } else if (payer === "Lessee Direct") {
    recoveryChannelSelect.value = "Invoice";
  }
}
window.handlePayPayerChange = handlePayPayerChange;

/**
 * Execute Simulated Payment
 */
function executePaymentSimulation() {
  const challanId = document.getElementById("payModalChallanId").value;
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  // Check Court Lock
  const courtLock = StorageManager.isPaymentLockedByCourt(challan);
  if (courtLock.locked) {
    Utils.showToast("Payment Blocked", courtLock.reason, "error");
    return;
  }

  // Get selected simulation outcome
  const outcomeRadio = document.querySelector('input[name="paySimOutcome"]:checked');
  const outcome = outcomeRadio ? outcomeRadio.value : "SUCCESS";

  const method = document.getElementById("paySelectedMethod").value;
  const payerType = document.getElementById("payPayerSelect").value;
  const recoveryParty = document.getElementById("payRecoveryPartyInput").value || challan.responsiblePartyName || "Rahul Sharma";
  const recoveryMethod = document.getElementById("payRecoveryChannelSelect").value;

  const result = StorageManager.recordPayment(challanId, {
    outcome: outcome,
    method: method,
    payerType: payerType,
    recoveryParty: recoveryParty,
    recoveryMethod: recoveryMethod,
    failureReason: "Simulated Bank Gateway Timeout: ERR_GATEWAY_TIMEOUT"
  });

  if (outcome === "SUCCESS") {
    Utils.closeModal("paymentModal");
    Utils.showToast("Payment Successful (SIMULATED)", `Fine settled via ${method}. Receipt ${result.receiptNumber} generated.`, "success");
    
    // Open Receipt Voucher
    openReceiptModal(challanId);

    // Refresh view
    if (typeof navigateTo === 'function') {
      const currentHash = window.location.hash || "";
      if (currentHash.includes("payments")) {
        renderPaymentsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
      } else if (currentHash.includes("challans")) {
        navigateTo("challans", true, { id: challanId });
      }
    }
  } else if (outcome === "FAILURE") {
    // Show failure alert in modal
    const failAlert = document.getElementById("payFailureAlert");
    const retryBtn = document.getElementById("payRetryBtn");
    failAlert.style.display = "block";
    retryBtn.style.display = "inline-flex";

    Utils.showToast("Payment Failed (SIMULATED)", "Gateway rejected transaction. Challan remains unpaid.", "error");
  } else if (outcome === "PENDING") {
    // Show pending alert in modal
    const pendingAlert = document.getElementById("payPendingAlert");
    const reconcileBtn = document.getElementById("payReconcileBtn");
    pendingAlert.style.display = "block";
    reconcileBtn.style.display = "inline-flex";

    Utils.showToast("Payment In-Flight (SIMULATED)", "Pending confirmation. Challan is not marked as paid.", "warning");
  }
}
window.executePaymentSimulation = executePaymentSimulation;

/**
 * Retry Payment Simulation after Failure
 */
function retryPaymentSimulation() {
  document.getElementById("payFailureAlert").style.display = "none";
  document.getElementById("payRetryBtn").style.display = "none";
  
  // Switch to success radio for convenience
  const successRadio = document.querySelector('input[name="paySimOutcome"][value="SUCCESS"]');
  if (successRadio) successRadio.checked = true;

  Utils.showToast("Retry Ready", "Select payment rail and authorize payment again.", "info");
}
window.retryPaymentSimulation = retryPaymentSimulation;

/**
 * Reconcile Pending Payment from Modal
 */
function reconcilePaymentSimulation() {
  const challanId = document.getElementById("payModalChallanId").value;
  reconcileSpecificChallan(challanId);
}
window.reconcilePaymentSimulation = reconcilePaymentSimulation;

/**
 * Reconcile Specific Challan
 */
function reconcileSpecificChallan(challanId) {
  const result = StorageManager.reconcilePendingPayment(challanId, "SUCCESS");
  if (result.success) {
    Utils.closeModal("paymentModal");
    Utils.showToast("Reconciliation Complete (SIMULATED)", `Bank verified. Challan marked as Paid. Receipt ${result.receiptNumber} generated.`, "success");
    openReceiptModal(challanId);
    
    // Refresh view
    if (typeof navigateTo === 'function') {
      const currentHash = window.location.hash || "";
      if (currentHash.includes("payments")) {
        renderPaymentsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
      }
    }
  }
}
window.reconcileSpecificChallan = reconcileSpecificChallan;

/**
 * Open Official Printable / Downloadable Receipt Modal
 */
function openReceiptModal(challanId) {
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const modal = document.getElementById("receiptModal");
  if (!modal) return;

  const receiptNo = challan.receiptNumber || `RCPT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const txnRef = challan.transactionReference || `TXN-PARIVAHAN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const baseAmt = challan.amount || 1000;
  const lateFee = challan.lateFee || 0;
  const convFee = challan.convenienceFee !== undefined ? challan.convenienceFee : 25;
  const total = challan.totalPayable || (baseAmt + lateFee + convFee);

  document.getElementById("receiptVoucherNo").textContent = receiptNo;
  document.getElementById("receiptChallanNo").textContent = challan.challanNumber;
  document.getElementById("receiptVehicleReg").textContent = challan.vehicleReg;
  document.getElementById("receiptOffence").textContent = `${challan.offence} (${challan.mvActSection || 'Motor Vehicles Act'})`;
  document.getElementById("receiptPaymentDate").textContent = Utils.formatDate(challan.paymentDate || new Date().toISOString(), true);
  document.getElementById("receiptBaseAmt").textContent = Utils.formatINR(baseAmt);
  document.getElementById("receiptLateFee").textContent = Utils.formatINR(lateFee);
  document.getElementById("receiptConvFee").textContent = Utils.formatINR(convFee);
  document.getElementById("receiptTotalAmt").textContent = Utils.formatINR(total);
  document.getElementById("receiptPayer").textContent = challan.payerType || "Apex Fleet Pvt Ltd";
  document.getElementById("receiptRecoveryParty").textContent = `${challan.recoveryParty || challan.responsiblePartyName || 'Rahul Sharma'} (${challan.recoveryMethod || 'Payroll deduction'})`;
  document.getElementById("receiptMethod").textContent = challan.paymentMethod || "UPI Payment Gateway";
  document.getElementById("receiptTxnRef").textContent = txnRef;

  Utils.openModal("receiptModal");
}
window.openReceiptModal = openReceiptModal;

/**
 * Download Current Modal Receipt
 */
function downloadCurrentReceiptVoucher() {
  const challanNo = document.getElementById("receiptChallanNo").textContent;
  const challan = StorageManager.getChallans().find(c => c.challanNumber === challanNo);
  if (challan) {
    downloadReceiptVoucher(challan.id);
  } else {
    Utils.showToast("Receipt Downloaded", "Downloaded settlement voucher.", "success");
  }
}
window.downloadCurrentReceiptVoucher = downloadCurrentReceiptVoucher;

/**
 * Generate and Download Formatted Receipt Text/Voucher File
 */
function downloadReceiptVoucher(challanId) {
  const challan = StorageManager.getChallanById(challanId);
  if (!challan) return;

  const receiptNo = challan.receiptNumber || `RCPT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const txnRef = challan.transactionReference || `TXN-PARIVAHAN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = Utils.formatDate(challan.paymentDate || new Date().toISOString(), true);
  const baseAmt = challan.amount || 1000;
  const lateFee = challan.lateFee || 0;
  const convFee = challan.convenienceFee !== undefined ? challan.convenienceFee : 25;
  const total = challan.totalPayable || (baseAmt + lateFee + convFee);

  const voucherText = `
================================================================================
                    APEX FLEET PVT LTD - COMPLIANCE DIVISION
              OFFICIAL e-CHALLAN SETTLEMENT RECEIPT & AUDIT VOUCHER
                          [DEMO / SIMULATED TRANSACTION]
================================================================================

VOUCHER NUMBER     : ${receiptNo}
TRANSACTION REF    : ${txnRef}
SETTLEMENT DATE    : ${dateStr}
STATUS             : VERIFIED & RECONCILED (DIGITALLY CERTIFIED)

--------------------------------------------------------------------------------
1. INFRACTION DETAILS
--------------------------------------------------------------------------------
Challan Number     : ${challan.challanNumber}
Vehicle Asset      : ${challan.vehicleReg}
Issuing Authority  : ${challan.issuingAuthority || 'State Traffic Police'}
Location           : ${challan.location || 'Urban Highway Corridor'}
Offence Description: ${challan.offence}
Statutory Section  : ${challan.mvActSection || 'Motor Vehicles Act 1988'}

--------------------------------------------------------------------------------
2. SETTLEMENT FINANCIAL BREAKDOWN
--------------------------------------------------------------------------------
Base Penalty Amount: INR ${baseAmt.toLocaleString('en-IN')}
Accumulated Late Fee: INR ${lateFee.toLocaleString('en-IN')}
Gateway Convenience: INR ${convFee.toLocaleString('en-IN')}
--------------------------------------------------------------------------------
TOTAL AMOUNT PAID  : INR ${total.toLocaleString('en-IN')}
Settlement Rail    : ${challan.paymentMethod || 'UPI Gateway'}

--------------------------------------------------------------------------------
3. FINANCIAL AUDIT & RECOVERY LEDGER
--------------------------------------------------------------------------------
Upfront Payer      : ${challan.payerType || 'Apex Fleet Pvt Ltd'} (Liquidity Provider)
Responsible Party  : ${challan.responsibleParty || 'Driver'}
Recovery Target    : ${challan.recoveryParty || challan.responsiblePartyName || 'Rahul Sharma'}
Recovery Channel   : ${challan.recoveryMethod || 'Payroll deduction'}
Reconciliation Ref : APEX-REC-${challan.id}

--------------------------------------------------------------------------------
VERIFICATION SEAL  : APEX-AUDIT-OK | PARIVAHAN-VIRTUAL-GATEWAY-2026
NOTE: This voucher is generated for internal fleet audit and payroll reconciliation.
================================================================================
`.trim();

  // Create downloadable file
  const blob = new Blob([voucherText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Settlement-Receipt-${receiptNo}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  Utils.showToast("Receipt Downloaded", `Settlement voucher saved as Settlement-Receipt-${receiptNo}.txt`, "success");
}
window.downloadReceiptVoucher = downloadReceiptVoucher;

/**
 * Handle Recovery Actions (Deduct / Invoice / Write-off)
 */
function handleRecoveryAction(recoveryId, action) {
  if (action === "WRITEOFF" && StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canWriteOff", "Fine Write-Off Approval")) {
    return;
  }
  if (action === "DEDUCT" && StorageManager.checkPermissionOrNotify && !StorageManager.checkPermissionOrNotify("canPay", "Payroll Recovery Processing")) {
    return;
  }

  let newStatus = "Queued";
  let notes = "";

  if (action === "DEDUCT") {
    newStatus = "Deducted";
    notes = "Payroll deduction executed in HR payslip cycle.";
  } else if (action === "INVOICE") {
    newStatus = "Invoiced";
    notes = "Challan penalty added to monthly corporate lessee invoice.";
  } else if (action === "WRITEOFF") {
    newStatus = "Written Off";
    notes = "Approved as operational fine write-off by Compliance Head.";
  }

  StorageManager.updateRecoveryStatus(recoveryId, newStatus, notes);
  Utils.showToast("Recovery Updated", `Ledger record marked as ${newStatus}.`, "success");

  // Re-render view
  renderPaymentsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));
}
window.handleRecoveryAction = handleRecoveryAction;

/**
 * Export Payments & Recovery Ledger CSV
 */
function exportPaymentsRecoveryCSV() {
  const recoveries = StorageManager.getRecoveries();
  if (!recoveries || recoveries.length === 0) {
    Utils.showToast("No Data", "No recovery records available to export.", "warning");
    return;
  }
  Utils.exportToCSV("challanos-recovery-ledger.csv", recoveries);
}
window.exportPaymentsRecoveryCSV = exportPaymentsRecoveryCSV;
