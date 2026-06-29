/* =============================================================================
   utils.js — shared helpers: formatting, escaping, avatars, auth guards.
   ============================================================================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarHtml(user, size = '') {
  if (!user) {
    return `<span class="avatar ${size}" style="background:#3a4564;color:#aab4cc;">?</span>`;
  }
  const bg = user.avatarColor || '#6366F1';
  return `<span class="avatar ${size}" style="background:${bg}" title="${escapeHtml(user.fullName)}">${initials(user.fullName)}</span>`;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Redirects to the login page if no token is present. Call at the top of protected pages. */
function requireAuth() {
  if (!TokenStore.getAccess()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function logout() {
  TokenStore.clear();
  if (window.PmSocket) window.PmSocket.disconnect();
  window.location.href = 'index.html';
}

function priorityColor(priority) {
  return { LOW: 'var(--success)', MEDIUM: 'var(--warning)', HIGH: 'var(--danger)' }[priority] || 'var(--text-muted)';
}

function statusLabel(status) {
  return { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }[status] || status;
}

function setButtonLoading(btn, loading, idleLabel) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.idleLabel = btn.dataset.idleLabel || idleLabel || btn.textContent;
    btn.innerHTML = `<span class="spinner"></span> Please wait…`;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.idleLabel || idleLabel || btn.textContent;
  }
}
