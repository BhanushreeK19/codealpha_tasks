/* =============================================================================
   theme.js — dark/light mode toggle, persisted in localStorage.
   ============================================================================= */

const Theme = {
  KEY: 'pmtool_theme',

  init() {
    const saved = localStorage.getItem(this.KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(this.KEY, next);
    document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  },

  bindToggleButton(buttonEl) {
    if (!buttonEl) return;
    const render = () => {
      const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
      buttonEl.innerHTML = isDark
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    };
    render();
    buttonEl.addEventListener('click', () => { this.toggle(); render(); });
  }
};

Theme.init();
