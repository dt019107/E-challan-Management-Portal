/**
 * ChallanOS Real-time Validation Engine (Usability Psychologist Skill)
 * Cognitive load reduction, constructive real-time feedback, and error prevention.
 */

const Validators = {
  // Indian State Code Mapping for Positive Recognition Feedback
  STATE_CODES: {
    DL: "Delhi NCR",
    MH: "Maharashtra",
    KA: "Karnataka",
    HR: "Haryana",
    UP: "Uttar Pradesh",
    TN: "Tamil Nadu",
    TS: "Telangana",
    GJ: "Gujarat",
    RJ: "Rajasthan",
    WB: "West Bengal",
    KL: "Kerala",
    MP: "Madhya Pradesh",
    PB: "Punjab",
    AP: "Andhra Pradesh",
    CH: "Chandigarh",
    UK: "Uttarakhand",
    UA: "Uttarakhand",
    HP: "Himachal Pradesh",
    JH: "Jharkhand",
    OR: "Odisha",
    OD: "Odisha",
    BR: "Bihar",
    AS: "Assam",
    GA: "Goa"
  },

  /**
   * Validate Indian Vehicle Registration Plate (Standard & BH Series)
   * Examples: DL-01-AB-1234, MH12DE1420, 22-BH-1234-AA
   */
  validateVehiclePlate(rawPlate) {
    if (!rawPlate || typeof rawPlate !== "string") {
      return { isValid: false, message: "Registration plate cannot be blank." };
    }

    const cleaned = rawPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (cleaned.length < 6 || cleaned.length > 11) {
      return {
        isValid: false,
        message: "Plate length invalid (standard format is 8-10 alphanumeric characters)."
      };
    }

    // Check Bharat (BH) Series e.g. 22BH1234AB
    const bhMatch = cleaned.match(/^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/);
    if (bhMatch) {
      const year = bhMatch[1];
      const series = bhMatch[4];
      return {
        isValid: true,
        type: "BH_SERIES",
        stateName: "All-India Bharat Series",
        formatted: `${year}-BH-${bhMatch[3]}-${series}`,
        message: `Valid All-India Bharat Series (${year} Batch)`
      };
    }

    // Standard State Format: e.g. DL01AB1234 or MH12A1234
    const stateMatch = cleaned.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{4})$/);
    if (!stateMatch) {
      return {
        isValid: false,
        message: "Format should match: State (2 letters) + RTO (2 digits) + Series (1-3 letters) + Number (4 digits)."
      };
    }

    const stateCode = stateMatch[1];
    const rtoCode = stateMatch[2].padStart(2, "0");
    const series = stateMatch[3] || "";
    const number = stateMatch[4];

    const stateName = this.STATE_CODES[stateCode] || `State (${stateCode})`;
    const formatted = series
      ? `${stateCode}-${rtoCode}-${series}-${number}`
      : `${stateCode}-${rtoCode}-${number}`;

    return {
      isValid: true,
      type: "STATE_SERIES",
      stateCode,
      stateName,
      formatted,
      message: `Valid ${stateName} Commercial Carriage (${formatted})`
    };
  },

  /**
   * Validate Challan Notice Number
   * Examples: DL884120, DL-884120, MH12-2026-9912
   */
  validateChallanNumber(rawChallanNo) {
    if (!rawChallanNo || typeof rawChallanNo !== "string") {
      return { isValid: false, message: "Notice number is required." };
    }

    const cleaned = rawChallanNo.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");

    if (cleaned.length < 5 || cleaned.length > 25) {
      return {
        isValid: false,
        message: "Notice number must be between 5 and 25 characters."
      };
    }

    return {
      isValid: true,
      formatted: cleaned,
      message: "Valid Parivahan notice reference structure."
    };
  },

  /**
   * Validate Indian Mobile Number (10 digits starting with 6, 7, 8, or 9)
   */
  validatePhone(rawPhone) {
    if (!rawPhone) return { isValid: true, message: "Optional contact" };
    const cleaned = String(rawPhone).replace(/\D/g, "");
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return {
        isValid: true,
        formatted: `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`,
        message: "Valid Indian mobile number."
      };
    }
    return {
      isValid: false,
      message: "Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9."
    };
  },

  /**
   * Bind real-time input event listeners with inline visual feedback
   */
  bindFieldValidation(inputEl, validatorFn, feedbackEl) {
    if (!inputEl) return;

    const runValidation = () => {
      const val = inputEl.value;
      if (!val || val.trim() === "") {
        inputEl.classList.remove("input--valid", "input--invalid");
        if (feedbackEl) {
          feedbackEl.innerHTML = "";
          feedbackEl.className = "input-feedback-text text-xs text-muted";
        }
        return;
      }

      const res = validatorFn(val);
      if (res.isValid) {
        inputEl.classList.add("input--valid");
        inputEl.classList.remove("input--invalid");
        if (feedbackEl) {
          feedbackEl.className = "input-feedback-text input-feedback--success text-xs";
          feedbackEl.innerHTML = `<span style="color: var(--brand-emerald); display: inline-flex; vertical-align: middle;">${Utils.icon('check', 13)}</span> ${res.message}`;
        }
      } else {
        inputEl.classList.add("input--invalid");
        inputEl.classList.remove("input--valid");
        if (feedbackEl) {
          feedbackEl.className = "input-feedback-text input-feedback--error text-xs";
          feedbackEl.innerHTML = `<span style="color: var(--brand-red); display: inline-flex; vertical-align: middle;">${Utils.icon('alert', 13)}</span> ${res.message}`;
        }
      }
    };

    inputEl.addEventListener("input", runValidation);
    inputEl.addEventListener("blur", runValidation);
  }
};

window.Validators = Validators;
