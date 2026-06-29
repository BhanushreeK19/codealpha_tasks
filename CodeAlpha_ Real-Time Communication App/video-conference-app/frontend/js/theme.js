/* ==========================================================================
   Confera — Theme toggle (dark mode default)
   ========================================================================== */

(function () {
  const STORAGE_KEY = "confera_theme";

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-toggle .icon-sun, .theme-toggle .icon-moon").forEach((el) => {
      el.style.display = "none";
    });
    document.querySelectorAll(`.theme-toggle .icon-${theme === "dark" ? "sun" : "moon"}`).forEach((el) => {
      el.style.display = "inline-flex";
    });
  }

  const saved = localStorage.getItem(STORAGE_KEY) || "dark";
  apply(saved);

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, next);
        apply(next);
      });
    });
  });
})();
