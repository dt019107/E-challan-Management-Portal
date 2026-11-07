/**
 * ChallanOS - LocalStorage State Manager
 * Centralized client persistence & reactive event dispatcher
 */

const STORAGE_KEY = "challanos_app_state_v1";

const StorageManager = {
  // Subscribers for state changes
  listeners: [],

  /**
   * Initialize state from localStorage or load seed mock data
   */
  init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      } else {
        this.data = JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
        this.persist();
      }
    } catch (e) {
      console.warn("StorageManager: Failed to parse localStorage. Re-seeding mock data.", e);
      this.data = JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
      this.persist();
    }

    // Ensure secondary operational stores exist
    if (!this.data.payments) this.data.payments = [];
    if (!this.data.recoveries) this.data.recoveries = [];
    if (!this.data.disputes) this.data.disputes = [];
    if (!this.data.courtCases) this.data.courtCases = [];

    // Ensure company and workspace settings
    if (!this.data.company) {
      this.data.company = {
        name: "Apex Fleet Pvt Ltd",
        registrationNo: "U63030DL2018PTC339102",
        pan: "AAACA1234F",
        gstin: "07AAACA1234F1Z5",
        headquarters: "DLF Cyber City, Tower B, Sector 25, Gurugram, NCR",
        supportEmail: "compliance@apexfleet.in",
        supportPhone: "+91 124 492 8800"
      };
    }

    // Ensure responsibility rules configuration
    if (!this.data.rulesConfig) {
      this.data.rulesConfig = {
        confidenceThreshold: 80,
        enforceAuditReason: true,
        strictLeaseIndemnity: true,
        fleetDefaultStatutory: true,
        quarantineConflicts: true,
        autoAssignMovingToDriver: true
      };
    }

    // Ensure approval limits & maker-checker
    if (!this.data.approvalSettings) {
      this.data.approvalSettings = {
        paymentApprovalLimit: 5000,
        requireMakerChecker: true,
        disputeThresholdAmount: 10000,
        requireLegalEscalationNotice: true
      };
    }

    // Ensure notification preferences
    if (!this.data.notificationSettings) {
      this.data.notificationSettings = {
        enableEmail: true,
        enableWhatsApp: true,
        driverNoticeWhatsApp: true,
        lesseeWeeklyEmailDigest: true,
        impoundmentUrgentAlerts: true,
        primaryComplianceEmail: "compliance@apexfleet.in",
        primaryFinancePhone: "+91 98102 33411"
      };
    }

    // Populate operational stores from challans if empty
    this._syncOperationalStores();
    return this.data;
  },

  _syncOperationalStores() {
    if (!this.data || !this.data.challans) return;

    // Sync payments
    if (this.data.payments.length === 0) {
      const paid = this.data.challans.filter(c => c.status === "paid" || c.paymentStatus === "Paid");
      this.data.payments = paid.map(c => ({
        id: "pmt-" + c.id,
        challanId: c.id,
        challanNumber: c.challanNumber,
        vehicleReg: c.vehicleReg,
        vehicleId: c.vehicleId,
        amount: c.amount,
        lateFee: c.lateFee || 0,
        convenienceFee: c.convenienceFee || 25,
        totalAmount: c.totalPayable || (c.amount + (c.lateFee || 0) + (c.convenienceFee || 25)),
        paymentMethod: c.paymentMethod || "UPI",
        transactionRef: c.transactionReference || ("TXN-PARIVAHAN-2026-" + Math.floor(100000 + Math.random() * 900000)),
        receiptNumber: c.receiptNumber || ("RCPT-2026-" + Math.floor(100000 + Math.random() * 900000)),
        payerType: c.payerType || "Apex Fleet Pvt Ltd",
        responsibleParty: c.responsibleParty || "Driver",
        recoveryParty: c.recoveryParty || c.responsiblePartyName || "Rahul Sharma",
        recoveryMethod: c.recoveryMethod || (c.responsibleParty === "Driver" ? "Payroll deduction" : (c.responsibleParty === "Lessee" ? "Invoice" : "Write-off")),
        paymentDate: c.paymentDate || c.offenceDate || new Date().toISOString(),
        status: "SUCCESS",
        isSimulated: true
      }));
    }

    // Sync recoveries
    if (this.data.recoveries.length === 0) {
      const paid = this.data.challans.filter(c => c.status === "paid" || c.paymentStatus === "Paid");
      this.data.recoveries = paid.map(c => {
        const isDriver = c.responsibleParty === "Driver";
        const isLessee = c.responsibleParty === "Lessee";
        const method = c.recoveryMethod || (isDriver ? "Payroll deduction" : (isLessee ? "Invoice" : "Write-off"));
        return {
          id: "rec-" + c.id,
          challanId: c.id,
          challanNumber: c.challanNumber,
          vehicleReg: c.vehicleReg,
          amount: c.totalPayable || c.amount,
          payer: c.payerType || "Apex Fleet Pvt Ltd",
          responsibleParty: c.responsibleParty || "Driver",
          responsiblePartyName: c.responsiblePartyName || (isDriver ? "Rahul Sharma" : "Blinkit Commerce Delivery"),
          recoveryMethod: method,
          recoveryStatus: method === "Write-off" ? "Written Off" : (c.recoveryStatus || "Queued"),
          cycleRef: isDriver ? "Nov 2026 Payroll" : (isLessee ? "INV-2026-BLNK" : "WRITEOFF-APEX"),
          createdAt: c.paymentDate || c.offenceDate || new Date().toISOString(),
          updatedAt: c.paymentDate || c.offenceDate || new Date().toISOString(),
          notes: `Ledger entry for fine settled on ${c.challanNumber}`
        };
      });
    }

    // Sync disputes
    if (this.data.disputes.length === 0) {
      const disputed = this.data.challans.filter(c => c.status === "disputed");
      this.data.disputes = disputed.map(c => ({
        id: "disp-" + c.id,
        challanId: c.id,
        challanNumber: c.challanNumber,
        vehicleReg: c.vehicleReg,
        amount: c.amount,
        reason: c.disputeDetails?.reason || "Emergency vehicle yield / camera calibration dispute",
        evidenceFile: "telematics-gps-speed-log.pdf",
        submissionDate: c.disputeDetails?.submissionDate || "2026-03-03",
        deadline: c.disputeDeadline || "2026-03-25",
        status: c.disputeDetails?.currentStatus || "Under Authority Review",
        authorityDocketNumber: c.disputeDetails?.authorityDocketNumber || ("DISP-PARIVAHAN-" + Math.floor(10000 + Math.random() * 90000)),
        authorityResponse: "Parivahan Grievance Portal: Under administrative verification by DSP Traffic Cell."
      }));
    }

    // Sync courtCases
    if (this.data.courtCases.length === 0) {
      const courtCases = this.data.challans.filter(c => c.status === "court");
      this.data.courtCases = courtCases.map(c => ({
        id: "court-" + c.id,
        challanId: c.id,
        challanNumber: c.challanNumber,
        vehicleReg: c.vehicleReg,
        amount: c.amount,
        caseNumber: c.courtDetails?.caseNumber || ("DLCT01-002931-2026"),
        courtName: c.courtDetails?.courtJurisdiction || "Virtual Traffic Court, Delhi",
        hearingDate: c.courtDetails?.hearingDate || "2026-04-18",
        status: "Awaiting Hearing",
        judgeName: c.courtDetails?.judgeName || "Special MM Traffic",
        legalCounsel: c.courtDetails?.legalCounsel || "Adv. Meenakshi Sundaram",
        notes: c.courtDetails?.statusNote || "Summons issued. Direct payment locked pending judicial compounding order.",
        courtOrder: null,
        outcome: "Pending Hearing",
        isPaymentLocked: true
      }));
    }
  },

  /**
   * Commit current in-memory state to localStorage and trigger listeners
   */
  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.broadcast("state:updated", this.data);
    } catch (e) {
      console.error("StorageManager: LocalStorage write error", e);
    }
  },

  /**
   * Reset data to initial pristine demo state
   */
  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
    this.persist();
    this.broadcast("state:reset", this.data);
  },

  /**
   * Subscribe to state change events
   */
  subscribe(fn) {
    if (typeof fn === "function") {
      this.listeners.push(fn);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },

  /**
   * Broadcast state changes to subscribers
   */
  broadcast(event, payload) {
    this.listeners.forEach(fn => {
      try {
        fn(event, payload);
      } catch (err) {
        console.error("Storage listener error:", err);
      }
    });
    // Also dispatch native CustomEvent on window for loose coupling
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      const Evt = typeof CustomEvent !== "undefined" ? CustomEvent : window.CustomEvent;
      if (typeof Evt === "function") {
        window.dispatchEvent(new Evt(event, { detail: payload }));
      }
    }
  },

  // --- Entity Accessors & Mutations ---

  getCompany() {
    return this.data.company || { name: "Apex Fleet Pvt Ltd" };
  },

  getDashboardStats() {
    if (!this.data) this.init();

    const challans = (this.data.challans || []);
    const vehicles = (this.data.vehicles || []).filter(v => !v.archived);

    // Calculate directly from central data
    const nonPaidChallans = challans.filter(c => c.status !== "paid");
    const openChallans = nonPaidChallans.length;

    // Outstanding amount excluding court stay
    const outstandingAmount = nonPaidChallans
      .filter(c => c.status !== "court")
      .reduce((sum, c) => sum + (c.totalPayable || c.amount || 0), 0);

    const unassignedChallans = challans.filter(c => c.status === "unassigned").length;

    // Due in 7 days
    const dueIn7Days = nonPaidChallans.filter(c => {
      if (!c.dueDate) return false;
      const days = Utils.getDaysRemaining(c.dueDate);
      return days >= 0 && days <= 7;
    }).length;

    const disputedChallans = challans.filter(c => c.status === "disputed" || c.status === "court").length;

    // Status distribution
    const statusMap = {
      unassigned: { label: "Unassigned", count: 0, color: "var(--status-unassigned, #C24141)" },
      assigned: { label: "Assigned", count: 0, color: "var(--status-assigned, #3155D9)" },
      pending: { label: "Pending Payment", count: 0, color: "var(--status-pending, #B7791F)" },
      paid: { label: "Paid / Settled", count: 0, color: "var(--status-paid, #16845B)" },
      disputed: { label: "Disputed", count: 0, color: "var(--status-disputed, #7452C8)" },
      court: { label: "Virtual Court", count: 0, color: "var(--status-court, #2675B8)" }
    };

    challans.forEach(c => {
      const s = c.status || "unassigned";
      if (statusMap[s]) {
        statusMap[s].count++;
      }
    });

    const totalC = challans.length || 1;
    const statusDistribution = Object.keys(statusMap).map(k => ({
      status: k,
      label: statusMap[k].label,
      count: statusMap[k].count,
      percentage: Math.round((statusMap[k].count / totalC) * 1000) / 10,
      color: statusMap[k].color
    })).filter(s => s.count > 0);

    // Responsible party breakdown
    const partyMap = {
      "Driver": { label: "Drivers (Payroll Recovery)", count: 0, amount: 0, color: "#3155D9" },
      "Lessee": { label: "Corporate Lessees (Invoicing)", count: 0, amount: 0, color: "#7452C8" },
      "Fleet Operator": { label: "Apex Fleet (Self Absorbed)", count: 0, amount: 0, color: "#2675B8" },
      "Unassigned": { label: "Unassigned / Triage", count: 0, amount: 0, color: "#C24141" }
    };

    challans.forEach(c => {
      const p = c.responsibleParty || "Unassigned";
      const key = partyMap[p] ? p : "Unassigned";
      partyMap[key].count++;
      partyMap[key].amount += (c.totalPayable || c.amount || 0);
    });

    const totalAmt = Object.values(partyMap).reduce((acc, p) => acc + p.amount, 0) || 1;
    const responsiblePartyBreakdown = Object.keys(partyMap).map(k => ({
      party: k,
      label: partyMap[k].label,
      count: partyMap[k].count,
      amount: partyMap[k].amount,
      percentage: Math.round((partyMap[k].amount / totalAmt) * 100),
      color: partyMap[k].color
    }));

    // Top offences dynamically aggregated
    const offenceMap = {};
    challans.forEach(c => {
      const off = c.offence || "Traffic Infraction";
      if (!offenceMap[off]) offenceMap[off] = { count: 0, amount: 0 };
      offenceMap[off].count++;
      offenceMap[off].amount += (c.totalPayable || c.amount || 0);
    });

    const topOffences = Object.keys(offenceMap)
      .map(k => ({
        name: k,
        count: offenceMap[k].count,
        amount: offenceMap[k].amount,
        percentage: Math.round((offenceMap[k].count / totalC) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top vehicles with open fines
    const vehicleFinesMap = {};
    nonPaidChallans.forEach(c => {
      const reg = c.vehicleReg;
      if (!vehicleFinesMap[reg]) vehicleFinesMap[reg] = { count: 0, amount: 0 };
      vehicleFinesMap[reg].count++;
      vehicleFinesMap[reg].amount += (c.totalPayable || c.amount || 0);
    });

    const topVehicles = Object.keys(vehicleFinesMap)
      .map(reg => {
        const v = vehicles.find(veh => veh.regNumber === reg);
        return {
          regNumber: reg,
          model: v ? v.makeModel : "Commercial Fleet",
          count: vehicleFinesMap[reg].count,
          amount: vehicleFinesMap[reg].amount,
          driver: v ? (v.currentDriverName || "Assigned Driver") : "Fleet Driver"
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      openChallans,
      outstandingAmount,
      unassignedChallans,
      dueIn7Days,
      disputedChallans,
      avgAssignmentHours: 4.2,
      slaTargetHours: 72.0,
      topOffences,
      topVehicles,
      statusDistribution,
      responsiblePartyBreakdown
    };
  },

  getVehicles() {
    return (this.data.vehicles || []).filter(v => !v.archived);
  },

  getAllVehicles(includeArchived = false) {
    if (includeArchived) return this.data.vehicles || [];
    return this.getVehicles();
  },

  getVehicleById(id) {
    return (this.data.vehicles || []).find(v => v.id === id || v.regNumber === id);
  },

  addVehicle(vehicle) {
    const validation = this.validateVehicle(vehicle);
    if (!validation.isValid) {
      console.warn("StorageManager.addVehicle validation warning:", validation.errors);
    }

    if (!vehicle.id) {
      vehicle.id = "veh-" + (Date.now());
    }
    if (vehicle.archived === undefined) {
      vehicle.archived = false;
    }
    if (!vehicle.responsibilityPeriods) {
      vehicle.responsibilityPeriods = [];
    }
    if (!this.data.vehicles) this.data.vehicles = [];
    this.data.vehicles.unshift(vehicle);
    this.persist();
    return vehicle;
  },

  updateVehicle(id, updates) {
    const idx = (this.data.vehicles || []).findIndex(v => v.id === id);
    if (idx !== -1) {
      this.data.vehicles[idx] = { ...this.data.vehicles[idx], ...updates };
      this.persist();
      return this.data.vehicles[idx];
    }
    return null;
  },

  archiveVehicle(id) {
    return this.updateVehicle(id, { archived: true, archivedAt: new Date().toISOString() });
  },

  deleteVehicle(id) {
    const idx = (this.data.vehicles || []).findIndex(v => v.id === id);
    if (idx !== -1) {
      const removed = this.data.vehicles.splice(idx, 1)[0];
      this.persist();
      return removed;
    }
    return null;
  },

  validateVehicle(vehicle) {
    const errors = [];
    if (!vehicle || typeof vehicle !== "object") {
      return { isValid: false, errors: ["Invalid vehicle data"] };
    }
    if (!vehicle.regNumber || !vehicle.regNumber.trim()) {
      errors.push("Vehicle registration number is required.");
    }
    if (!vehicle.makeModel || !vehicle.makeModel.trim()) {
      errors.push("Make and model description is required.");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  getChallans() {
    return this.data.challans || [];
  },

  getChallanById(id) {
    return this.getChallans().find(c => c.id === id || c.challanNumber === id);
  },

  addChallan(challan) {
    const validation = this.validateChallan(challan);
    if (!validation.isValid) {
      console.warn("StorageManager.addChallan validation warning:", validation.errors);
    }
    if (!challan.id) {
      challan.id = "chl-" + (Date.now());
    }
    if (!challan.activityLog) {
      challan.activityLog = [{
        timestamp: new Date().toISOString(),
        user: this.data.currentUser?.name || "System",
        action: "Detected",
        notes: "Challan record manually created."
      }];
    }
    if (!this.data.challans) this.data.challans = [];
    this.data.challans.unshift(challan);

    // Update vehicle counters
    const vehicle = this.getVehicleById(challan.vehicleId);
    if (vehicle && challan.status !== "paid") {
      vehicle.openChallans = (vehicle.openChallans || 0) + 1;
      vehicle.outstandingAmount = (vehicle.outstandingAmount || 0) + (challan.totalPayable || challan.amount || 0);
    }

    this.persist();
    return challan;
  },

  updateChallan(id, updates) {
    const idx = (this.data.challans || []).findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.challans[idx] = { ...this.data.challans[idx], ...updates };
      this.persist();
      return this.data.challans[idx];
    }
    return null;
  },

  deleteChallan(id) {
    const idx = (this.data.challans || []).findIndex(c => c.id === id);
    if (idx !== -1) {
      const removed = this.data.challans.splice(idx, 1)[0];
      this.persist();
      return removed;
    }
    return null;
  },

  validateChallan(challan) {
    const errors = [];
    if (!challan || typeof challan !== "object") {
      return { isValid: false, errors: ["Invalid challan object"] };
    }
    if (!challan.challanNumber) errors.push("Challan number is required.");
    if (!challan.vehicleReg && !challan.vehicleId) errors.push("Associated vehicle reference is required.");
    if (typeof challan.amount !== "number" || challan.amount <= 0) errors.push("Valid positive fine amount is required.");
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Drivers CRUD
  addDriver(driver) {
    if (!driver.id) driver.id = "drv-" + (Date.now());
    if (!this.data.drivers) this.data.drivers = [];
    this.data.drivers.push(driver);
    this.persist();
    return driver;
  },

  updateDriver(id, updates) {
    const idx = (this.data.drivers || []).findIndex(d => d.id === id);
    if (idx !== -1) {
      this.data.drivers[idx] = { ...this.data.drivers[idx], ...updates };
      this.persist();
      return this.data.drivers[idx];
    }
    return null;
  },

  deleteDriver(id) {
    const idx = (this.data.drivers || []).findIndex(d => d.id === id);
    if (idx !== -1) {
      const removed = this.data.drivers.splice(idx, 1)[0];
      this.persist();
      return removed;
    }
    return null;
  },

  // Lessees / Owners CRUD
  addLessee(lessee) {
    if (!lessee.id) lessee.id = "les-" + (Date.now());
    if (!this.data.lessees) this.data.lessees = [];
    this.data.lessees.push(lessee);
    this.persist();
    return lessee;
  },

  updateLessee(id, updates) {
    const idx = (this.data.lessees || []).findIndex(l => l.id === id);
    if (idx !== -1) {
      this.data.lessees[idx] = { ...this.data.lessees[idx], ...updates };
      this.persist();
      return this.data.lessees[idx];
    }
    return null;
  },

  deleteLessee(id) {
    const idx = (this.data.lessees || []).findIndex(l => l.id === id);
    if (idx !== -1) {
      const removed = this.data.lessees.splice(idx, 1)[0];
      this.persist();
      return removed;
    }
    return null;
  },

  /**
   * Core Responsibility Assignment & Reassignment Mutation (Phase 7 - Step 7.3 & Step 7.4)
   * Tracks previous vs new values, manual override rationale, split liability shares,
   * and appends an immutable entry to the lifecycle activity audit ledger.
   */
  assignChallan(challanId, assignmentData, auditReason) {
    const challan = this.getChallanById(challanId);
    if (!challan) return null;

    const previousParty = challan.responsibleParty || "Unassigned";
    const previousPartyName = challan.responsiblePartyName || "None";
    const isReassignment = previousParty !== "Unassigned" && previousParty !== assignmentData.partyType;
    const isOverride = assignmentData.isOverride || isReassignment || (assignmentData.partyType !== challan.suggestedParty);

    challan.previousResponsibleParty = previousParty;
    challan.previousResponsiblePartyName = previousPartyName;
    challan.responsibleParty = assignmentData.partyType; // Driver | Lessee | Fleet Operator | Vehicle Owner | Split
    challan.responsiblePartyName = assignmentData.partyName;
    challan.responsiblePartyId = assignmentData.partyId || null;
    challan.assignmentStatus = "assigned";

    // Advance semantic status from unassigned to assigned
    if (challan.status === "unassigned") {
      challan.status = "assigned";
    }

    // Step 7.3: Manual override tracking
    challan.isManualOverride = !!isOverride;
    challan.manualOverrideReason = auditReason || "Manual liability allocation";
    challan.assignedBy = this.data.currentUser.name;
    challan.assignedAt = new Date().toISOString();

    // Step 7.4: Split liability details if applicable
    if (assignmentData.partyType === "Split") {
      challan.splitDetails = assignmentData.splitDetails || {
        shares: [
          { partyType: "Driver", partyName: "Rahul Sharma", percentage: 60, amount: (challan.amount * 0.6) },
          { partyType: "Lessee", partyName: "Corporate Lessee", percentage: 40, amount: (challan.amount * 0.4) }
        ]
      };
    } else {
      challan.splitDetails = null;
    }

    const timestamp = new Date().toISOString();
    const currentUser = (this.data.currentUser && this.data.currentUser.name) ? this.data.currentUser.name : "Vikram Malhotra";

    // 2. Track structured responsibility history on challan
    if (!challan.responsibilityHistory) challan.responsibilityHistory = [];
    challan.responsibilityHistory.push({
      previousParty: previousParty,
      previousPartyName: previousPartyName,
      newParty: assignmentData.partyType,
      newPartyName: assignmentData.partyName,
      reason: auditReason,
      user: currentUser,
      timestamp: timestamp,
      splitDetails: challan.splitDetails
    });

    // 3. Update Vehicle custody/responsibility timeline
    const vehicle = this.getVehicleById(challan.vehicleId);
    if (vehicle) {
      if (!vehicle.responsibilityHistory) vehicle.responsibilityHistory = [];
      vehicle.responsibilityHistory.push({
        challanId: challan.id,
        challanNumber: challan.challanNumber,
        offenceDate: challan.offenceDate,
        previousParty: previousParty,
        partyType: assignmentData.partyType,
        partyName: assignmentData.partyName,
        reason: auditReason,
        user: currentUser,
        timestamp: timestamp
      });
    }

    if (!challan.activityLog) challan.activityLog = [];
    challan.activityLog.push({
      timestamp: timestamp,
      user: `${currentUser} (${(this.data.currentUser && this.data.currentUser.role) || 'Compliance Lead'})`,
      action: isReassignment ? "Responsibility Reassigned (Manual Override)" : (isOverride ? "Responsibility Assigned (Manual Override)" : "Responsibility Assigned"),
      previousValue: `${previousParty} (${previousPartyName})`,
      newValue: `${assignmentData.partyType} (${assignmentData.partyName})`,
      notes: auditReason || `Assigned liability to ${assignmentData.partyType} (${assignmentData.partyName})`
    });

    this.persist();
    return challan;
  },

  /**
   * Check if payment is locked by judicial court proceedings
   */
  isPaymentLockedByCourt(challan) {
    if (!challan) return { locked: false, reason: "" };
    if (challan.status === "court") {
      const courtDetails = challan.courtDetails || {};
      const order = courtDetails.courtOrder;
      // If no court order has been issued, payment is locked
      if (!order && courtDetails.status !== "Disposed / Acquitted") {
        return {
          locked: true,
          reason: `Challan ${challan.challanNumber} has been referred to Virtual Traffic Court (${courtDetails.caseNumber || 'Summons Active'}). Direct Parivahan payment is locked pending judicial compounding order or court decree.`
        };
      }
    }
    return { locked: false, reason: "" };
  },

  /**
   * Record Payment and Advance State (Success, Failure, Pending Confirmation)
   */
  recordPayment(challanId, paymentDetails = {}) {
    const challan = this.getChallanById(challanId);
    if (!challan) return { success: false, error: "Challan not found" };

    const outcome = (paymentDetails.outcome || "SUCCESS").toUpperCase();
    const method = paymentDetails.method || "UPI";
    const payerType = paymentDetails.payerType || "Apex Fleet Pvt Ltd";
    const recoveryParty = paymentDetails.recoveryParty || challan.responsiblePartyName || "Rahul Sharma";
    const recoveryMethod = paymentDetails.recoveryMethod || (challan.responsibleParty === "Driver" ? "Payroll deduction" : (challan.responsibleParty === "Lessee" ? "Invoice" : "Write-off"));
    const userName = (this.data.currentUser && this.data.currentUser.name) ? this.data.currentUser.name : "Vikram Malhotra";
    const nowISO = new Date().toISOString();

    if (!challan.activityLog) challan.activityLog = [];

    // Check if court case lock prevents payment
    const courtLock = this.isPaymentLockedByCourt(challan);
    if (courtLock.locked) {
      return { success: false, isCourtLocked: true, error: courtLock.reason };
    }

    if (outcome === "FAILURE") {
      // Keep challan unpaid
      challan.paymentStatus = "Failed";
      const failureReason = paymentDetails.failureReason || "Simulated Bank Gateway Error: ERR_BANK_AUTH_TIMEOUT";
      challan.lastPaymentError = failureReason;

      challan.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Payment Failed",
        notes: `Simulated ${method} transaction failed: ${failureReason}. Challan remains unpaid.`
      });

      const failedRecord = {
        id: "pmt-" + Date.now(),
        challanId: challan.id,
        challanNumber: challan.challanNumber,
        vehicleReg: challan.vehicleReg,
        amount: challan.totalPayable || challan.amount,
        paymentMethod: method,
        transactionRef: "TXN-FAIL-" + Math.floor(100000 + Math.random() * 900000),
        status: "FAILED",
        failureReason: failureReason,
        payerType: payerType,
        paymentDate: nowISO,
        isSimulated: true
      };

      if (!this.data.payments) this.data.payments = [];
      this.data.payments.unshift(failedRecord);
      this.persist();

      return { success: false, challan, paymentRecord: failedRecord, error: failureReason };
    }

    if (outcome === "PENDING") {
      // Do NOT mark as Paid
      challan.paymentStatus = "Pending Confirmation";
      const pendingTxnRef = paymentDetails.txnRef || ("TXN-PENDING-" + Math.floor(100000 + Math.random() * 900000));
      challan.transactionReference = pendingTxnRef;
      challan.pendingPaymentDetails = {
        method,
        payerType,
        recoveryParty,
        recoveryMethod,
        initiatedAt: nowISO
      };

      challan.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Payment Pending",
        notes: `Simulated ${method} payment initiated (Ref: ${pendingTxnRef}). Awaiting bank webhook confirmation.`
      });

      const pendingRecord = {
        id: "pmt-" + Date.now(),
        challanId: challan.id,
        challanNumber: challan.challanNumber,
        vehicleReg: challan.vehicleReg,
        amount: challan.totalPayable || challan.amount,
        paymentMethod: method,
        transactionRef: pendingTxnRef,
        status: "PENDING_CONFIRMATION",
        payerType: payerType,
        paymentDate: nowISO,
        isSimulated: true
      };

      if (!this.data.payments) this.data.payments = [];
      this.data.payments.unshift(pendingRecord);
      this.persist();

      return { success: true, pending: true, challan, paymentRecord: pendingRecord, txnRef: pendingTxnRef };
    }

    // SUCCESS
    challan.status = "paid";
    challan.paymentStatus = "Paid";
    challan.paymentMethod = method;
    challan.payerType = payerType;
    challan.recoveryParty = recoveryParty;
    challan.recoveryMethod = recoveryMethod;
    challan.recoveryStatus = recoveryMethod === "Write-off" ? "Written Off" : "Queued";
    challan.receiptNumber = paymentDetails.receiptNumber || ("RCPT-" + Math.floor(100000 + Math.random() * 900000));
    challan.paymentDate = nowISO;
    challan.transactionReference = paymentDetails.txnRef || ("TXN-PARIVAHAN-2026-" + Math.floor(100000 + Math.random() * 900000));
    delete challan.pendingPaymentDetails;
    delete challan.lastPaymentError;

    // Deduct vehicle open counts & outstanding amount
    const vehicle = this.getVehicleById(challan.vehicleId);
    if (vehicle) {
      vehicle.openChallans = Math.max(0, (vehicle.openChallans || 1) - 1);
      vehicle.outstandingAmount = Math.max(0, (vehicle.outstandingAmount || challan.amount) - (challan.amount || 0));

      if (!vehicle.activityLog) vehicle.activityLog = [];
      vehicle.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Challan Settled",
        notes: `Challan ${challan.challanNumber} paid (₹${challan.totalPayable}). Receipt: ${challan.receiptNumber}`
      });
    }

    challan.activityLog.push({
      timestamp: nowISO,
      user: userName,
      action: "Payment Completed",
      notes: `Settled fine of ₹${challan.totalPayable} via ${method} (Ref: ${challan.transactionReference}). Payer: ${payerType}. Recovery: ${recoveryParty} (${recoveryMethod}).`
    });

    // Record in payments store
    const successRecord = {
      id: "pmt-" + Date.now(),
      challanId: challan.id,
      challanNumber: challan.challanNumber,
      vehicleReg: challan.vehicleReg,
      vehicleId: challan.vehicleId,
      amount: challan.amount,
      lateFee: challan.lateFee || 0,
      convenienceFee: challan.convenienceFee || 25,
      totalAmount: challan.totalPayable || (challan.amount + (challan.lateFee || 0) + (challan.convenienceFee || 25)),
      paymentMethod: method,
      transactionRef: challan.transactionReference,
      receiptNumber: challan.receiptNumber,
      payerType: payerType,
      responsibleParty: challan.responsibleParty || "Driver",
      recoveryParty: recoveryParty,
      recoveryMethod: recoveryMethod,
      paymentDate: nowISO,
      status: "SUCCESS",
      isSimulated: true
    };

    if (!this.data.payments) this.data.payments = [];
    this.data.payments.unshift(successRecord);

    // Create / update recovery record
    if (!this.data.recoveries) this.data.recoveries = [];
    const recId = "rec-" + Date.now();
    const cycleRef = recoveryMethod === "Payroll deduction" ? "Nov 2026 Payroll" : (recoveryMethod === "Invoice" ? "INV-2026-BLNK" : "WRITEOFF-APEX");
    this.data.recoveries.unshift({
      id: recId,
      challanId: challan.id,
      challanNumber: challan.challanNumber,
      vehicleReg: challan.vehicleReg,
      amount: challan.totalPayable || challan.amount,
      payer: payerType,
      responsibleParty: challan.responsibleParty || "Driver",
      responsiblePartyName: recoveryParty,
      recoveryMethod: recoveryMethod,
      recoveryStatus: recoveryMethod === "Write-off" ? "Written Off" : "Queued",
      cycleRef: cycleRef,
      createdAt: nowISO,
      updatedAt: nowISO,
      notes: `Settled by ${payerType}. Recovery queued for ${recoveryParty} via ${recoveryMethod}.`
    });

    this.persist();
    return { success: true, challan, paymentRecord: successRecord, receiptNumber: challan.receiptNumber };
  },

  /**
   * Reconcile Pending Bank Payment
   */
  reconcilePendingPayment(challanId, outcome = "SUCCESS") {
    const challan = this.getChallanById(challanId);
    if (!challan) return { success: false, error: "Challan not found" };

    const details = challan.pendingPaymentDetails || {};
    return this.recordPayment(challanId, {
      outcome: outcome,
      method: details.method || "UPI",
      payerType: details.payerType || "Apex Fleet Pvt Ltd",
      recoveryParty: details.recoveryParty || challan.responsiblePartyName,
      recoveryMethod: details.recoveryMethod || "Payroll deduction",
      txnRef: challan.transactionReference
    });
  },

  /**
   * Raise Dispute Mutation
   */
  raiseDispute(challanId, disputeData = {}) {
    const challan = this.getChallanById(challanId);
    if (!challan) return null;

    const nowISO = new Date().toISOString();
    const docketNo = disputeData.authorityDocketNumber || ("DISP-PARIVAHAN-" + Math.floor(100000 + Math.random() * 900000));
    const reason = disputeData.reason || "Telematics GPS discrepancy & emergency vehicle yield";
    const deadline = disputeData.deadline || challan.disputeDeadline || "2026-03-31";

    challan.status = "disputed";
    challan.disputeDetails = {
      ticketRef: docketNo,
      authorityDocketNumber: docketNo,
      reason: reason,
      evidenceFile: disputeData.evidenceFile || "telematics-gps-speed-log.pdf",
      submissionDate: nowISO.split("T")[0],
      deadline: deadline,
      currentStatus: "Under Authority Review",
      authorityResponse: disputeData.authorityResponse || "Parivahan Grievance Cell: Under administrative examination by ACP Traffic."
    };

    if (!challan.activityLog) challan.activityLog = [];
    challan.activityLog.push({
      timestamp: nowISO,
      user: (this.data.currentUser && this.data.currentUser.name) || "Vikram Malhotra",
      action: "Dispute Raised",
      notes: `Administrative dispute filed with Parivahan (Docket: ${docketNo}). Reason: ${reason}. Evidence: ${challan.disputeDetails.evidenceFile}`
    });

    if (!this.data.disputes) this.data.disputes = [];
    const disputeRecord = {
      id: "disp-" + Date.now(),
      challanId: challan.id,
      challanNumber: challan.challanNumber,
      vehicleReg: challan.vehicleReg,
      amount: challan.amount,
      reason: reason,
      evidenceFile: challan.disputeDetails.evidenceFile,
      submissionDate: nowISO.split("T")[0],
      deadline: deadline,
      status: "Under Authority Review",
      authorityDocketNumber: docketNo,
      authorityResponse: challan.disputeDetails.authorityResponse,
      createdAt: nowISO
    };
    this.data.disputes.unshift(disputeRecord);

    this.persist();
    return { challan, disputeRecord };
  },

  /**
   * Resolve Administrative Dispute
   */
  resolveDispute(challanId, decision = "APPROVED_WAIVED", notes = "") {
    const challan = this.getChallanById(challanId);
    if (!challan) return null;

    const nowISO = new Date().toISOString();
    const userName = (this.data.currentUser && this.data.currentUser.name) || "DSP Traffic Reviewer";

    if (!challan.activityLog) challan.activityLog = [];

    if (decision === "APPROVED_WAIVED") {
      challan.status = "paid";
      challan.paymentStatus = "Waived by Authority";
      challan.totalPayable = 0;
      challan.receiptNumber = "WAIVER-" + Math.floor(100000 + Math.random() * 900000);
      if (challan.disputeDetails) {
        challan.disputeDetails.currentStatus = "Accepted - Penalty Waived";
        challan.disputeDetails.authorityResponse = notes || "Evidence accepted. Violation quashed by Traffic Department.";
      }

      const vehicle = this.getVehicleById(challan.vehicleId);
      if (vehicle) {
        vehicle.openChallans = Math.max(0, (vehicle.openChallans || 1) - 1);
        vehicle.outstandingAmount = Math.max(0, (vehicle.outstandingAmount || challan.amount) - challan.amount);
      }

      challan.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Dispute Accepted",
        notes: `Grievance accepted. Fine of ₹${challan.amount} cancelled and waived. Receipt: ${challan.receiptNumber}`
      });
    } else {
      // REJECTED
      challan.status = "assigned";
      if (challan.disputeDetails) {
        challan.disputeDetails.currentStatus = "Rejected - Penalty Upheld";
        challan.disputeDetails.authorityResponse = notes || "Telematics calibration verified. Discrepancy rejected. Fine confirmed.";
      }
      challan.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Dispute Rejected",
        notes: `Administrative dispute rejected by authority. Fine of ₹${challan.amount} upheld.`
      });
    }

    if (this.data.disputes) {
      const disp = this.data.disputes.find(d => d.challanId === challanId);
      if (disp) {
        disp.status = decision === "APPROVED_WAIVED" ? "Accepted - Penalty Waived" : "Rejected - Penalty Upheld";
        disp.authorityResponse = notes || disp.authorityResponse;
      }
    }

    this.persist();
    return challan;
  },

  /**
   * Create Court Case Mutation
   */
  createCourtCase(challanId, courtData = {}) {
    const challan = this.getChallanById(challanId);
    if (!challan) return null;

    const nowISO = new Date().toISOString();
    const caseNo = courtData.caseNumber || ("DLCT01-" + Math.floor(100000 + Math.random() * 900000) + "-2026");
    const courtName = courtData.courtName || "Virtual Traffic Court, Tis Hazari, Delhi";
    const hearingDate = courtData.hearingDate || "2026-04-20";

    challan.status = "court";
    challan.courtDetails = {
      caseNumber: caseNo,
      courtJurisdiction: courtName,
      courtName: courtName,
      hearingDate: hearingDate,
      status: courtData.status || "Summons Issued",
      judgeName: courtData.judgeName || "Special Metropolitan Magistrate Traffic",
      legalCounsel: courtData.legalCounsel || "Adv. Meenakshi Sundaram",
      statusNote: courtData.notes || "Case pending before Virtual Traffic Court. Direct online payment disabled.",
      courtOrder: null,
      outcome: "Awaiting Hearing"
    };

    if (!challan.activityLog) challan.activityLog = [];
    challan.activityLog.push({
      timestamp: nowISO,
      user: (this.data.currentUser && this.data.currentUser.name) || "Vikram Malhotra",
      action: "Escalated to Court",
      notes: `Referred to Virtual Court (${courtName}). Case No: ${caseNo}. Hearing scheduled: ${hearingDate}. Direct payment locked.`
    });

    if (!this.data.courtCases) this.data.courtCases = [];
    const courtRecord = {
      id: "court-" + Date.now(),
      challanId: challan.id,
      challanNumber: challan.challanNumber,
      vehicleReg: challan.vehicleReg,
      amount: challan.amount,
      caseNumber: caseNo,
      courtName: courtName,
      hearingDate: hearingDate,
      status: "Awaiting Hearing",
      judgeName: challan.courtDetails.judgeName,
      legalCounsel: challan.courtDetails.legalCounsel,
      notes: challan.courtDetails.statusNote,
      courtOrder: null,
      outcome: "Pending Hearing",
      isPaymentLocked: true,
      createdAt: nowISO
    };
    this.data.courtCases.unshift(courtRecord);

    this.persist();
    return { challan, courtRecord };
  },

  /**
   * Resolve Court Case with Compounding or Dismissal Order
   */
  resolveCourtCase(challanId, outcomeData = {}) {
    const challan = this.getChallanById(challanId);
    if (!challan) return null;

    const outcome = outcomeData.outcome || "COMPOUNDED"; // "COMPOUNDED" | "DISMISSED" | "UPHELD"
    const orderNo = outcomeData.courtOrder || ("ORDER-VC-" + Math.floor(100000 + Math.random() * 900000));
    const nowISO = new Date().toISOString();
    const userName = "Virtual Traffic Court Registrar";

    if (!challan.activityLog) challan.activityLog = [];
    if (!challan.courtDetails) challan.courtDetails = {};
    challan.courtDetails.courtOrder = orderNo;

    if (outcome === "DISMISSED") {
      challan.status = "paid";
      challan.paymentStatus = "Dismissed by Court";
      challan.totalPayable = 0;
      challan.receiptNumber = orderNo;
      challan.courtDetails.status = "Disposed / Acquitted";
      challan.courtDetails.outcome = "Dismissed / Acquitted";

      const vehicle = this.getVehicleById(challan.vehicleId);
      if (vehicle) {
        vehicle.openChallans = Math.max(0, (vehicle.openChallans || 1) - 1);
        vehicle.outstandingAmount = Math.max(0, (vehicle.outstandingAmount || challan.amount) - challan.amount);
      }

      challan.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Court Order: Acquitted",
        notes: `Judicial order ${orderNo}: Case acquitted and penalty dismissed. Vehicle liability extinguished.`
      });
    } else if (outcome === "COMPOUNDED") {
      const compoundedAmt = outcomeData.compoundedAmount !== undefined ? outcomeData.compoundedAmount : 500;
      const prevAmt = challan.amount;
      challan.amount = compoundedAmt;
      challan.totalPayable = compoundedAmt;
      challan.status = "assigned"; // Unlocked from court stay, ready for payment of compounded fine
      challan.courtDetails.status = "Compounded by Court Order";
      challan.courtDetails.outcome = `Compounded to ₹${compoundedAmt}`;

      const vehicle = this.getVehicleById(challan.vehicleId);
      if (vehicle) {
        vehicle.outstandingAmount = Math.max(0, (vehicle.outstandingAmount || prevAmt) - (prevAmt - compoundedAmt));
      }

      challan.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Court Order: Compounded",
        notes: `Compounding order ${orderNo}: Fine reduced from ₹${prevAmt} to ₹${compoundedAmt}. Payment gate unlocked.`
      });
    } else {
      // UPHELD
      challan.status = "assigned";
      challan.courtDetails.status = "Upheld by Court Order";
      challan.courtDetails.outcome = "Upheld Full Fine";

      challan.activityLog.push({
        timestamp: nowISO,
        user: userName,
        action: "Court Order: Upheld",
        notes: `Judicial order ${orderNo}: Full fine upheld by court. Payment gate unlocked.`
      });
    }

    if (this.data.courtCases) {
      const cc = this.data.courtCases.find(c => c.challanId === challanId);
      if (cc) {
        cc.status = challan.courtDetails.status;
        cc.courtOrder = orderNo;
        cc.outcome = challan.courtDetails.outcome;
        cc.isPaymentLocked = false;
      }
    }

    this.persist();
    return challan;
  },

  /**
   * Operational Accessors
   */
  getRecoveries() {
    if (!this.data) this.init();
    return this.data.recoveries || [];
  },

  getPayments() {
    if (!this.data) this.init();
    return this.data.payments || [];
  },

  getDisputes() {
    if (!this.data) this.init();
    return this.data.disputes || [];
  },

  getCourtCases() {
    if (!this.data) this.init();
    return this.data.courtCases || [];
  },

  createRecoveryRecord(recoveryData) {
    if (!this.data) this.init();
    if (!this.data.recoveries) this.data.recoveries = [];

    const rec = {
      id: "rec-" + Date.now(),
      challanId: recoveryData.challanId || null,
      challanNumber: recoveryData.challanNumber || "N/A",
      vehicleReg: recoveryData.vehicleReg || "N/A",
      amount: recoveryData.amount || 0,
      payer: recoveryData.payer || "Apex Fleet Pvt Ltd",
      responsibleParty: recoveryData.responsibleParty || "Driver",
      responsiblePartyName: recoveryData.responsiblePartyName || "Rahul Sharma",
      recoveryMethod: recoveryData.recoveryMethod || "Payroll deduction",
      recoveryStatus: recoveryData.recoveryStatus || "Queued",
      cycleRef: recoveryData.cycleRef || "Nov 2026 Payroll",
      notes: recoveryData.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.recoveries.unshift(rec);
    this.persist();
    return rec;
  },

  // --- Settings & Configuration Accessors ---

  getCompany() {
    if (!this.data) this.init();
    return this.data.company || { name: "Apex Fleet Pvt Ltd" };
  },

  updateCompany(updates) {
    if (!this.data) this.init();
    this.data.company = Object.assign(this.data.company || {}, updates);
    this.persist();
    return this.data.company;
  },

  getRulesConfig() {
    if (!this.data) this.init();
    return this.data.rulesConfig || {};
  },

  updateRulesConfig(updates) {
    if (!this.data) this.init();
    this.data.rulesConfig = Object.assign(this.data.rulesConfig || {}, updates);
    this.persist();
    return this.data.rulesConfig;
  },

  getApprovalSettings() {
    if (!this.data) this.init();
    return this.data.approvalSettings || {};
  },

  updateApprovalSettings(updates) {
    if (!this.data) this.init();
    this.data.approvalSettings = Object.assign(this.data.approvalSettings || {}, updates);
    this.persist();
    return this.data.approvalSettings;
  },

  getNotificationSettings() {
    if (!this.data) this.init();
    return this.data.notificationSettings || {};
  },

  updateNotificationSettings(updates) {
    if (!this.data) this.init();
    this.data.notificationSettings = Object.assign(this.data.notificationSettings || {}, updates);
    this.persist();
    return this.data.notificationSettings;
  },

  // --- Role Simulation & Frontend Permission Checks ---

  ROLE_PERMISSIONS: {
    "Fleet Manager": {
      canPay: true,
      canAssign: true,
      canDispute: true,
      canCourt: true,
      canAddVehicle: true,
      canEditVehicle: true,
      canArchiveVehicle: true,
      canWriteOff: true,
      canConfigureSettings: true,
      canExport: true
    },
    "Finance": {
      canPay: true,
      canAssign: false,
      canDispute: false,
      canCourt: false,
      canAddVehicle: false,
      canEditVehicle: false,
      canArchiveVehicle: false,
      canWriteOff: true,
      canConfigureSettings: false,
      canExport: true
    },
    "Operations": {
      canPay: false,
      canAssign: true,
      canDispute: false,
      canCourt: false,
      canAddVehicle: true,
      canEditVehicle: true,
      canArchiveVehicle: true,
      canWriteOff: false,
      canConfigureSettings: false,
      canExport: true
    },
    "Legal": {
      canPay: false,
      canAssign: false,
      canDispute: true,
      canCourt: true,
      canAddVehicle: false,
      canEditVehicle: false,
      canArchiveVehicle: false,
      canWriteOff: false,
      canConfigureSettings: false,
      canExport: true
    },
    "Read-only": {
      canPay: false,
      canAssign: false,
      canDispute: false,
      canCourt: false,
      canAddVehicle: false,
      canEditVehicle: false,
      canArchiveVehicle: false,
      canWriteOff: false,
      canConfigureSettings: false,
      canExport: true
    }
  },

  getCurrentRole() {
    if (!this.data) this.init();
    const role = (this.data.currentUser && this.data.currentUser.role) || "Fleet Manager";
    if (role.toLowerCase().includes("compliance") || role.toLowerCase().includes("manager")) return "Fleet Manager";
    if (role.toLowerCase().includes("finance")) return "Finance";
    if (role.toLowerCase().includes("ops") || role.toLowerCase().includes("operations")) return "Operations";
    if (role.toLowerCase().includes("legal")) return "Legal";
    if (role.toLowerCase().includes("read")) return "Read-only";
    return role;
  },

  hasPermission(action) {
    const role = this.getCurrentRole();
    const perms = this.ROLE_PERMISSIONS[role] || this.ROLE_PERMISSIONS["Fleet Manager"];
    return Boolean(perms[action]);
  },

  checkPermissionOrNotify(action, actionName = "this operation") {
    if (this.hasPermission(action)) {
      return true;
    }
    const role = this.getCurrentRole();
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(
        "Action Restricted",
        `Your active simulated role (${role}) does not have permission to perform ${actionName}. Switch to 'Fleet Manager' in Settings to unlock.`,
        "warning"
      );
    }
    return false;
  },

  switchUserRole(newRole) {
    if (!this.data) this.init();
    if (!this.data.currentUser) this.data.currentUser = {};
    this.data.currentUser.role = newRole;
    this.persist();
    this.broadcast("user:role_changed", newRole);
    return this.data.currentUser;
  },

  updateRecoveryStatus(recoveryId, newStatus, notes = "") {
    if (!this.data) this.init();
    const rec = (this.data.recoveries || []).find(r => r.id === recoveryId);
    if (!rec) return null;

    rec.recoveryStatus = newStatus;
    rec.updatedAt = new Date().toISOString();
    if (notes) rec.notes = notes;

    if (rec.challanId) {
      const challan = this.getChallanById(rec.challanId);
      if (challan) {
        challan.recoveryStatus = newStatus;
      }
    }

    this.persist();
    return rec;
  },

  // --- Settings & Configuration Accessors ---

  getCompany() {
    if (!this.data) this.init();
    return this.data.company || { name: "Apex Fleet Pvt Ltd" };
  },

  updateCompany(updates) {
    if (!this.data) this.init();
    this.data.company = Object.assign(this.data.company || {}, updates);
    this.persist();
    return this.data.company;
  },

  getRulesConfig() {
    if (!this.data) this.init();
    return this.data.rulesConfig || {};
  },

  updateRulesConfig(updates) {
    if (!this.data) this.init();
    this.data.rulesConfig = Object.assign(this.data.rulesConfig || {}, updates);
    this.persist();
    return this.data.rulesConfig;
  },

  getApprovalSettings() {
    if (!this.data) this.init();
    return this.data.approvalSettings || {};
  },

  updateApprovalSettings(updates) {
    if (!this.data) this.init();
    this.data.approvalSettings = Object.assign(this.data.approvalSettings || {}, updates);
    this.persist();
    return this.data.approvalSettings;
  },

  getNotificationSettings() {
    if (!this.data) this.init();
    return this.data.notificationSettings || {};
  },

  updateNotificationSettings(updates) {
    if (!this.data) this.init();
    this.data.notificationSettings = Object.assign(this.data.notificationSettings || {}, updates);
    this.persist();
    return this.data.notificationSettings;
  },

  // --- Role Simulation & Frontend Permission Checks ---

  ROLE_PERMISSIONS: {
    "Fleet Manager": {
      canPay: true,
      canAssign: true,
      canDispute: true,
      canCourt: true,
      canAddVehicle: true,
      canEditVehicle: true,
      canArchiveVehicle: true,
      canWriteOff: true,
      canConfigureSettings: true,
      canExport: true
    },
    "Finance": {
      canPay: true,
      canAssign: false,
      canDispute: false,
      canCourt: false,
      canAddVehicle: false,
      canEditVehicle: false,
      canArchiveVehicle: false,
      canWriteOff: true,
      canConfigureSettings: false,
      canExport: true
    },
    "Operations": {
      canPay: false,
      canAssign: true,
      canDispute: false,
      canCourt: false,
      canAddVehicle: true,
      canEditVehicle: true,
      canArchiveVehicle: true,
      canWriteOff: false,
      canConfigureSettings: false,
      canExport: true
    },
    "Legal": {
      canPay: false,
      canAssign: false,
      canDispute: true,
      canCourt: true,
      canAddVehicle: false,
      canEditVehicle: false,
      canArchiveVehicle: false,
      canWriteOff: false,
      canConfigureSettings: false,
      canExport: true
    },
    "Read-only": {
      canPay: false,
      canAssign: false,
      canDispute: false,
      canCourt: false,
      canAddVehicle: false,
      canEditVehicle: false,
      canArchiveVehicle: false,
      canWriteOff: false,
      canConfigureSettings: false,
      canExport: true
    }
  },

  getCurrentRole() {
    if (!this.data) this.init();
    const role = (this.data.currentUser && this.data.currentUser.role) || "Fleet Manager";
    if (role.toLowerCase().includes("compliance") || role.toLowerCase().includes("manager")) return "Fleet Manager";
    if (role.toLowerCase().includes("finance")) return "Finance";
    if (role.toLowerCase().includes("ops") || role.toLowerCase().includes("operations")) return "Operations";
    if (role.toLowerCase().includes("legal")) return "Legal";
    if (role.toLowerCase().includes("read")) return "Read-only";
    return role;
  },

  hasPermission(action) {
    const role = this.getCurrentRole();
    const perms = this.ROLE_PERMISSIONS[role] || this.ROLE_PERMISSIONS["Fleet Manager"];
    return Boolean(perms[action]);
  },

  checkPermissionOrNotify(action, actionName = "this operation") {
    if (this.hasPermission(action)) {
      return true;
    }
    const role = this.getCurrentRole();
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(
        "Action Restricted",
        `Your active simulated role (${role}) does not have permission to perform ${actionName}. Switch to 'Fleet Manager' in Settings to unlock.`,
        "warning"
      );
    }
    return false;
  },

  switchUserRole(newRole) {
    if (!this.data) this.init();
    if (!this.data.currentUser) this.data.currentUser = {};
    this.data.currentUser.role = newRole;
    this.persist();
    this.broadcast("user:role_changed", newRole);
    return this.data.currentUser;
  },

  getDrivers() {
    return this.data.drivers || [];
  },

  getDriverById(id) {
    return (this.data.drivers || []).find(d => d.id === id || d.name === id);
  },

  getLessees() {
    return this.data.lessees || [];
  },

  getLesseeById(id) {
    return (this.data.lessees || []).find(l => l.id === id || l.name === id);
  },

  getNotifications() {
    return this.data.notifications || [];
  },

  markNotificationRead(id) {
    const notif = (this.data.notifications || []).find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.persist();
    }
  },

  markAllNotificationsRead() {
    (this.data.notifications || []).forEach(n => { n.read = true; });
    this.persist();
  },

  getCurrentUser() {
    return this.data.currentUser;
  },

  getWorkspaces() {
    return this.data.workspaces || [];
  },

  switchWorkspace(workspaceId) {
    const ws = this.getWorkspaces().find(w => w.id === workspaceId);
    if (ws) {
      this.data.currentUser.workspaceId = workspaceId;
      this.persist();
      this.broadcast("workspace:switched", ws);
      return ws;
    }
    return null;
  }
};

window.StorageManager = StorageManager;

