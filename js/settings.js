/**
 * ChallanOS - System Settings & Administration Module (js/settings.js)
 * 
 * Features:
 * - Workspace Settings (Legal Entity Name, CIN, PAN, GSTIN, Headquarters, Contact)
 * - Responsibility Rules Engine Configuration (Confidence threshold, mandatory audit, Clause 7.2 enforcement)
 * - Notification Preferences (Driver WhatsApp, Lessee Email, Impoundment alerts)
 * - Simulated Notification Dispatch Playground (Email & WhatsApp preview payloads)
 * - User Role Simulation:
 *     1. Fleet Manager (Full access)
 *     2. Finance (Settlements, Invoicing, Payroll Recovery, Reports)
 *     3. Operations (Vehicles, Drivers, Rosters, Custody Assignment)
 *     4. Legal (Disputes, Virtual Court, Compounding Orders)
 *     5. Read-only (View only, all mutations restricted)
 * - Maker-Checker & Payment Approval Limits (Threshold for dual authorization)
 * - Demo Data Reset (Pristine state restoration)
 */

let settingsViewState = {
  activeTab: "workspace" // "workspace" | "rules" | "roles" | "approvals" | "notifications"
};

/**
 * Main Settings View Renderer
 */
function renderSettingsView(container, actions) {
  const company = StorageManager.getCompany();
  const currentUser = StorageManager.getCurrentUser();
  const currentRole = StorageManager.getCurrentRole();

  actions.innerHTML = `
    <button class="btn btn--danger btn--sm" onclick="openResetDataConfirmationModal()">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
      Reset Demo Data
    </button>
  `;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: var(--space-4);">
      
      <!-- Settings Tab Bar -->
      <div class="card" style="padding: var(--space-4) var(--space-6);">
        <div class="nav-tabs" style="border-bottom: none; margin-bottom: 0; flex-wrap: wrap;">
          <button class="nav-tab ${settingsViewState.activeTab === 'workspace' ? 'active' : ''}" onclick="switchSettingsTab('workspace')">
            Workspace Settings
          </button>
          <button class="nav-tab ${settingsViewState.activeTab === 'rules' ? 'active' : ''}" onclick="switchSettingsTab('rules')">
            Responsibility Rules
          </button>
          <button class="nav-tab ${settingsViewState.activeTab === 'roles' ? 'active' : ''}" onclick="switchSettingsTab('roles')">
            User Roles & Permissions
          </button>
          <button class="nav-tab ${settingsViewState.activeTab === 'approvals' ? 'active' : ''}" onclick="switchSettingsTab('approvals')">
            Approval Limits (Maker-Checker)
          </button>
          <button class="nav-tab ${settingsViewState.activeTab === 'notifications' ? 'active' : ''}" onclick="switchSettingsTab('notifications')">
            Notification Preferences
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div id="settingsTabContent">
        ${renderActiveSettingsTab(company, currentUser, currentRole)}
      </div>

    </div>
  `;
}

/**
 * Switch Tab
 */
function switchSettingsTab(tabKey) {
  settingsViewState.activeTab = tabKey;
  const company = StorageManager.getCompany();
  const currentUser = StorageManager.getCurrentUser();
  const currentRole = StorageManager.getCurrentRole();
  const content = document.getElementById("settingsTabContent");
  if (content) {
    content.innerHTML = renderActiveSettingsTab(company, currentUser, currentRole);
  }
}
window.switchSettingsTab = switchSettingsTab;

/**
 * Render Content of Selected Tab
 */
function renderActiveSettingsTab(company, currentUser, currentRole) {
  // --------------------------------------------------------------------------
  // TAB 1: WORKSPACE SETTINGS
  // --------------------------------------------------------------------------
  if (settingsViewState.activeTab === "workspace") {
    return `
      <div class="card" style="padding: var(--space-6);">
        <div class="card-header" style="padding: 0 0 var(--space-4) 0; margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #FFFFFF; padding: 4px; border: 1px solid rgba(22, 24, 29, 0.08); box-shadow: 0 1px 3px rgba(22, 24, 29, 0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <img src="assets/images/challanos-logo.png" alt="Hisaab Logo" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div>
              <h3 class="card-title">Corporate Workspace Settings</h3>
              <p class="card-subtitle">Apex Fleet Pvt Ltd statutory registration details, tax identifiers, and official compliance contacts</p>
            </div>
          </div>
        </div>

        <form id="workspaceSettingsForm" onsubmit="event.preventDefault(); saveWorkspaceSettings();">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Corporate Legal Entity Name *</label>
              <input type="text" class="form-input" id="setCompanyName" value="${company.name || 'Apex Fleet Pvt Ltd'}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Registration No (CIN / LLPIN) *</label>
              <input type="text" class="form-input font-mono" id="setCompanyRegNo" value="${company.registrationNo || 'U63030DL2018PTC339102'}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Corporate PAN *</label>
              <input type="text" class="form-input font-mono" id="setCompanyPAN" value="${company.pan || 'AAACA1234F'}" required style="text-transform: uppercase;">
            </div>
            <div class="form-group">
              <label class="form-label">GST Identification Number (GSTIN) *</label>
              <input type="text" class="form-input font-mono" id="setCompanyGSTIN" value="${company.gstin || '07AAACA1234F1Z5'}" required style="text-transform: uppercase;">
            </div>
          </div>

          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="form-label">Headquarters Address *</label>
            <input type="text" class="form-input" id="setCompanyHQ" value="${company.headquarters || 'DLF Cyber City, Tower B, Sector 25, Gurugram, NCR'}" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Primary Compliance Support Email *</label>
              <input type="email" class="form-input" id="setCompanyEmail" value="${company.supportEmail || 'compliance@apexfleet.in'}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Compliance Desk Phone *</label>
              <input type="text" class="form-input" id="setCompanyPhone" value="${company.supportPhone || '+91 124 492 8800'}" required>
            </div>
          </div>

          <div style="margin-top: var(--space-6); display: flex; justify-content: flex-end;">
            <button class="btn btn--primary" type="submit">Save Workspace Profile</button>
          </div>
        </form>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // TAB 2: RESPONSIBILITY RULES ENGINE
  // --------------------------------------------------------------------------
  if (settingsViewState.activeTab === "rules") {
    const rules = StorageManager.getRulesConfig();
    return `
      <div class="card" style="padding: var(--space-6);">
        <div class="card-header" style="padding: 0 0 var(--space-4) 0; margin-bottom: var(--space-4);">
          <div>
            <h3 class="card-title">Responsibility Rules Engine & Attribution Policies</h3>
            <p class="card-subtitle">Configures the 5-tier evaluation hierarchy, automated attribution confidence thresholds, and conflict safeguards</p>
          </div>
        </div>

        <form id="rulesConfigForm" onsubmit="event.preventDefault(); saveRulesConfig();">
          <!-- Confidence Threshold Slider -->
          <div style="padding: 16px; background: var(--color-bg-app); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div>
                <strong style="font-size: 13px;">Automated Attribution Confidence Threshold</strong>
                <p class="text-xs text-muted">Suggestions below this threshold are routed to human compliance triage</p>
              </div>
              <strong style="font-size: 18px; color: var(--color-primary);" id="ruleConfidenceDisplay">${rules.confidenceThreshold || 80}%</strong>
            </div>
            <input type="range" class="form-range" id="ruleConfidenceInput" min="50" max="95" step="5" value="${rules.confidenceThreshold || 80}" oninput="document.getElementById('ruleConfidenceDisplay').textContent = this.value + '%'" style="width: 100%;">
          </div>

          <!-- Policy Rule Toggles -->
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div>
                <strong style="font-size: 13px;">Priority 1: Enforce Mandatory Audit Reason on Overrides</strong>
                <p class="text-xs text-muted">Requires compliance officer to state a documented business justification before saving an override.</p>
              </div>
              <input type="checkbox" id="ruleEnforceAuditReason" ${rules.enforceAuditReason !== false ? 'checked' : ''}>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div>
                <strong style="font-size: 13px;">Priority 2: Moving Violations Under Driver Custody</strong>
                <p class="text-xs text-muted">Automatically maps speeding, red light jumping, and reckless driving to the driver with active trip duty manifest.</p>
              </div>
              <input type="checkbox" id="ruleAutoAssignMoving" ${rules.autoAssignMovingToDriver !== false ? 'checked' : ''}>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div>
                <strong style="font-size: 13px;">Priority 3: Strict Master Lease Clause 7.2 Indemnity Validation</strong>
                <p class="text-xs text-muted">Verifies explicit traffic fine indemnity covenants before attributing operational infractions to corporate lessees.</p>
              </div>
              <input type="checkbox" id="ruleStrictLease" ${rules.strictLeaseIndemnity !== false ? 'checked' : ''}>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div>
                <strong style="font-size: 13px;">Priority 4: Fleet Operator Statutory Paperwork Default</strong>
                <p class="text-xs text-muted">Automatically routes vehicle documentation lapses (PUC, Fitness, Road Tax) to Fleet Operations as statutory asset owner.</p>
              </div>
              <input type="checkbox" id="ruleFleetDefault" ${rules.fleetDefaultStatutory !== false ? 'checked' : ''}>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div>
                <strong style="font-size: 13px;">Conflict Safeguard: Auto-Quarantine Overlapping Rosters</strong>
                <p class="text-xs text-muted">Halts automated assignment whenever multiple drivers or contradictory custody manifests collide at the offence timestamp.</p>
              </div>
              <input type="checkbox" id="ruleQuarantineConflicts" ${rules.quarantineConflicts !== false ? 'checked' : ''}>
            </div>

          </div>

          <div style="margin-top: var(--space-6); display: flex; justify-content: flex-end;">
            <button class="btn btn--primary" type="submit">Save Rules Configuration</button>
          </div>
        </form>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // TAB 3: USER ROLES & PERMISSION SIMULATION
  // --------------------------------------------------------------------------
  if (settingsViewState.activeTab === "roles") {
    const rolesList = ["Fleet Manager", "Finance", "Operations", "Legal", "Read-only"];

    return `
      <div class="card" style="padding: var(--space-6);">
        <div class="card-header" style="padding: 0 0 var(--space-4) 0; margin-bottom: var(--space-4);">
          <div>
            <h3 class="card-title">User Roles & Permission Simulation</h3>
            <p class="card-subtitle">Test and experience role-based authorization constraints across Hisaab workflows</p>
          </div>
        </div>

        <!-- Role Simulator Switcher -->
        <div style="padding: 16px; background: var(--color-primary-subtle); border: 1px solid var(--color-primary-light); border-radius: var(--radius-md); margin-bottom: var(--space-6);">
          <div style="font-size: 13px; font-weight: 700; color: var(--color-primary); margin-bottom: 8px;">
            Simulate Active User Role:
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${rolesList.map(role => `
              <button class="btn ${currentRole === role ? 'btn--primary' : 'btn--outline'} btn--sm" onclick="switchUserRole('${role}')">
                ${currentRole === role ? '✓ ' : ''}${role}
              </button>
            `).join("")}
          </div>
          <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 10px;">
            Currently acting as: <strong>${currentUser.name || 'Deepak Tiwari'}</strong> • Active Role: <strong style="color: var(--color-primary);">${currentRole}</strong>
          </div>
        </div>

        <!-- Permission Matrix Comparison Table -->
        <h4 class="text-sm font-semibold" style="margin-bottom: var(--space-3);">Frontend Permission Matrix by Role</h4>
        <div style="border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Operation / Capability</th>
                <th>Fleet Manager</th>
                <th>Finance</th>
                <th>Operations</th>
                <th>Legal</th>
                <th>Read-only</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Direct Fine Settlement (Pay)</strong></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
              </tr>
              <tr>
                <td><strong>Liability Assignment & Overrides</strong></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
              </tr>
              <tr>
                <td><strong>Dispute Filing & Contests</strong></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
              </tr>
              <tr>
                <td><strong>Virtual Court Compounding Orders</strong></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
              </tr>
              <tr>
                <td><strong>Vehicle Asset Management (Add/Edit)</strong></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
              </tr>
              <tr>
                <td><strong>Fine Write-Off Approval</strong></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
                <td><span class="badge badge--unassigned">✕ Blocked</span></td>
              </tr>
              <tr>
                <td><strong>View Analytics, Dashboards & Export CSV</strong></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
                <td><span class="badge badge--paid">✓ Allowed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // TAB 4: APPROVAL SETTINGS & MAKER-CHECKER LIMITS
  // --------------------------------------------------------------------------
  if (settingsViewState.activeTab === "approvals") {
    const approvals = StorageManager.getApprovalSettings();

    return `
      <div class="card" style="padding: var(--space-6);">
        <div class="card-header" style="padding: 0 0 var(--space-4) 0; margin-bottom: var(--space-4);">
          <div>
            <h3 class="card-title">Approval Settings & Payment Limits (Maker-Checker)</h3>
            <p class="card-subtitle">Dual-authorization controls for high-value fine settlements and legal escalations</p>
          </div>
        </div>

        <form id="approvalSettingsForm" onsubmit="event.preventDefault(); saveApprovalSettings();">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Single-Signer Payment Approval Limit (INR) *</label>
              <input type="number" class="form-input" id="setPaymentApprovalLimit" value="${approvals.paymentApprovalLimit || 5000}" step="500" min="500" required>
              <span class="text-xs text-muted">Transactions exceeding this limit trigger dual sign-off.</span>
            </div>
            <div class="form-group">
              <label class="form-label">High-Exposure Dispute Escalation Threshold (INR) *</label>
              <input type="number" class="form-input" id="setDisputeThreshold" value="${approvals.disputeThresholdAmount || 10000}" step="1000" min="1000" required>
              <span class="text-xs text-muted">Challans above this amount require Legal Counsel review before contest.</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div>
                <strong style="font-size: 13px;">Enforce Maker-Checker on Direct Banking Payments</strong>
                <p class="text-xs text-muted">Requires separate operator initiation and manager authorization for batch payments.</p>
              </div>
              <input type="checkbox" id="setRequireMakerChecker" ${approvals.requireMakerChecker !== false ? 'checked' : ''}>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div>
                <strong style="font-size: 13px;">Require Legal Escalation Notice for Court Referrals</strong>
                <p class="text-xs text-muted">Notifies Fleet Legal Counsel whenever a notice is transferred to Virtual Traffic Court.</p>
              </div>
              <input type="checkbox" id="setRequireLegalNotice" ${approvals.requireLegalEscalationNotice !== false ? 'checked' : ''}>
            </div>
          </div>

          <div style="margin-top: var(--space-6); display: flex; justify-content: flex-end;">
            <button class="btn btn--primary" type="submit">Save Approval Settings</button>
          </div>
        </form>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // TAB 5: NOTIFICATION PREFERENCES & SIMULATION PLAYGROUND
  // --------------------------------------------------------------------------
  const notifs = StorageManager.getNotificationSettings();

  return `
    <div class="card" style="padding: var(--space-6);">
      <div class="card-header" style="padding: 0 0 var(--space-4) 0; margin-bottom: var(--space-4);">
        <div>
          <h3 class="card-title">Notification Preferences & Simulation Playground</h3>
          <p class="card-subtitle">Automated event dispatch channels (Email & WhatsApp) with simulated test triggers</p>
        </div>
      </div>

      <!-- Notification Channel Configuration Form -->
      <form id="notificationSettingsForm" onsubmit="event.preventDefault(); saveNotificationSettings();">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
          <div class="form-group">
            <label class="form-label">Primary Compliance Notification Email *</label>
            <input type="email" class="form-input" id="setNotifEmail" value="${notifs.primaryComplianceEmail || 'compliance@apexfleet.in'}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Primary Finance SMS / WhatsApp Phone *</label>
            <input type="text" class="form-input" id="setNotifPhone" value="${notifs.primaryFinancePhone || '+91 98102 33411'}" required>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div>
              <strong style="font-size: 13px;">Driver WhatsApp Infraction Notice</strong>
              <p class="text-xs text-muted">Sends instant WhatsApp notification with ANPR CCTV evidence link upon liability attribution.</p>
            </div>
            <input type="checkbox" id="setNotifDriverWhatsApp" ${notifs.driverNoticeWhatsApp !== false ? 'checked' : ''}>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div>
              <strong style="font-size: 13px;">Corporate Lessee Weekly Email Digest</strong>
              <p class="text-xs text-muted">Dispatches consolidated debit note summary for all vehicles operating under commercial lease agreements.</p>
            </div>
            <input type="checkbox" id="setNotifLesseeEmail" ${notifs.lesseeWeeklyEmailDigest !== false ? 'checked' : ''}>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <div>
              <strong style="font-size: 13px;">Impoundment & Court Summons Urgent Warning</strong>
              <p class="text-xs text-muted">High-priority alert when a vehicle's fine is within 3 days of court summons or RC blacklisting.</p>
            </div>
            <input type="checkbox" id="setNotifImpoundment" ${notifs.impoundmentUrgentAlerts !== false ? 'checked' : ''}>
          </div>
        </div>

        <div style="margin-top: var(--space-4); display: flex; justify-content: flex-end;">
          <button class="btn btn--primary" type="submit">Save Notification Preferences</button>
        </div>
      </form>

      <!-- Simulated Dispatch Playground -->
      <div style="margin-top: var(--space-6); border-top: 1px solid var(--color-border); padding-top: var(--space-6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h4 class="text-sm font-semibold" style="color: var(--color-primary);">📲 Simulated Notification Dispatch Playground</h4>
            <p class="text-xs text-muted">Test message generation (Simulated — no external network transmission occurs)</p>
          </div>
          <span class="badge badge--neutral">SIMULATION ONLY</span>
        </div>

        <!-- Explicit Disclaimer Alert -->
        <div style="background: #FEF8E8; border: 1px solid #FCE4A6; border-radius: var(--radius-md); padding: 10px 14px; font-size: 12px; color: #B7791F; margin-bottom: 14px;">
          <strong>Notice:</strong> This is an in-browser notification sandbox for prototype verification. No real emails or SMS/WhatsApp messages are sent to external recipients.
        </div>

        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <button class="btn btn--outline btn--sm" onclick="triggerSimulatedNotification('whatsapp')">
            💬 Test Driver WhatsApp Dispatch (Simulated)
          </button>
          <button class="btn btn--outline btn--sm" onclick="triggerSimulatedNotification('email')">
            ✉️ Test Lessee Email Digest (Simulated)
          </button>
          <button class="btn btn--outline btn--sm" onclick="triggerSimulatedNotification('urgent')">
            🚨 Test Impoundment Urgent Alert (Simulated)
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Save Workspace Settings
 */
function saveWorkspaceSettings() {
  if (!StorageManager.checkPermissionOrNotify("canConfigureSettings", "Workspace Configuration")) return;

  const updates = {
    name: document.getElementById("setCompanyName").value,
    registrationNo: document.getElementById("setCompanyRegNo").value,
    pan: document.getElementById("setCompanyPAN").value,
    gstin: document.getElementById("setCompanyGSTIN").value,
    headquarters: document.getElementById("setCompanyHQ").value,
    supportEmail: document.getElementById("setCompanyEmail").value,
    supportPhone: document.getElementById("setCompanyPhone").value
  };

  StorageManager.updateCompany(updates);
  Utils.showToast("Settings Saved", "Workspace profile successfully updated.", "success");
}
window.saveWorkspaceSettings = saveWorkspaceSettings;

/**
 * Save Responsibility Rules
 */
function saveRulesConfig() {
  if (!StorageManager.checkPermissionOrNotify("canConfigureSettings", "Rules Configuration")) return;

  const updates = {
    confidenceThreshold: parseInt(document.getElementById("ruleConfidenceInput").value, 10),
    enforceAuditReason: document.getElementById("ruleEnforceAuditReason").checked,
    autoAssignMovingToDriver: document.getElementById("ruleAutoAssignMoving").checked,
    strictLeaseIndemnity: document.getElementById("ruleStrictLease").checked,
    fleetDefaultStatutory: document.getElementById("ruleFleetDefault").checked,
    quarantineConflicts: document.getElementById("ruleQuarantineConflicts").checked
  };

  StorageManager.updateRulesConfig(updates);
  Utils.showToast("Rules Updated", "Responsibility assignment policies saved.", "success");
}
window.saveRulesConfig = saveRulesConfig;

/**
 * Save Approval Settings
 */
function saveApprovalSettings() {
  if (!StorageManager.checkPermissionOrNotify("canConfigureSettings", "Approval Settings")) return;

  const updates = {
    paymentApprovalLimit: parseFloat(document.getElementById("setPaymentApprovalLimit").value) || 5000,
    disputeThresholdAmount: parseFloat(document.getElementById("setDisputeThreshold").value) || 10000,
    requireMakerChecker: document.getElementById("setRequireMakerChecker").checked,
    requireLegalEscalationNotice: document.getElementById("setRequireLegalNotice").checked
  };

  StorageManager.updateApprovalSettings(updates);
  Utils.showToast("Approvals Saved", "Maker-checker thresholds and payment limits saved.", "success");
}
window.saveApprovalSettings = saveApprovalSettings;

/**
 * Save Notification Settings
 */
function saveNotificationSettings() {
  if (!StorageManager.checkPermissionOrNotify("canConfigureSettings", "Notification Settings")) return;

  const updates = {
    primaryComplianceEmail: document.getElementById("setNotifEmail").value,
    primaryFinancePhone: document.getElementById("setNotifPhone").value,
    driverNoticeWhatsApp: document.getElementById("setNotifDriverWhatsApp").checked,
    lesseeWeeklyEmailDigest: document.getElementById("setNotifLesseeEmail").checked,
    impoundmentUrgentAlerts: document.getElementById("setNotifImpoundment").checked
  };

  StorageManager.updateNotificationSettings(updates);
  Utils.showToast("Preferences Saved", "Automated alert configurations updated.", "success");
}
window.saveNotificationSettings = saveNotificationSettings;

/**
 * Switch Simulated User Role
 */
function switchUserRole(roleName) {
  StorageManager.switchUserRole(roleName);
  Utils.showToast("Persona Switched", `Simulated user role changed to: ${roleName}`, "info");

  // Re-render settings view
  renderSettingsView(document.getElementById("moduleViewBody"), document.getElementById("viewHeaderActions"));

  // Update topbar role text if present
  const userRoleEl = document.getElementById("currentUserRole");
  if (userRoleEl) userRoleEl.textContent = roleName;
}
window.switchUserRole = switchUserRole;

/**
 * Trigger Simulated Notification Dispatch Payload
 */
function triggerSimulatedNotification(type) {
  if (type === "whatsapp") {
    alert(
      `[SIMULATED WHATSAPP DISPATCH]\n` +
      `--------------------------------------------------\n` +
      `To: +91 98102 33411 (Rahul Sharma - Driver)\n` +
      `Channel: WhatsApp Business API (Simulated)\n\n` +
      `"Namaste Rahul, a traffic challan of INR 2,025 for Overspeeding on vehicle DL-01-AB-1234 has been attributed to your duty roster.\n\n` +
      `View evidence: https://apexfleet.in/c/chl-101\n` +
      `Amount scheduled for Nov 2026 payroll recovery. File grievance within 72h if disputed."\n` +
      `--------------------------------------------------\n` +
      `(Demo mode: No external WhatsApp message was sent)`
    );
    Utils.showToast("WhatsApp Dispatched (SIMULATED)", "Payload logged for driver Rahul Sharma.", "success");
  } else if (type === "email") {
    alert(
      `[SIMULATED CORPORATE EMAIL DISPATCH]\n` +
      `--------------------------------------------------\n` +
      `To: fleet-billing@blinkit.com\n` +
      `Subject: Apex Fleet: Weekly Traffic Infraction Recovery Summary\n\n` +
      `"Dear Blinkit Fleet Operations,\n` +
      `Under Master Commercial Lease BLNK-HR-884 Clause 7.2, please find attached the weekly summary of 3 settled traffic infractions totaling INR 4,520.\n\n` +
      `These amounts have been added to your upcoming monthly billing invoice."\n` +
      `--------------------------------------------------\n` +
      `(Demo mode: No external email was sent)`
    );
    Utils.showToast("Email Dispatched (SIMULATED)", "Corporate digest payload logged for Blinkit.", "success");
  } else {
    alert(
      `[SIMULATED URGENT IMPOUNDMENT ALERT]\n` +
      `--------------------------------------------------\n` +
      `To: compliance@apexfleet.in | SMS: +91 98102 33411\n` +
      `URGENCY: CRITICAL (IMPOUNDMENT NOTICE)\n\n` +
      `"ATTENTION: Vehicle HR-26-CE-4321 has an overdue fine of INR 22,050 referred to Virtual Traffic Court (Case CH-GGM-2026-0941). Court summons active. Settle immediately to avoid depot impoundment."\n` +
      `--------------------------------------------------\n` +
      `(Demo mode: No external SMS was sent)`
    );
    Utils.showToast("Urgent Alert (SIMULATED)", "Impoundment alert logged for compliance team.", "warning");
  }
}
window.triggerSimulatedNotification = triggerSimulatedNotification;

/**
 * Reset Demo Data Confirmation Dialog
 */
function openResetDataConfirmationModal() {
  const proceed = confirm(
    "ARE YOU SURE YOU WANT TO RESET DEMO DATA?\n\n" +
    "This will clear all localStorage modifications, custom vehicles, edited challans, simulated payments, disputes, and court dockets, and restore the pristine initial Indian fleet dataset.\n\n" +
    "Click OK to confirm data reset."
  );

  if (proceed) {
    StorageManager.resetToDefault();
    Utils.showToast("System Reset Complete", "Pristine initial fleet mock data restored.", "success");
    setTimeout(() => {
      window.location.hash = "#dashboard";
      window.location.reload();
    }, 600);
  }
}
window.openResetDataConfirmationModal = openResetDataConfirmationModal;
