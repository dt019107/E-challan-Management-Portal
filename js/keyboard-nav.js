/**
 * ChallanOS High-Speed Keyboard Navigation & Focus Trap Engine (Accessibility Engineer Skill)
 * Provides WCAG 2.1 AA/AAA compliance, strict modal focus trapping, and J/K fleet table triage.
 */

const KeyboardNav = {
  activeRowIndex: -1,
  activeTableSelector: ".data-table tbody tr",
  lastFocusedElement: null,
  activeModal: null,

  init() {
    this.bindGlobalShortcuts();
    this.enhanceModalFocusTraps();
  },

  /**
   * Check if user is currently typing in an input, textarea, or contenteditable
   */
  isInputActive() {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      active.isContentEditable
    );
  },

  /**
   * Trap focus strictly within an open modal dialog
   */
  trapModalFocus(modalEl) {
    if (!modalEl) return;
    this.lastFocusedElement = document.activeElement;
    this.activeModal = modalEl;

    // Accessibility landmarks
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-modal", "true");

    const focusables = this.getFocusableElements(modalEl);
    if (focusables.length > 0) {
      // Focus first interactive control or input
      const firstInput = modalEl.querySelector("input:not([type='hidden']), select, textarea");
      const target = firstInput || focusables[0];
      setTimeout(() => target.focus(), 50);
    }
  },

  /**
   * Release modal focus trap and return focus to triggering element
   */
  releaseModalFocus() {
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === "function") {
      this.lastFocusedElement.focus();
    }
    this.activeModal = null;
    this.lastFocusedElement = null;
  },

  /**
   * Query all interactive focusable elements inside a container
   */
  getFocusableElements(container) {
    const selector = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector)).filter(el => {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
    });
  },

  /**
   * Handle Tab / Shift+Tab cycling inside active modal
   */
  handleModalTab(e) {
    if (!this.activeModal) return;
    const focusables = this.getFocusableElements(this.activeModal);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  },

  /**
   * Get all visible interactive table rows in current view
   */
  getVisibleTableRows() {
    const tables = Array.from(document.querySelectorAll(".data-table"));
    const visibleTable = tables.find(t => t.offsetParent !== null);
    if (!visibleTable) return [];
    return Array.from(visibleTable.querySelectorAll("tbody tr"));
  },

  /**
   * Highlight and focus a specific row index
   */
  selectRow(index, scroll = true) {
    const rows = this.getVisibleTableRows();
    if (!rows.length) return;

    // Constrain index
    const clampedIndex = Math.max(0, Math.min(index, rows.length - 1));
    this.activeRowIndex = clampedIndex;

    rows.forEach((r, idx) => {
      if (idx === clampedIndex) {
        r.classList.add("keyboard-active-row");
        r.setAttribute("tabindex", "0");
        if (scroll) {
          r.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      } else {
        r.classList.remove("keyboard-active-row");
        r.removeAttribute("tabindex");
      }
    });
  },

  /**
   * Bind global keydown listeners
   */
  bindGlobalShortcuts() {
    document.addEventListener("keydown", (e) => {
      // 1. If a modal is open
      if (this.activeModal || document.querySelector(".modal-backdrop.show")) {
        const openModal = this.activeModal || document.querySelector(".modal-backdrop.show");

        if (e.key === "Escape") {
          e.preventDefault();
          if (typeof Utils !== "undefined" && Utils.closeModal) {
            Utils.closeModal(openModal.id);
          }
          return;
        }

        if (e.key === "Tab") {
          this.handleModalTab(e);
          return;
        }
        return;
      }

      // 2. Ignore keystrokes if typing inside text fields
      if (this.isInputActive()) {
        if (e.key === "Escape") {
          document.activeElement.blur();
        }
        return;
      }

      // 3. Global Shortcuts Modal (? or Shift + /)
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        if (typeof Utils !== "undefined" && Utils.openModal) {
          Utils.openModal("keyboardShortcutsModal");
        }
        return;
      }

      // 4. Quick Search Focus (/)
      if (e.key === "/" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const searchInput = document.querySelector(".filter-toolbar input[type='text'], .search-box input, #globalSearchInput");
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 5. Table Navigation: J or ArrowDown (Next Row)
      if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
        const rows = this.getVisibleTableRows();
        if (rows.length) {
          e.preventDefault();
          this.selectRow(this.activeRowIndex + 1);
        }
        return;
      }

      // 6. Table Navigation: K or ArrowUp (Previous Row)
      if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
        const rows = this.getVisibleTableRows();
        if (rows.length) {
          e.preventDefault();
          this.selectRow(this.activeRowIndex - 1);
        }
        return;
      }

      // 7. Activate Selected Row (Enter)
      if (e.key === "Enter" && this.activeRowIndex >= 0) {
        const rows = this.getVisibleTableRows();
        const activeRow = rows[this.activeRowIndex];
        if (activeRow) {
          e.preventDefault();
          const clickTarget = activeRow.querySelector("a, button, .row-interactive") || activeRow;
          clickTarget.click();
        }
        return;
      }

      // 8. Toggle Selection Checkbox (X or Space)
      if ((e.key === "x" || e.key === "X" || e.key === " ") && this.activeRowIndex >= 0) {
        const rows = this.getVisibleTableRows();
        const activeRow = rows[this.activeRowIndex];
        if (activeRow) {
          const checkbox = activeRow.querySelector("input[type='checkbox']");
          if (checkbox) {
            e.preventDefault();
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        return;
      }
    });
  },

  /**
   * Hook into Utils openModal / closeModal to auto-manage focus trap
   */
  enhanceModalFocusTraps() {
    if (typeof Utils !== "undefined") {
      const origOpen = Utils.openModal;
      const origClose = Utils.closeModal;

      Utils.openModal = (modalId) => {
        if (origOpen) origOpen.call(Utils, modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
          KeyboardNav.trapModalFocus(modal);
        }
      };

      Utils.closeModal = (modalId) => {
        if (origClose) origClose.call(Utils, modalId);
        KeyboardNav.releaseModalFocus();
      };
    }
  }
};

window.KeyboardNav = KeyboardNav;

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => KeyboardNav.init());
} else {
  KeyboardNav.init();
}
