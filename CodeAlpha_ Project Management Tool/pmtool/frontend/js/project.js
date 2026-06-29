/* =============================================================================
   project.js — the Kanban board page: boards, drag-and-drop tasks, the task
   detail modal with live comments, members management, and activity feed.
   ============================================================================= */

const state = {
  projectId: null,
  project: null,
  boards: [],          // [{id, name, position, tasks:[...]}]
  activeBoardId: null,
  members: [],
  currentUserId: TokenStore.getUser()?.id,
  myRole: 'MEMBER',
  activity: [],
  openTaskId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  state.projectId = Number(qs('id'));
  if (!state.projectId) { window.location.href = 'dashboard.html'; return; }

  await Shell.init({ activeProjectId: state.projectId });
  bindTabs();
  bindModals();
  await loadEverything();
  bindLiveUpdates();

  const taskParam = qs('task');
  if (taskParam) openTaskModal(Number(taskParam));
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
async function loadEverything() {
  try {
    const [project, boards, members] = await Promise.all([
      Api.getProject(state.projectId),
      Api.listBoards(state.projectId),
      Api.listMembers(state.projectId)
    ]);
    state.project = project;
    state.boards = boards;
    state.members = members;
    state.activeBoardId = boards[0]?.id ?? null;
    const mine = members.find((m) => m.user.id === state.currentUserId);
    state.myRole = mine ? mine.projectRole : 'MEMBER';

    renderProjectHeader();
    renderBoardTabs();
    renderActiveBoard();
    renderMembers();
    loadActivity();
  } catch (err) {
    Toast.error(err.message);
    if (err.status === 403 || err.status === 404) {
      setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }
  }
}

async function loadActivity() {
  try {
    state.activity = await Api.projectActivity(state.projectId);
    renderActivity();
  } catch { /* non-critical */ }
}

// ---------------------------------------------------------------------------
// Header / permissions
// ---------------------------------------------------------------------------
function canManage() { return state.myRole === 'OWNER' || state.myRole === 'MANAGER'; }
function isOwner() { return state.myRole === 'OWNER'; }

function renderProjectHeader() {
  const p = state.project;
  document.getElementById('project-key-badge').textContent = p.projectKey;
  document.getElementById('project-key-badge').style.color = p.color;
  document.getElementById('project-title').textContent = p.name;
  document.getElementById('project-description').textContent = p.description || 'No description yet.';
  document.title = `${p.name} — PM Tool`;

  document.getElementById('settings-btn').style.display = canManage() ? '' : 'none';
  document.getElementById('invite-btn').style.display = canManage() ? '' : 'none';

  document.getElementById('settings-name').value = p.name;
  document.getElementById('settings-description').value = p.description || '';
  document.getElementById('settings-color').value = p.color;
  document.getElementById('delete-project-btn').style.display = isOwner() ? '' : 'none';
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).style.display = '';
    });
  });
}

// ---------------------------------------------------------------------------
// Board tabs + rendering
// ---------------------------------------------------------------------------
function renderBoardTabs() {
  const el = document.getElementById("board-tabs");

  el.innerHTML =
    state.boards.map((b) => `
      <div style="display:flex;align-items:center;gap:6px;">
        <button
          class="btn btn-sm ${
            b.id === state.activeBoardId ? "btn-secondary" : "btn-ghost"
          }"
          data-board="${b.id}">
          ${escapeHtml(b.name)}
        </button>

        ${
          canManage()
            ? `<button
                class="btn btn-danger btn-sm delete-board-btn"
                data-delete-board="${b.id}"
                title="Delete board">
                🗑
              </button>`
            : ""
        }
      </div>
    `).join("") +
    `<button class="btn btn-sm btn-ghost" id="add-board-btn">+ Board</button>`;

  // Switch board
  el.querySelectorAll("[data-board]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeBoardId = Number(btn.dataset.board);
      renderBoardTabs();
      renderActiveBoard();
    });
  });

  // Delete board
  el.querySelectorAll("[data-delete-board]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      if (!confirm("Delete this board?")) return;

      try {
        await Api.deleteBoard(btn.dataset.deleteBoard);

        state.boards = state.boards.filter(
          (b) => b.id != btn.dataset.deleteBoard
        );

        state.activeBoardId = state.boards.length
          ? state.boards[0].id
          : null;

        renderBoardTabs();
        renderActiveBoard();

        Toast.success("Board deleted");
      } catch (err) {
        Toast.error(err.message);
      }
    });
  });

  document.getElementById("add-board-btn").addEventListener("click", async () => {
    const name = prompt("Name this board:");
    if (!name) return;

    try {
      const board = await Api.createBoard(state.projectId, { name });

      state.boards.push({
        ...board,
        tasks: []
      });

      state.activeBoardId = board.id;

      renderBoardTabs();
      renderActiveBoard();

      Toast.success("Board created");
    } catch (err) {
      Toast.error(err.message);
    }
  });
}

