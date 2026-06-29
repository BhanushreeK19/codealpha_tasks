/* ==========================================================================
   Confera — Toast notifications
   ========================================================================== */

(function () {
  function ensureContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };

  const COLORS = { success: "var(--color-success)", error: "var(--color-danger)", warning: "var(--color-warning)", info: "var(--color-accent)" };

  function showToast(message, type = "info", title = null, duration = 4200) {
    const container = ensureContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const defaultTitles = { success: "Success", error: "Something went wrong", warning: "Heads up", info: "Notice" };

    toast.innerHTML = `
      <span class="toast-icon" style="color:${COLORS[type] || COLORS.info}">${ICONS[type] || ICONS.info}</span>
      <div class="toast-body">
        <div class="toast-title">${title || defaultTitles[type]}</div>
        <div class="toast-msg"></div>
      </div>
      <button class="toast-close" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    toast.querySelector(".toast-msg").textContent = message;

    function dismiss() {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 220);
    }

    toast.querySelector(".toast-close").addEventListener("click", dismiss);
    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
    return dismiss;
  }

  window.toast = {
    success: (msg, title) => showToast(msg, "success", title),
    error: (msg, title) => showToast(msg, "error", title),
    warning: (msg, title) => showToast(msg, "warning", title),
    info: (msg, title) => showToast(msg, "info", title),
  };
})();
