/* =============================================================================
   shell.js — renders the sidebar project list and notifications dropdown,
   shared by every authenticated page (dashboard.html, project.html).
   ============================================================================= */

const Shell = {
  async init({ activeProjectId } = {}) {
    if (!requireAuth()) return;

    const user = TokenStore.getUser();
    this.renderUserBadge(user);
    Theme.bindToggleButton(document.getElementById('theme-toggle'));

    document.getElementById('logout-btn')?.addEventListener('click', logout);

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    menuToggle?.addEventListener('click', () => sidebar.classList.toggle('open'));

    await this.renderProjectNav(activeProjectId);
    this.initNotifications();

    PmSocket.connect();
  },

  renderUserBadge(user) {
    const el = document.getElementById('current-user-badge');
    if (!el || !user) return;
    el.innerHTML = `${avatarHtml(user)} <span>${escapeHtml(user.fullName)}</span>`;
  },

  async renderProjectNav(activeProjectId) {
    const container = document.getElementById('sidebar-projects');
    if (!container) return;
    try {
      const projects = await Api.listProjects();
      if (projects.length === 0) {
        container.innerHTML = `<div style="padding:8px 12px; font-size:12.5px; color:var(--text-muted)">No projects yet</div>`;
        return;
      }
      container.innerHTML = projects.map((p) => `
        <a class="project-pill" href="project.html?id=${p.id}" style="${activeProjectId == p.id ? 'background:var(--bg-hover);color:var(--text-primary)' : ''}">
          <span class="project-dot" style="background:${p.color}"></span>
          <span class="mono" style="font-size:11px;color:var(--text-muted)">${escapeHtml(p.projectKey)}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(p.name)}</span>
        </a>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="padding:8px 12px;font-size:12.5px;color:var(--danger)">Couldn't load projects</div>`;
    }
  },

  initNotifications() {
    const btn = document.getElementById('notif-btn');
    const panel = document.getElementById('notif-panel');
    if (!btn || !panel) return;

    let open = false;
    const toggle = async (forceOpen) => {
      open = forceOpen !== undefined ? forceOpen : !open;
      panel.style.display = open ? 'block' : 'none';
      if (open) await this.loadNotifications();
    };

    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    document.addEventListener('click', (e) => {
      if (open && !panel.contains(e.target) && !btn.contains(e.target)) toggle(false);
    });

    this.refreshUnreadDot();

    panel.querySelector('.mark-all-read')?.addEventListener('click', async () => {
      await Api.markAllNotificationsRead();
      await this.loadNotifications();
      this.refreshUnreadDot();
    });

    PmSocket.subscribeNotifications((notification) => {
      Toast.info(notification.message);
      this.refreshUnreadDot();
      if (open) this.loadNotifications();
    });
  },

  async refreshUnreadDot() {
    const dot = document.getElementById('notif-dot');
    if (!dot) return;
    try {
      const { count } = await Api.unreadCount();
      dot.style.display = count > 0 ? 'block' : 'none';
    } catch { /* non-critical */ }
  },

  async loadNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.innerHTML = `<div class="page-loader" style="padding:30px 0"><span class="spinner"></span></div>`;
    try {
      const notifications = await Api.listNotifications();
      if (notifications.length === 0) {
        list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">You're all caught up</div>`;
        return;
      }
      list.innerHTML = notifications.slice(0, 20).map((n) => `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
          ${avatarHtml(n.actor)}
          <div>
            <p>${escapeHtml(n.message)}</p>
            <div class="notif-time">${timeAgo(n.createdAt)}</div>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.notif-item').forEach((item) => {
        item.addEventListener('click', async () => {
          await Api.markNotificationRead(item.dataset.id);
          item.classList.remove('unread');
          this.refreshUnreadDot();
        });
      });
    } catch {
      list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger);font-size:13px">Couldn't load notifications</div>`;
    }
  }
};