const COLUMNS = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' }
];

function activeBoard() { return state.boards.find((b) => b.id === state.activeBoardId); }

function renderActiveBoard() {
  const wrap = document.getElementById('board-columns');
  const board = activeBoard();
  if (!board) { wrap.innerHTML = `<div class="empty-state"><p>No board yet.</p></div>`; return; }

  wrap.innerHTML = COLUMNS.map((col) => {
    const tasks = board.tasks.filter((t) => t.status === col.status).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return `
      <div class="board-column">
        <div class="board-column-header">
          <span>${col.label}</span>
          <span class="column-count">${tasks.length}</span>
        </div>
        <div class="column-cards" data-status="${col.status}">
          ${tasks.map(taskCardHtml).join('')}
        </div>
        <button class="column-add-task" data-status="${col.status}">+ Add task</button>
      </div>`;
  }).join('');

  wireBoardInteractions(wrap, board);
}

function taskCardHtml(t) {
  return `
    <div class="task-card" draggable="true" data-task-id="${t.id}" style="--prio-color:${priorityColor(t.priority)}">
      <div class="task-card-top">
        <span class="task-code">${escapeHtml(t.taskCode)}</span>
        <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
      </div>
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-card-footer">
        <div class="task-meta-left">
          ${t.assignee ? avatarHtml(t.assignee) : ''}
          ${t.dueDate ? `<span class="task-due ${t.overdue ? 'overdue' : ''}">📅 ${formatDateShort(t.dueDate)}</span>` : ''}
        </div>
        ${t.commentCount > 0 ? `<span class="task-comment-count">💬 ${t.commentCount}</span>` : ''}
      </div>
    </div>`;
}

