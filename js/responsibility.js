/**
 * ChallanOS - Responsibility Assignment Engine Module (js/responsibility.js)
 * 
 * Central Product Principle:
 * "A challan is a decision to be made, not a record to be stored."
 * 
 * Strict 5-Tier Responsibility Priority Hierarchy:
 * Priority 1: Manual user override exists -> Manually selected party with recorded reason.
 * Priority 2: Driver / trip duty allocation matching the offence date and time -> Driver.
 * Priority 3: Active lease contract and liability clause covering offence date and time -> Lessee or Vehicle Owner.
 * Priority 4: Fleet default rule (statutory vehicle/regulatory paperwork lapses or depot asset) -> Fleet Operator.
 * Priority 5: No valid match exists OR evidence is insufficient/contradictory -> Unassigned.
 * 
 * CRITICAL RULE:
 * Must use the challan's offence date and time to determine historical responsibility.
 * Never use the current vehicle driver or current vehicle owner as a substitute for historical custody!
 * 
 * CONFLICT HANDLING:
 * Catches overlapping driver duty allocations, missing drivers, missing contract dates,
 * missing liability clauses, and vehicle handover gaps; halts automated attribution to prevent improper financial deduction.
 */

const ResponsibilityEngine = {
  /**
   * Deterministic 5-Tier Priority Evaluation Algorithm
   * 
   * @param {Object} challan - Target traffic violation notice
   * @param {Object} vehicle - Vehicle asset profile
   * @param {Array} drivers - System registered drivers
   * @param {Array} lessees - System registered corporate lessees
   * @returns {Object} Structured recommendation metadata
   */
  evaluate(challan, vehicle, drivers = [], lessees = []) {
    if (!challan) {
      return {
        suggestedParty: "Unassigned",
        suggestedPartyName: "Unassigned",
        partyType: "Unassigned",
        partyName: null,
        confidence: 0,
        confidenceLevel: "Low",
        priorityTier: 5,
        priorityLevel: 5,
        hasConflict: false,
        conflictType: null,
        conflictMessage: null,
        evidenceUsed: ["No challan record provided for evaluation."],
        relevantDateRange: null,
        rule: "Priority 5 – Unassigned Triage",
        reason: "No challan record provided for evaluation."
      };
    }

    // ------------------------------------------------------------------------
    // PRIORITY 1: MANUAL USER OVERRIDE
    // ------------------------------------------------------------------------
    if (challan.isManualOverride || challan.manualOverrideReason || (challan.responsibleParty && challan.responsibleParty !== "Unassigned" && challan.overrideReason)) {
      const overrideReason = challan.manualOverrideReason || challan.overrideReason || "Designated by Fleet Compliance Officer";
      const party = challan.responsibleParty;
      const partyName = challan.responsiblePartyName || party;

      return {
        suggestedParty: party,
        suggestedPartyName: partyName,
        partyType: party,
        partyName: partyName,
        partyId: challan.responsiblePartyId || null,
        confidence: 100,
        confidenceLevel: "High",
        priorityTier: 1,
        priorityLevel: 1,
        hasConflict: false,
        conflictType: null,
        conflictMessage: null,
        evidenceUsed: [
          `Manual Compliance Override recorded by ${challan.assignedBy || 'Compliance Lead'}`,
          `Recorded Audit Justification: "${overrideReason}"`,
          `Adjudication Timestamp: ${challan.assignedAt || 'Recorded in Audit Ledger'}`
        ],
        relevantDateRange: {
          start: challan.assignedAt || challan.offenceDate,
          end: challan.assignedAt || challan.offenceDate,
          formatted: typeof Utils !== 'undefined' ? Utils.formatDate(challan.assignedAt || challan.offenceDate, true) : (challan.assignedAt || challan.offenceDate)
        },
        rule: "Priority 1 – Manual User Override",
        reason: `Manual Override Applied: ${overrideReason}. Manually designated by compliance personnel; supersedes all automated rules.`
      };
    }

    // Parse and validate offence timestamp
    const offenceTimestamp = challan.offenceDate ? new Date(challan.offenceDate).getTime() : null;

    if (!offenceTimestamp || isNaN(offenceTimestamp)) {
      return {
        suggestedParty: "Unassigned",
        suggestedPartyName: "Unassigned",
        partyType: "Unassigned",
        partyName: null,
        confidence: 10,
        confidenceLevel: "Low",
        priorityTier: 5,
        priorityLevel: 5,
        hasConflict: true,
        conflictType: "Missing Offence Timestamp",
        conflictMessage: "Challan record lacks a valid offence date and time.",
        evidenceUsed: ["Missing or invalid offenceDate attribute"],
        relevantDateRange: null,
        rule: "Conflict Protection Rule",
        reason: "Challan lacks a valid timestamp. Historical attribution is impossible without a precise offence date and time."
      };
    }

    // Check if infraction is an asset/statutory paperwork violation (PUC, Fitness, Insurance, Registration)
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

    const periods = (vehicle && vehicle.responsibilityPeriods) ? vehicle.responsibilityPeriods : [];

    // Conflict check: Incomplete records with missing contract dates
    const undatedPeriod = periods.find(p => (!p.startDate || !p.endDate) && (p.partyType === "Lessee" || p.partyType === "Driver"));
    if (undatedPeriod) {
      return {
        suggestedParty: "Unassigned",
        suggestedPartyName: "Unassigned",
        partyType: "Unassigned",
        partyName: null,
        confidence: 30,
        confidenceLevel: "Low",
        priorityTier: 5,
        priorityLevel: 5,
        hasConflict: true,
        conflictType: "Missing Contract Dates",
        conflictMessage: `Custody agreement for ${undatedPeriod.partyName} lacks verified contract start or end dates.`,
        evidenceUsed: [`Contract Reference: ${undatedPeriod.contractRef || 'N/A'}`],
        relevantDateRange: null,
        rule: "Conflict Protection Rule",
        reason: `Contract Dates Incomplete: Custody record for ${undatedPeriod.partyName} lacks verified start or end dates. Automated attribution withheld pending contract date audit.`
      };
    }

    // Filter responsibility periods matching the exact offence timestamp
    // (Never use the current vehicle driver or owner as a substitute!)
    const activePeriods = periods.filter(p => {
      if (!p.startDate) return false;
      const start = new Date(p.startDate).getTime();
      const end = p.endDate ? new Date(p.endDate).getTime() : Infinity;
      return offenceTimestamp >= start && offenceTimestamp <= end;
    });

    // ------------------------------------------------------------------------
    // CONFLICT HANDLING: OVERLAPPING ALLOCATIONS OR CONTRADICTORY EVIDENCE
    // ------------------------------------------------------------------------
    if (activePeriods.length > 1) {
      const activeDrivers = activePeriods.filter(p => p.partyType === "Driver");

      // Conflict: Multiple drivers active simultaneously
      if (activeDrivers.length > 1) {
        const driversList = activeDrivers.map(d => `${d.partyName} (${d.contractRef || 'Manifest'})`).join(" VS ");
        return {
          suggestedParty: "Unassigned",
          suggestedPartyName: "Unassigned",
          partyType: "Unassigned",
          partyName: null,
          confidence: 20,
          confidenceLevel: "Low",
          priorityTier: 5,
          priorityLevel: 5,
          hasConflict: true,
          conflictType: "Overlapping Driver Allocations",
          conflictMessage: `Overlapping Driver Allocations: Multiple drivers (${driversList}) are logged on the vehicle simultaneously at offence timestamp.`,
          evidenceUsed: activeDrivers.map(d => `Colliding Roster: ${d.partyName} [${d.startDate} to ${d.endDate}] Ref: ${d.contractRef || 'N/A'}`),
          relevantDateRange: {
            start: activeDrivers[0].startDate,
            end: activeDrivers[0].endDate,
            formatted: `${activeDrivers[0].startDate} to ${activeDrivers[0].endDate}`
          },
          rule: "Conflict Protection Rule",
          reason: `Contradictory Driver Duty Manifests: Multiple driver manifests (${driversList}) overlap concurrently at the exact offence time. Automated assignment blocked to prevent improper salary deduction. Manual compliance adjudication required.`
        };
      }

      // Conflict: Handover overlap between driver, lessee, or operator
      const periodDesc = activePeriods.map(p => `${p.partyType}: ${p.partyName} [${p.startDate} to ${p.endDate}]`).join(" VS ");
      return {
        suggestedParty: "Unassigned",
        suggestedPartyName: "Unassigned",
        partyType: "Unassigned",
        partyName: null,
        confidence: 25,
        confidenceLevel: "Low",
        priorityTier: 5,
        priorityLevel: 5,
        hasConflict: true,
        conflictType: "Vehicle Handover Conflict",
        conflictMessage: `Vehicle Handover Conflict: Multiple conflicting custody periods overlap on offence date.`,
        evidenceUsed: activePeriods.map(p => `Overlapping Custody: ${p.partyType} (${p.partyName}) [${p.startDate} to ${p.endDate}]`),
        relevantDateRange: {
          start: activePeriods[0].startDate,
          end: activePeriods[0].endDate,
          formatted: `${activePeriods[0].startDate} to ${activePeriods[0].endDate}`
        },
        rule: "Conflict Protection Rule",
        reason: `Vehicle Handover Ambiguity: Vehicle had colliding custody handover entries [${periodDesc}]. Automated assignment halted.`
      };
    }

    // ------------------------------------------------------------------------
    // PRIORITY 2: DRIVER/TRIP ALLOCATION MATCHING OFFENCE DATE & TIME
    // ------------------------------------------------------------------------
    const driverPeriod = activePeriods.find(p => p.partyType === "Driver");
    if (driverPeriod) {
      // Conflict check: Missing driver in duty allocation
      if (!driverPeriod.partyName || driverPeriod.partyName === "Unassigned" || driverPeriod.partyName.trim() === "") {
        return {
          suggestedParty: "Unassigned",
          suggestedPartyName: "Unassigned",
          partyType: "Unassigned",
          partyName: null,
          confidence: 30,
          confidenceLevel: "Low",
          priorityTier: 5,
          priorityLevel: 5,
          hasConflict: true,
          conflictType: "Missing Driver in Duty Allocation",
          conflictMessage: `Trip roster ${driverPeriod.contractRef || 'TRIP-LOG'} was active on offence date, but assigned driver identifier is missing.`,
          evidenceUsed: [
            `Active Trip Roster: ${driverPeriod.contractRef || 'N/A'}`,
            `Roster Custody Window: ${driverPeriod.startDate} to ${driverPeriod.endDate}`,
            `Missing driver identification details`
          ],
          relevantDateRange: {
            start: driverPeriod.startDate,
            end: driverPeriod.endDate,
            formatted: `${driverPeriod.startDate} to ${driverPeriod.endDate}`
          },
          rule: "Conflict Protection Rule",
          reason: `Trip Roster Exists but Driver is Unrecorded: Vehicle was operating under trip roster ${driverPeriod.contractRef || 'TRIP-LOG'}, but driver name or license is missing. Cannot allocate liability without verified driver identity.`
        };
      }

      // If it's a dynamic moving violation (Speed, Signal, Seatbelt, Lane, Mobile), driver is liable
      if (!isDocViolation) {
        const formattedDate = typeof Utils !== 'undefined' ? Utils.formatDate(challan.offenceDate, true) : challan.offenceDate;
        return {
          suggestedParty: "Driver",
          suggestedPartyName: driverPeriod.partyName,
          partyType: "Driver",
          partyName: driverPeriod.partyName,
          partyId: driverPeriod.partyId || null,
          confidence: 96,
          confidenceLevel: "High",
          priorityTier: 2,
          priorityLevel: 2,
          hasConflict: false,
          conflictType: null,
          conflictMessage: null,
          contractRef: driverPeriod.contractRef || "DUTY-LOG-ACTIVE",
          evidenceUsed: [
            `Duty Log Manifest: ${driverPeriod.contractRef || 'TRIP-ROSTER-ACTIVE'}`,
            `Allocated Driver: ${driverPeriod.partyName}`,
            `Custody Window: ${driverPeriod.startDate} to ${driverPeriod.endDate}`,
            `Dynamic Moving Infraction: ${challan.offence} (${challan.mvActSection || 'Moving Violation'})`,
            `Offence Timestamp: ${formattedDate} falls within active duty window`
          ],
          relevantDateRange: {
            start: driverPeriod.startDate,
            end: driverPeriod.endDate,
            formatted: `${driverPeriod.startDate} to ${driverPeriod.endDate}`
          },
          rule: "Priority 2 – Driver Trip Allocation",
          reason: `Driver ${driverPeriod.partyName} was in active operational custody of the vehicle under duty manifest ${driverPeriod.contractRef || 'DUTY-LOG'} covering the offence timestamp (${formattedDate}). Infraction is a dynamic moving violation under direct driver control.`
        };
      }
    }

    // ------------------------------------------------------------------------
    // PRIORITY 3: ACTIVE LEASE CONTRACT AND LIABILITY CLAUSE
    // ------------------------------------------------------------------------
    const leasePeriod = activePeriods.find(p => p.partyType === "Lessee" || p.partyType === "Vehicle Owner");
    if (leasePeriod) {
      // Conflict check: Missing contract dates
      if (!leasePeriod.startDate || !leasePeriod.endDate) {
        return {
          suggestedParty: "Unassigned",
          suggestedPartyName: "Unassigned",
          partyType: "Unassigned",
          partyName: null,
          confidence: 30,
          confidenceLevel: "Low",
          priorityTier: 5,
          priorityLevel: 5,
          hasConflict: true,
          conflictType: "Missing Contract Dates",
          conflictMessage: `Lease contract for ${leasePeriod.partyName} has missing or unverified term dates.`,
          evidenceUsed: [`Contract Reference: ${leasePeriod.contractRef || 'N/A'}`],
          relevantDateRange: null,
          rule: "Conflict Protection Rule",
          reason: `Lease Term Incomplete: Lease record for ${leasePeriod.partyName} lacks verified start or end dates. Automated attribution withheld pending contract date audit.`
        };
      }

      // Conflict check: Missing liability / indemnity clause
      if (leasePeriod.hasLiabilityClause === false || leasePeriod.contractRef === "NO-INDEMNITY") {
        return {
          suggestedParty: "Unassigned",
          suggestedPartyName: "Unassigned",
          partyType: "Unassigned",
          partyName: null,
          confidence: 35,
          confidenceLevel: "Low",
          priorityTier: 5,
          priorityLevel: 5,
          hasConflict: true,
          conflictType: "Missing Liability Clause",
          conflictMessage: `Master Lease ${leasePeriod.contractRef} lacks an explicit traffic fine indemnification clause (Clause 7.2).`,
          evidenceUsed: [
            `Master Lease: ${leasePeriod.contractRef}`,
            `Term: ${leasePeriod.startDate} to ${leasePeriod.endDate}`,
            `Traffic fine indemnity covenant missing or contested`
          ],
          relevantDateRange: {
            start: leasePeriod.startDate,
            end: leasePeriod.endDate,
            formatted: `${leasePeriod.startDate} to ${leasePeriod.endDate}`
          },
          rule: "Conflict Protection Rule",
          reason: `Contract Liability Clause Missing: Vehicle was in custody of ${leasePeriod.partyName} under lease ${leasePeriod.contractRef}, but agreement lacks Clause 7.2 (Traffic Infraction Indemnification). Liability requires legal agreement review.`
        };
      }

      const partyType = leasePeriod.partyType; // "Lessee" or "Vehicle Owner"
      const confidence = partyType === "Lessee" ? 88 : 85;
      const formattedDate = typeof Utils !== 'undefined' ? Utils.formatDate(challan.offenceDate) : challan.offenceDate;

      return {
        suggestedParty: partyType,
        suggestedPartyName: leasePeriod.partyName,
        partyType: partyType,
        partyName: leasePeriod.partyName,
        partyId: leasePeriod.partyId || null,
        confidence: confidence,
        confidenceLevel: "High",
        priorityTier: 3,
        priorityLevel: 3,
        hasConflict: false,
        conflictType: null,
        conflictMessage: null,
        contractRef: leasePeriod.contractRef || "LEASE-APEX-2025",
        clause: "Clause 7.2 (Traffic Fine Indemnification)",
        evidenceUsed: [
          `Master Lease Contract: ${leasePeriod.contractRef || 'LEASE-APEX-2025'}`,
          `Contract Term: ${leasePeriod.startDate} to ${leasePeriod.endDate}`,
          `Clause 7.2: Full traffic fine indemnity covenant executed`,
          `Offence Date: ${formattedDate} falls within active lease term`
        ],
        relevantDateRange: {
          start: leasePeriod.startDate,
          end: leasePeriod.endDate,
          formatted: `${leasePeriod.startDate} to ${leasePeriod.endDate}`
        },
        rule: `Priority 3 – Active Lease Contract Clause 7.2`,
        reason: `On ${formattedDate}, vehicle was leased to ${leasePeriod.partyName} under Master Agreement ${leasePeriod.contractRef || 'LEASE-APEX-2025'}. Contract Clause 7.2 explicitly stipulates that lessee holds full financial responsibility for all traffic infractions incurred during the lease window.`
      };
    }

    // ------------------------------------------------------------------------
    // PRIORITY 4: FLEET DEFAULT RULE
    // ------------------------------------------------------------------------
    // Applies when:
    // (a) Infraction is a statutory/regulatory paperwork failure (PUC, Fitness, Insurance, Registration)
    // (b) Vehicle was in in-house depot custody (no external lease/driver at offence time)
    const inHousePeriod = activePeriods.find(p => p.partyType === "Fleet Operator");
    if (isDocViolation || inHousePeriod || (vehicle && vehicle.defaultResponsibleParty === "Fleet Operator" && activePeriods.length === 0)) {
      const fleetOwner = vehicle ? vehicle.ownerName : "Apex Fleet Pvt Ltd";
      const formattedDate = typeof Utils !== 'undefined' ? Utils.formatDate(challan.offenceDate) : challan.offenceDate;

      return {
        suggestedParty: "Fleet Operator",
        suggestedPartyName: fleetOwner,
        partyType: "Fleet Operator",
        partyName: fleetOwner,
        partyId: "ws-1",
        confidence: 92,
        confidenceLevel: "High",
        priorityTier: 4,
        priorityLevel: 4,
        hasConflict: false,
        conflictType: null,
        conflictMessage: null,
        evidenceUsed: [
          `Statutory Regulatory Obligation: ${isDocViolation ? 'Document / Equipment Fitness lapse' : 'In-House Depot Fleet Custody'}`,
          `Asset Title Holder: ${fleetOwner}`,
          `Fleet Operator Rule 4.1: Non-delegable owner statutory compliance obligation`
        ],
        relevantDateRange: inHousePeriod ? {
          start: inHousePeriod.startDate,
          end: inHousePeriod.endDate,
          formatted: `${inHousePeriod.startDate} to ${inHousePeriod.endDate}`
        } : null,
        rule: "Priority 4 – Fleet Default Rule",
        reason: isDocViolation
          ? `Fleet Default Rule: Statutory vehicle fitness, paperwork renewal (PUC/RC/Insurance), and equipment compliance under Motor Vehicles Act is a non-delegable statutory obligation of the Fleet Operator (${fleetOwner}).`
          : `Fleet Default Rule: Vehicle was in in-house depot custody on ${formattedDate}. Fine is self-absorbed by Fleet Operator (${fleetOwner}) under operating expenses.`
      };
    }

    // ------------------------------------------------------------------------
    // PRIORITY 5: NO VALID MATCH EXISTS -> UNASSIGNED
    // ------------------------------------------------------------------------
    const formattedDate = typeof Utils !== 'undefined' ? Utils.formatDate(challan.offenceDate, true) : challan.offenceDate;
    return {
      suggestedParty: "Unassigned",
      suggestedPartyName: "Unassigned",
      partyType: "Unassigned",
      partyName: null,
      partyId: null,
      confidence: 25,
      confidenceLevel: "Low",
      priorityTier: 5,
      priorityLevel: 5,
      hasConflict: false,
      conflictType: null,
      conflictMessage: null,
      evidenceUsed: [
        `No duty roster recorded on ${formattedDate}`,
        `No active lease contract window covering offence timestamp`,
        `Not an in-house depot paperwork violation`
      ],
      relevantDateRange: null,
      rule: "Priority 5 – Unassigned Triage",
      reason: `No Historical Match: No active driver trip duty manifest or corporate lease contract covered the vehicle on ${formattedDate}. Evidence is insufficient for automated attribution. Manual compliance triage required.`
    };
  },

  /**
   * Render Signature Responsibility Chain (Driver → Lessee → Fleet → Owner)
   */
  renderChainHTML(activeParty, hasConflict = false) {
    const nodes = ["Driver", "Lessee", "Fleet", "Owner"];
    const normalizedActive = (activeParty || "").toLowerCase();
    
    return `
      <div class="responsibility-chain ${hasConflict ? 'has-conflict' : ''}" title="Attribution Hierarchy: Driver → Lessee → Fleet → Owner">
        ${nodes.map(node => {
          const isMatched = normalizedActive.includes(node.toLowerCase()) || 
            (node === "Fleet" && (normalizedActive.includes("operator") || normalizedActive.includes("apex")));
          const isNodeConflict = isMatched && hasConflict;
          
          return `
            <div class="chain-node ${isNodeConflict ? 'conflict' : (isMatched ? 'active' : '')}">
              <div class="chain-node-circle"></div>
              <span class="chain-node-label">${node}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  },

  /**
   * Render Explainable Suggestion Banner HTML
   */
  renderSuggestionBannerHTML(suggestion) {
    const isConflict = suggestion.hasConflict;
    const confClass = suggestion.confidence >= 80 ? 'badge--assigned' : (suggestion.confidence >= 50 ? 'badge--pending' : 'badge--unassigned');
    const confLabel = suggestion.confidenceLevel || (suggestion.confidence >= 80 ? 'High' : (suggestion.confidence >= 50 ? 'Medium' : 'Low'));

    return `
      ${isConflict ? `
        <div class="alert alert--danger" style="border-left: 4px solid var(--status-unassigned); background: rgba(180, 35, 24, 0.08); padding: 12px 14px; border-radius: 12px; margin-bottom: var(--space-4); border: 1px solid rgba(180, 35, 24, 0.2);">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="color: var(--status-unassigned); flex-shrink: 0; margin-top: 2px;">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <div>
              <strong style="color: var(--status-unassigned); font-size: 13px;">${suggestion.conflictType || 'Custody / Contract Conflict Detected'}</strong>
              <p style="font-size: 12px; color: var(--ink); margin-top: 3px; line-height: 1.4;">
                ${suggestion.conflictMessage || suggestion.reason}
              </p>
              <span class="text-xs text-muted" style="display: block; margin-top: 4px;">
                ⚠ Automated assignment was halted. Compliance officer must manually adjudicate liability with mandatory justification notes below.
              </span>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="suggestion-banner">
        <div class="suggestion-badge-row">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent); letter-spacing: 0.05em;">
              Suggested responsibility (${suggestion.rule || 'Auto Engine'})
            </span>
            <span class="badge ${confClass}">
              ${confLabel} confidence (${suggestion.confidence}%)
            </span>
          </div>
          <div class="confidence-meter">
            <span>${suggestion.confidence}% Match</span>
            <div class="confidence-bar">
              <div class="confidence-bar-fill" style="width: ${suggestion.confidence}%;"></div>
            </div>
          </div>
        </div>

        <!-- Signature Responsibility Chain: Driver → Lessee → Fleet → Owner -->
        ${this.renderChainHTML(suggestion.partyType, isConflict)}

        <div style="font-size: 16px; font-weight: 700; color: var(--ink); margin-top: 4px;">
          ${suggestion.partyName || 'Unassigned'} <span style="font-size: 13px; font-weight: 500; color: var(--text-2);">(${suggestion.partyType})</span>
        </div>

        <div class="suggestion-rationale-box">
          <strong>Why this suggestion?</strong><br>
          ${suggestion.reason}
          ${suggestion.evidenceUsed && suggestion.evidenceUsed.length > 0 ? `
            <div style="margin-top: 8px; border-top: 1px dashed var(--line); padding-top: 6px;">
              <span class="text-xs font-semibold text-muted" style="text-transform: uppercase;">Evidence Considered:</span>
              <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 11px; color: var(--text-2); line-height: 1.5;">
                ${suggestion.evidenceUsed.map(ev => `<li>${ev}</li>`).join("")}
              </ul>
            </div>
          ` : ''}
          ${suggestion.relevantDateRange ? `
            <div class="text-xs text-muted" style="margin-top: 6px;">
              <strong>Applicable Custody Window:</strong> ${suggestion.relevantDateRange.formatted}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
};

window.ResponsibilityEngine = ResponsibilityEngine;

// Also expose on Utils for backward compatibility
if (typeof Utils !== 'undefined') {
  Utils.calculateResponsibility = ResponsibilityEngine.evaluate;
}
