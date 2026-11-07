/**
 * ChallanOS - Reusable Utility Functions
 * Formatting, Rules Calculation, Toasts, Modals & CSV Export
 */

const Utils = {
  /**
   * Format numbers to Indian Rupee currency standard (e.g. ₹2,50,000)
   */
  formatINR(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  },

  /**
   * Format ISO date string into Indian human-readable date
   * e.g., "01 Mar 2026, 02:32 PM" or "01 Mar 2026"
   */
  formatDate(dateStr, includeTime = false) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    if (!includeTime) {
      return `${day} ${month} ${year}`;
    }

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours.toString().padStart(2, "0");

    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  },

  /**
   * Calculate difference between now and a due date
   */
  getDaysRemaining(dueDateStr) {
    if (!dueDateStr) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Generate semantic status badge markup
   */
  getStatusBadgeHTML(status) {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "unassigned":
        return `<span class="badge badge--unassigned"><span class="badge-dot"></span>Unassigned</span>`;
      case "assigned":
        return `<span class="badge badge--assigned"><span class="badge-dot"></span>Assigned</span>`;
      case "pending":
        return `<span class="badge badge--pending"><span class="badge-dot"></span>Pending</span>`;
      case "paid":
        return `<span class="badge badge--paid"><span class="badge-dot"></span>Paid</span>`;
      case "disputed":
        return `<span class="badge badge--disputed"><span class="badge-dot"></span>Disputed</span>`;
      case "court":
        return `<span class="badge badge--court"><span class="badge-dot"></span>In Court</span>`;
      default:
        return `<span class="badge badge--neutral">${status || "Unknown"}</span>`;
    }
  },

  /**
   * Responsibility Assignment Engine (Phase 7 - Core Business Logic)
   * Evaluates responsibility according to strict 5-level priority order:
   * 
   * Priority 1: Manual override exists -> Manually selected party
   * Priority 2: Driver allocation matches offence date/time -> Driver
   * Priority 3: Active lease contract and liability clause -> Lessee or Owner (Clause 7.2)
   * Priority 4: Fleet default rule exists -> Fleet operator (Statutory paperwork lapses or default asset)
   * Priority 5: No rule matches -> Unassigned
   * 
   * Conflict Handling (Step 7.5):
   * Overlapping driver/custody periods, missing contract dates, missing liability clause,
   * vehicle handover conflicts, or low-confidence suggestions will halt automated assignment
   * and flag an explicit Conflict Alert.
   */
  calculateResponsibility(challan, vehicle, drivers = [], lessees = []) {
    if (!challan) {
      return {
        partyType: "Unassigned",
        partyName: null,
        confidence: 0,
        confidenceLevel: "Low",
        priorityLevel: 5,
        hasConflict: false,
        reason: "No challan record provided for evaluation."
      };
    }

    // ------------------------------------------------------------------------
    // PRIORITY 1: MANUAL OVERRIDE EXISTS (Step 7.1 & Step 7.3)
    // ------------------------------------------------------------------------
    if (challan.manualOverrideReason || challan.manualOverride || (challan.responsibleParty && challan.responsibleParty !== "Unassigned" && challan.overrideReason)) {
      return {
        partyType: challan.responsibleParty,
        partyName: challan.responsiblePartyName || challan.responsibleParty,
        partyId: challan.responsiblePartyId || null,
        confidence: 100,
        confidenceLevel: "High",
        priorityLevel: 1,
        hasConflict: false,
        rule: "Priority 1 – Manual Override",
        reason: `Manual Override Applied: ${challan.manualOverrideReason || challan.overrideReason || "Manually designated by Fleet Compliance officer"}.`
      };
    }

    const offenceTime = challan.offenceDate ? new Date(challan.offenceDate).getTime() : null;

    // Check if this is a statutory paperwork/regulatory violation
    const isDocViolation = (challan.offence && (
      challan.offence.toLowerCase().includes("puc") ||
      challan.offence.toLowerCase().includes("pollution") ||
      challan.offence.toLowerCase().includes("fitness") ||
      challan.offence.toLowerCase().includes("insurance") ||
      challan.offence.toLowerCase().includes("rc") ||
      challan.offence.toLowerCase().includes("registration") ||
      challan.offence.toLowerCase().includes("permit") ||
      challan.offence.toLowerCase().includes("tax")
    ));

    // ------------------------------------------------------------------------
    // STEP 7.5: CONFLICT HANDLING ENGINE
    // Checks for overlapping custody periods, missing dates, or contract gaps
    // ------------------------------------------------------------------------
    if (vehicle && vehicle.responsibilityPeriods && vehicle.responsibilityPeriods.length > 0 && offenceTime) {
      // Find all responsibility periods overlapping this offence timestamp
      const matchingPeriods = vehicle.responsibilityPeriods.filter(p => {
        const start = new Date(p.startDate).getTime();
        const end = p.endDate ? new Date(p.endDate).getTime() : Infinity;
        return offenceTime >= start && offenceTime <= end;
      });

      // CONFLICT TYPE 1: Overlapping Custody / Handover Conflict (e.g. veh-9)
      if (matchingPeriods.length > 1) {
        const periodDesc = matchingPeriods.map(p => `${p.partyType}: ${p.partyName} (${p.startDate} to ${p.endDate || 'Active'})`).join(" VS ");
        return {
          partyType: "Unassigned",
          partyName: null,
          confidence: 20,
          confidenceLevel: "Low",
          priorityLevel: 5,
          hasConflict: true,
          conflictType: "Overlapping Custody Periods",
          conflictMessage: `Custody Conflict: Multiple conflicting responsibility periods overlap on offence date (${Utils.formatDate(challan.offenceDate)}).`,
          rule: "Conflict Protection Rule",
          reason: `Custody Conflict Detected: Vehicle had conflicting handover records on ${Utils.formatDate(challan.offenceDate)}. Colliding periods: [${periodDesc}]. Automated assignment halted to prevent improper deduction. Manual adjudication required.`
        };
      }

      // If exactly 1 responsibility period matches:
      if (matchingPeriods.length === 1) {
        const activePeriod = matchingPeriods[0];

        // If matching period is a Driver -> PRIORITY 2 MATCH (Moving infractions only)
        if (activePeriod.partyType === "Driver") {
          // If this is a paperwork violation, Driver does not bear statutory maintenance burden -> falls to Priority 4
          if (!isDocViolation) {
            return {
              partyType: "Driver",
              partyName: activePeriod.partyName,
              partyId: activePeriod.partyId || vehicle.currentDriverId || null,
              confidence: 94,
              confidenceLevel: "High",
              priorityLevel: 2,
              hasConflict: false,
              contractRef: activePeriod.contractRef || "DUTY-LOG-ACTIVE",
              rule: "Priority 2 – Driver Trip Allocation",
              reason: `Driver ${activePeriod.partyName} was allocated to vehicle under Duty Log / Roster ${activePeriod.contractRef || 'DUTY-LOG'} active on ${Utils.formatDate(challan.offenceDate, true)}. Infraction is a dynamic operational moving violation.`
            };
          }
        }

        // If matching period is a Lessee -> PRIORITY 3 MATCH
        if (activePeriod.partyType === "Lessee") {
          // Check contract liability clause (Step 7.5: Contract without liability clause)
          if (activePeriod.hasLiabilityClause === false || activePeriod.contractRef === "NO-INDEMNITY") {
            return {
              partyType: "Unassigned",
              partyName: null,
              confidence: 35,
              confidenceLevel: "Low",
              priorityLevel: 5,
              hasConflict: true,
              conflictType: "Contract Missing Liability Clause",
              conflictMessage: `Contract Clause Conflict: Master lease ${activePeriod.contractRef} lacks an explicit traffic fine indemnity clause.`,
              rule: "Conflict Protection Rule",
              reason: `Contract Gap: Vehicle was on lease to ${activePeriod.partyName} on ${Utils.formatDate(challan.offenceDate)}, but contract ${activePeriod.contractRef} does not contain statutory traffic fine indemnification clause 7.2. Liability requires manual agreement review.`
            };
          }

          return {
            partyType: "Lessee",
            partyName: activePeriod.partyName,
            partyId: activePeriod.partyId || vehicle.currentLesseeId || null,
            confidence: 88,
            confidenceLevel: "High",
            priorityLevel: 3,
            hasConflict: false,
            contractRef: activePeriod.contractRef || "ZL-2231",
            clause: "Contract Clause 7.2",
            rule: "Priority 3 – Lease Contract Clause 7.2",
            reason: `On ${Utils.formatDate(challan.offenceDate)}, the vehicle was leased to ${activePeriod.partyName} under contract ${activePeriod.contractRef || 'ZL-2231'}. Contract clause 7.2 specifies that the lessee is responsible for traffic fines.`
          };
        }

        // If matching period is Vehicle Owner -> PRIORITY 3 MATCH
        if (activePeriod.partyType === "Vehicle Owner") {
          return {
            partyType: "Vehicle Owner",
            partyName: activePeriod.partyName,
            confidence: 85,
            confidenceLevel: "High",
            priorityLevel: 3,
            hasConflict: false,
            contractRef: activePeriod.contractRef || "OWNER-INDEMNITY-2025",
            rule: "Priority 3 – Lessor / Owner Liability",
            reason: `Registered vehicle owner ${activePeriod.partyName} holds contractual liability under asset financing covenant ${activePeriod.contractRef || 'OWNER-INDEMNITY'}.`
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // PRIORITY 2: DRIVER ALLOCATION MATCHES OFFENCE DATE/TIME
    // (If not caught by responsibilityPeriods array, fallback to vehicle currentDriverId)
    // ------------------------------------------------------------------------
    if (vehicle && vehicle.currentDriverId) {
      const driver = drivers.find(d => d.id === vehicle.currentDriverId);
      if (driver) {
        const isMovingViolation = (challan.offence && (
          challan.offence.toLowerCase().includes("speed") ||
          challan.offence.toLowerCase().includes("seat belt") ||
          challan.offence.toLowerCase().includes("signal") ||
          challan.offence.toLowerCase().includes("phone") ||
          challan.offence.toLowerCase().includes("dangerous") ||
          challan.offence.toLowerCase().includes("lane") ||
          challan.offence.toLowerCase().includes("helmet") ||
          challan.offence.toLowerCase().includes("parking")
        ));

        if (isMovingViolation) {
          return {
            partyType: "Driver",
            partyName: driver.name,
            partyId: driver.id,
            confidence: 94,
            confidenceLevel: "High",
            priorityLevel: 2,
            hasConflict: false,
            contractRef: driver.licenseNumber || "ROSTER-TRIP-991",
            rule: "Priority 2 – Driver Trip Allocation",
            reason: `Driver ${driver.name} was logged on duty at ${Utils.formatDate(challan.offenceDate, true)}. Infraction is a dynamic operational moving violation (${challan.offence}).`
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // PRIORITY 3: ACTIVE LEASE CONTRACT AND LIABILITY CLAUSE
    // (If vehicle has active lessee contract dates)
    // ------------------------------------------------------------------------
    if (vehicle && vehicle.currentLesseeId) {
      const lessee = lessees.find(l => l.id === vehicle.currentLesseeId);
      if (lessee) {
        // Step 7.5: Missing contract dates check
        if (!vehicle.contractStart || !vehicle.contractEnd) {
          return {
            partyType: "Unassigned",
            partyName: null,
            confidence: 40,
            confidenceLevel: "Low",
            priorityLevel: 5,
            hasConflict: true,
            conflictType: "Missing Contract Dates",
            conflictMessage: `Contract Dates Missing: Lessee ${lessee.name} recorded on vehicle without verified term dates.`,
            rule: "Conflict Protection Rule",
            reason: `Lease contract dates are incomplete or unverified for ${lessee.name}. Automated attribution withheld pending contract verification.`
          };
        }

        // Check if offence date is within lease tenure
        if (offenceTime) {
          const cStart = new Date(vehicle.contractStart).getTime();
          const cEnd = new Date(vehicle.contractEnd).getTime();
          if (offenceTime >= cStart && offenceTime <= cEnd) {
            return {
              partyType: "Lessee",
              partyName: lessee.name,
              partyId: lessee.id,
              confidence: 88,
              confidenceLevel: "High",
              priorityLevel: 3,
              hasConflict: false,
              contractRef: vehicle.contractRef || "ZL-2231",
              clause: "Contract Clause 7.2",
              rule: "Priority 3 – Lease Contract Clause 7.2",
              reason: `On ${Utils.formatDate(challan.offenceDate)}, the vehicle was leased to ${lessee.name} under contract ${vehicle.contractRef || 'ZL-2231'}. Contract clause 7.2 specifies that the lessee is responsible for traffic fines.`
            };
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // PRIORITY 4: FLEET DEFAULT RULE EXISTS
    // Statutory paperwork / regulatory lapses OR vehicle defaultResponsibleParty
    // ------------------------------------------------------------------------
    if (isDocViolation || (vehicle && vehicle.defaultResponsibleParty === "Fleet Operator")) {
      const owner = vehicle ? vehicle.ownerName : "Apex Fleet Pvt Ltd";
      return {
        partyType: "Fleet Operator",
        partyName: owner,
        partyId: "ws-1",
        confidence: 92,
        confidenceLevel: "High",
        priorityLevel: 4,
        hasConflict: false,
        rule: "Priority 4 – Fleet Default Rule",
        reason: `Fleet Default Rule: Statutory vehicle fitness, paperwork renewal (PUC/RC/Insurance), and owner-level equipment compliance is a non-delegable obligation of the fleet operator (${owner}).`
      };
    }

    // ------------------------------------------------------------------------
    // PRIORITY 5: NO RULE MATCHES -> UNASSIGNED
    // ------------------------------------------------------------------------
    return {
      partyType: "Unassigned",
      partyName: null,
      partyId: null,
      confidence: 25,
      confidenceLevel: "Low",
      priorityLevel: 5,
      hasConflict: false,
      rule: "Priority 5 – Unassigned Triage",
      reason: `No active duty roster, lease contract, or statutory fleet default rule matched offence timestamp (${Utils.formatDate(challan.offenceDate)}). Manual compliance triage required.`
    };
  },

  /**
   * Display interactive Toast Notification
   */
  showToast(title, message = "", type = "info", duration = 3500) {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;

    let iconSvg = "";
    switch (type) {
      case "success":
        iconSvg = `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`;
        break;
      case "danger":
        iconSvg = `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`;
        break;
      case "warning":
        iconSvg = `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;
        break;
      default:
        iconSvg = `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ""}
      </div>
      <button class="toast-close" title="Dismiss" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    const removeToast = () => {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    };

    closeBtn.addEventListener("click", removeToast);
    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  },

  /**
   * Modal Open / Close Controller
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("show");
      if (document.body && document.body.style) {
        document.body.style.overflow = "hidden";
      }
      const focusable = modal.querySelector("button, input, select, textarea");
      if (focusable) focusable.focus();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("show");
      if (document.body && document.body.style) {
        document.body.style.overflow = "";
      }
    }
  },

  /**
   * Export Array of Objects to CSV file (supports both (data, filename) and (filename, data))
   */
  exportToCSV(first, second) {
    let dataArray = first;
    let filename = second || "challanos-export.csv";
    if (typeof first === "string" && Array.isArray(second)) {
      filename = first;
      dataArray = second;
    }

    if (!dataArray || !dataArray.length) {
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast("Export Failed", "No records found to export.", "warning");
      }
      return;
    }

    const headers = Object.keys(dataArray[0]);
    const csvRows = [headers.join(",")];

    dataArray.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) val = "";
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      });
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    Utils.showToast("Export Complete", `Downloaded ${filename} successfully.`, "success");
  },

  /**
   * Simple Debounce Helper
   */
  debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