function wireBoardInteractions(wrap, board) {
  // open task modal on click
  wrap.querySelectorAll('.task-card').forEach((card) => {
    card.addEventListener('click', () => openTaskModal(Number(card.dataset.taskId)));
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.taskId);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  // quick-add buttons
  wrap.querySelectorAll('.column-add-task').forEach((btn) => {
    btn.addEventListener('click', () => openCreateTaskModal(btn.dataset.status));
  });

  // drop zones
  wrap.querySelectorAll('.column-cards').forEach((columnEl) => {
    columnEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      columnEl.classList.add('drag-over');
    });
    columnEl.addEventListener('dragleave', () => columnEl.classList.remove('drag-over'));
    columnEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      columnEl.classList.remove('drag-over');
      const taskId = Number(e.dataTransfer.getData('text/plain'));
      const newStatus = columnEl.dataset.status;
      const task = board.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const targetTasks = board.tasks.filter((t) => t.status === newStatus && t.id !== taskId);
      const newPosition = targetTasks.length;

      const prevStatus = task.status;
      const prevPosition = task.position;
      task.status = newStatus;
      task.position = newPosition;
      renderActiveBoard(); // optimistic UI update

      try {
        await Api.moveTask(taskId, { status: newStatus, position: newPosition });
      } catch (err) {
        task.status = prevStatus;
        task.position = prevPosition;
        renderActiveBoard();
        Toast.error(err.message);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Create task modal
// ---------------------------------------------------------------------------
function bindModals() {
  bindCreateTaskModal();
  bindTaskDetailModal();
  bindSettingsModal();
  bindInviteForm();
}

let pendingCreateStatus = 'TODO';

function bindCreateTaskModal() {
  const backdrop = document.getElementById('create-task-modal');
  const form = document.getElementById('create-task-form');
  backdrop.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => backdrop.style.display = 'none'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    setButtonLoading(btn, true, 'Create task');
    try {
      const task = await Api.createTask({
        boardId: state.activeBoardId,
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        priority: form.priority.value,
        dueDate: form.dueDate.value || null,
        assigneeId: form.assigneeId.value || null
      });
      if (pendingCreateStatus !== 'TODO') {
        const board = activeBoard();
        const position = board.tasks.filter((t) => t.status === pendingCreateStatus).length;
        await Api.moveTask(task.id, { status: pendingCreateStatus, position });
      }
      Toast.success('Task created');
      backdrop.style.display = 'none';
      form.reset();
      await refreshActiveBoardTasks();
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

function openCreateTaskModal(status) {
  pendingCreateStatus = status;
  const backdrop = document.getElementById('create-task-modal');
  const form = document.getElementById('create-task-form');
  document.getElementById('create-task-modal-title').textContent = `New task — ${statusLabel(status)}`;
  populateAssigneeSelect(form.assigneeId);
  backdrop.style.display = 'flex';
  form.title.focus();
}

function populateAssigneeSelect(selectEl) {
  selectEl.innerHTML = `<option value="">Unassigned</option>` +
    state.members.map((m) => `<option value="${m.user.id}">${escapeHtml(m.user.fullName)}</option>`).join('');
}

async function refreshActiveBoardTasks() {
  const boards = await Api.listBoards(state.projectId);
  state.boards = boards;
  renderActiveBoard();
}

// ---------------------------------------------------------------------------
// Task detail modal (view / edit / comments)
// ---------------------------------------------------------------------------
function bindTaskDetailModal() {
  const backdrop = document.getElementById('task-modal');
  backdrop.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeTaskModal));

  document.getElementById('task-status').addEventListener('change', (e) => patchTask({ status: e.target.value }));
  document.getElementById('task-priority').addEventListener('change', (e) => patchTask({ priority: e.target.value }));
  document.getElementById('task-due-date').addEventListener('change', (e) => patchTask({ dueDate: e.target.value || null }));
  document.getElementById('task-assignee').addEventListener('change', (e) => patchTask({ assigneeId: e.target.value || null }));
  document.getElementById('task-title-input').addEventListener('blur', (e) => {
    if (e.target.value.trim()) patchTask({ title: e.target.value.trim() });
  });
  document.getElementById('task-description-input').addEventListener('blur', (e) => {
    patchTask({ description: e.target.value });
  });
  document.getElementById('delete-task-btn').addEventListener('click', async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await Api.deleteTask(state.openTaskId);
      Toast.success('Task deleted');
      closeTaskModal();
      await refreshActiveBoardTasks();
    } catch (err) { Toast.error(err.message); }
  });

  document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const textarea = document.getElementById('comment-input');
    const content = textarea.value.trim();
    if (!content) return;
    try {
      await Api.addComment(state.openTaskId, { content, mentionedUsernames: extractMentions(content) });
      textarea.value = '';
      // The live websocket push will append the comment to the thread.
    } catch (err) { Toast.error(err.message); }
  });
}

function extractMentions(text) {
  const matches = text.match(/@(\w+)/g) || [];
  return matches.map((m) => m.slice(1));
}

