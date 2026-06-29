/* =============================================================================
   dashboard.js — populates the user dashboard: stats, projects, assigned
   tasks, overdue tasks, and the recent activity feed.
   ============================================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  await Shell.init({});
  await loadDashboard();
  bindCreateProjectModal();
});

async function loadDashboard() {
  const root = document.getElementById('dashboard-root');
  try {
    const data = await Api.dashboard();
    renderStats(data.taskStats, data.unreadNotifications);
    renderProjects(data.projects);
    renderAssignedTasks(data.assignedTasks, data.overdueTasks);
    renderActivity(data.recentActivity);
  } catch (err) {
    Toast.error(err.message);
  }
}

function renderStats(stats, unread) {
  const el = document.getElementById('stat-grid');
  if (!el) return;
  const tiles = [
    { label: 'My Tasks', value: stats.total, color: 'var(--accent-2)' },
    { label: 'To Do', value: stats.todo, color: 'var(--text-muted)' },
    { label: 'In Progress', value: stats.inProgress, color: 'var(--info)' },
    { label: 'Done', value: stats.done, color: 'var(--success)' },
    { label: 'Overdue', value: stats.overdue, color: 'var(--danger)' },
    { label: 'Unread Alerts', value: unread, color: 'var(--accent)' }
  ];
  el.innerHTML = tiles.map((t) => `
    <div class="stat-tile" style="--accent-color:${t.color}">
      <div class="stat-label">${t.label}</div>
      <div class="stat-value">${t.value}</div>
    </div>
  `).join('');
}

function renderProjects(projects) {
  const el = document.getElementById('project-grid');
  if (!el) return;
  if (projects.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <p>No projects yet. Create your first one to get a board going.</p>
      </div>`;
    return;
  }
  el.innerHTML = projects.map((p) => {
    const pct = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
    return `
      <div class="project-card" onclick="window.location.href='project.html?id=${p.id}'">
        <div class="project-card-top">
          <span class="project-key-badge">${escapeHtml(p.projectKey)}</span>
          <span class="project-dot" style="background:${p.color};width:10px;height:10px;border-radius:50%"></span>
        </div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description || 'No description yet.')}</p>
        <div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%"></div></div>
        <div class="project-card-footer">
          <span>${p.doneTasks}/${p.totalTasks} tasks done</span>
          <span>${p.memberCount} member${p.memberCount === 1 ? '' : 's'}</span>
        </div>
      </div>`;
  }).join('');
}

function renderAssignedTasks(tasks, overdueTasks) {
  const el = document.getElementById('assigned-tasks-list');
  if (!el) return;
  const overdueIds = new Set(overdueTasks.map((t) => t.id));
  const sorted = [...tasks].filter(t => t.status !== 'DONE').slice(0, 8);

  if (sorted.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>Nothing assigned to you right now. Enjoy the quiet!</p></div>`;
    return;
  }
  el.innerHTML = sorted.map((t) => `
    <div class="member-row" style="cursor:pointer" onclick="window.location.href='project.html?id=${t.projectId}&task=${t.id}'">
      <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
      <div class="member-info">
        <div class="member-name">${escapeHtml(t.title)}</div>
        <div class="member-role mono">${escapeHtml(t.taskCode)}</div>
      </div>
      ${t.dueDate ? `<span class="task-due ${overdueIds.has(t.id) ? 'overdue' : ''}">${formatDateShort(t.dueDate)}</span>` : ''}
      <span class="badge badge-${t.status.toLowerCase()}">${statusLabel(t.status)}</span>
    </div>
  `).join('');
}

function renderActivity(activity) {
  const el = document.getElementById('activity-list');
  if (!el) return;
  if (activity.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No activity yet.</p></div>`;
    return;
  }
  el.innerHTML = activity.map((a) => `
    <div class="activity-item">
      ${avatarHtml(a.actor)}
      <div>
        <div class="activity-text"><strong>${escapeHtml(a.actor?.fullName || 'Someone')}</strong> ${escapeHtml(a.action)} <span style="color:var(--text-muted)">in ${escapeHtml(a.projectName)}</span></div>
        <div class="activity-time">${timeAgo(a.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

function bindCreateProjectModal() {
  const openBtn = document.getElementById('new-project-btn');
  const backdrop = document.getElementById('create-project-modal');
  const form = document.getElementById('create-project-form');
  if (!openBtn || !backdrop || !form) return;

  openBtn.addEventListener('click', () => { backdrop.style.display = 'flex'; });
  backdrop.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => backdrop.style.display = 'none'));

  form.name.addEventListener('input', () => {
    if (!form.projectKey.dataset.touched) {
      form.projectKey.value = form.name.value
        .split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 6);
    }
  });
  form.projectKey.addEventListener('input', () => { form.projectKey.dataset.touched = '1'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    setButtonLoading(btn, true, 'Create project');
    try {
      const project = await Api.createProject({
        name: form.name.value.trim(),
        description: form.description.value.trim(),
        projectKey: form.projectKey.value.trim().toUpperCase(),
        color: form.color.value
      });
      Toast.success(`Project "${project.name}" created`);
      window.location.href = `project.html?id=${project.id}`;
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });
}