async function openTaskModal(taskId) {
  state.openTaskId = taskId;
  const backdrop = document.getElementById('task-modal');
  backdrop.style.display = 'flex';
  document.getElementById('task-detail-body').style.opacity = '0.4';

  try {
    const [task, comments] = await Promise.all([Api.getTask(taskId), Api.listComments(taskId)]);
    populateTaskModal(task);
    renderComments(comments);
    PmSocket.subscribeTaskComments(taskId, (comment) => {
      if (state.openTaskId === taskId) appendComment(comment);
    });
  } catch (err) {
    Toast.error(err.message);
    closeTaskModal();
  } finally {
    document.getElementById('task-detail-body').style.opacity = '1';
  }
}

function closeTaskModal() {
  document.getElementById('task-modal').style.display = 'none';
  if (state.openTaskId) PmSocket.unsubscribeTaskComments(state.openTaskId);
  state.openTaskId = null;
  // clean the ?task= param without reloading
  const url = new URL(window.location.href);
  url.searchParams.delete('task');
  window.history.replaceState({}, '', url);
}

function populateTaskModal(task) {
  document.getElementById('task-code-label').textContent = task.taskCode;
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-description-input').value = task.description || '';
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-due-date').value = task.dueDate || '';
  populateAssigneeSelect(document.getElementById('task-assignee'));
  document.getElementById('task-assignee').value = task.assignee?.id || '';
  document.getElementById('task-reporter-label').textContent = task.reporter?.fullName || '—';
  document.getElementById('delete-task-btn').style.display = canManage() || task.reporter?.id === state.currentUserId ? '' : 'none';
}

async function patchTask(partial) {
  try {
    const updated = await Api.updateTask(state.openTaskId, partial);
    syncTaskIntoBoard(updated);
  } catch (err) {
    Toast.error(err.message);
  }
}

function syncTaskIntoBoard(updatedTask) {
  const board = state.boards.find((b) => b.id === updatedTask.boardId);
  if (!board) return;
  const idx = board.tasks.findIndex((t) => t.id === updatedTask.id);
  if (idx >= 0) board.tasks[idx] = updatedTask;
  else board.tasks.push(updatedTask);
  if (board.id === state.activeBoardId) renderActiveBoard();
}

function renderComments(comments) {
  const el = document.getElementById('comment-thread');
  el.innerHTML = '';
  comments.forEach(appendComment);
}

function appendComment(c) {
  const el = document.getElementById('comment-thread');
  if (el.querySelector(`[data-comment-id="${c.id}"]`)) return; // avoid dupes from echo
  const item = document.createElement('div');
  item.className = 'comment-item';
  item.dataset.commentId = c.id;
  item.innerHTML = `
    ${avatarHtml(c.author)}
    <div class="comment-body">
      <div class="comment-meta">
        <span class="comment-author">${escapeHtml(c.author?.fullName || 'Unknown')}</span>
        <span class="comment-time">${timeAgo(c.createdAt)}</span>
      </div>
      <div class="comment-text">${escapeHtml(c.content)}</div>
    </div>`;
  el.appendChild(item);
  el.scrollTop = el.scrollHeight;
}

// ---------------------------------------------------------------------------
// Members tab
// ---------------------------------------------------------------------------
function renderMembers() {
  const el = document.getElementById('members-list');
  el.innerHTML = state.members.map((m) => `
    <div class="member-row">
      ${avatarHtml(m.user, 'lg')}
      <div class="member-info">
        <div class="member-name">${escapeHtml(m.user.fullName)}</div>
        <div class="member-role">@${escapeHtml(m.user.username)} · ${m.projectRole}</div>
      </div>
      ${canManage() && m.projectRole !== 'OWNER' ? `<button class="btn btn-ghost btn-sm" data-remove="${m.user.id}">Remove</button>` : ''}
    </div>
  `).join('');

  el.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this member from the project?')) return;
      try {
        await Api.removeMember(state.projectId, btn.dataset.remove);
        state.members = state.members.filter((m) => String(m.user.id) !== btn.dataset.remove);
        renderMembers();
        Toast.success('Member removed');
      } catch (err) { Toast.error(err.message); }
    });
  });

  document.getElementById('invite-section').style.display = canManage() ? '' : 'none';
}

function bindInviteForm() {
  const form = document.getElementById('invite-form');
  if (!form) return;
  const input = form.usernameOrEmail;
  const suggestions = document.getElementById('invite-suggestions');

  input.addEventListener('input', debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { suggestions.innerHTML = ''; return; }
    try {
      const users = await Api.searchUsers(q);
      suggestions.innerHTML = users.map((u) => `<div class="member-row" style="cursor:pointer" data-pick="${u.username}">${avatarHtml(u)}<div class="member-info"><div class="member-name">${escapeHtml(u.fullName)}</div><div class="member-role">@${escapeHtml(u.username)}</div></div></div>`).join('');
      suggestions.querySelectorAll('[data-pick]').forEach((row) => {
        row.addEventListener('click', () => { input.value = row.dataset.pick; suggestions.innerHTML = ''; });
      });
    } catch { /* ignore */ }
  }, 300));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    setButtonLoading(btn, true, 'Invite');
    try {
      const membership = await Api.inviteMember(state.projectId, {
        usernameOrEmail: input.value.trim(),
        projectRole: form.projectRole.value
      });
      state.members.push(membership);
      renderMembers();
      form.reset();
      suggestions.innerHTML = '';
      Toast.success(`${membership.user.fullName} added to the project`);
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });

  document.getElementById('invite-btn')?.addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="members"]').click();
    input.focus();
  });
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------
function renderActivity() {
  const el = document.getElementById('project-activity-list');
  if (!el) return;
  if (state.activity.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No activity yet.</p></div>`;
    return;
  }
  el.innerHTML = state.activity.map((a) => `
    <div class="activity-item">
      ${avatarHtml(a.actor)}
      <div>
        <div class="activity-text"><strong>${escapeHtml(a.actor?.fullName || 'Someone')}</strong> ${escapeHtml(a.action)}</div>
        <div class="activity-time">${timeAgo(a.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

// ---------------------------------------------------------------------------
// Project settings modal
// ---------------------------------------------------------------------------
function bindSettingsModal() {
  const backdrop = document.getElementById('settings-modal');
  document.getElementById('settings-btn')?.addEventListener('click', () => backdrop.style.display = 'flex');
  backdrop.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => backdrop.style.display = 'none'));

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const updated = await Api.updateProject(state.projectId, {
        name: form.name.value.trim(),
        description: form.description.value.trim(),
        color: form.color.value
      });
      state.project = { ...state.project, ...updated };
      renderProjectHeader();
      await Shell.renderProjectNav(state.projectId);
      backdrop.style.display = 'none';
      Toast.success('Project updated');
    } catch (err) { Toast.error(err.message); }
  });

  document.getElementById('delete-project-btn').addEventListener('click', async () => {
    if (!confirm(`Delete "${state.project.name}" permanently? All boards, tasks and comments will be lost.`)) return;
    try {
      await Api.deleteProject(state.projectId);
      Toast.success('Project deleted');
      window.location.href = 'dashboard.html';
    } catch (err) { Toast.error(err.message); }
  });
}

// ---------------------------------------------------------------------------
// Live updates (WebSocket)
// ---------------------------------------------------------------------------
function bindLiveUpdates() {
  PmSocket.subscribeProjectTasks(state.projectId, ({ event, data }) => {
    if (event === 'TASK_DELETED') {
      state.boards.forEach((b) => { b.tasks = b.tasks.filter((t) => t.id !== data.id); });
    } else {
      syncTaskIntoBoard(data);
    }
    renderActiveBoard();
  });

  PmSocket.subscribeProjectActivity(state.projectId, (entry) => {
    state.activity.unshift(entry);
    renderActivity();
  });
}
