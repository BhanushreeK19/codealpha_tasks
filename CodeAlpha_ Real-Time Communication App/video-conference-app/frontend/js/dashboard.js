/* ==========================================================================
   Confera — Dashboard page logic
   ========================================================================== */

Auth.requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  renderUserChrome();
  bindModals();
  await loadDashboard();
});

function renderUserChrome() {
  const user = Auth.getUser();
  if (!user) return;
  document.querySelectorAll(".js-user-name").forEach((el) => (el.textContent = user.fullName));
  document.querySelectorAll(".js-user-email").forEach((el) => (el.textContent = user.email));
  document.querySelectorAll(".js-user-initials").forEach((el) => (el.textContent = Auth.initials(user.fullName)));

  document.querySelectorAll(".js-logout").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.logout();
    })
  );
}

async function loadDashboard() {
  const [hosted, history] = await Promise.allSettled([api.get("/meetings/hosted"), api.get("/meetings/history")]);

  const hostedList = hosted.status === "fulfilled" ? hosted.value : [];
  const historyList = history.status === "fulfilled" ? history.value : [];

  renderStats(hostedList, historyList);
  renderMeetingList(document.getElementById("recentMeetings"), historyList.slice(0, 6));
}

function renderStats(hosted, history) {
  const totalMinutes = history.reduce((sum, m) => {
    if (m.startedAt && m.endedAt) {
      return sum + Math.max(0, (new Date(m.endedAt) - new Date(m.startedAt)) / 60000);
    }
    return sum;
  }, 0);

  setText("statHosted", hosted.length);
  setText("statAttended", history.length);
  setText("statMinutes", Math.round(totalMinutes));
  setText("statLive", history.filter((m) => m.status === "ACTIVE").length);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderMeetingList(container, meetings) {
  if (!container) return;

  if (!meetings.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-4v12l-6-4"/></svg>
        <h4>No meetings yet</h4>
        <p>Create or join a meeting to see it here.</p>
      </div>`;
    return;
  }

  container.innerHTML = meetings
    .map((m) => {
      const statusBadge =
        m.status === "ACTIVE"
          ? '<span class="badge badge-live">Live</span>'
          : m.status === "SCHEDULED"
          ? '<span class="badge badge-warning">Scheduled</span>'
          : '<span class="badge badge-muted">Ended</span>';

      const when = m.startedAt || m.scheduledAt || m.createdAt;
      const dateStr = when ? new Date(when).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

      return `
      <div class="card meeting-row">
        <div class="meeting-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-4v12l-6-4"/></svg>
        </div>
        <div class="meeting-info">
          <div class="meeting-title">${escapeHtml(m.title)}</div>
          <div class="meeting-meta">
            <span class="mono">${m.meetingCode}</span>
            <span>•</span>
            <span>${dateStr}</span>
            <span>•</span>
            <span>Host: ${escapeHtml(m.host.fullName)}</span>
            ${statusBadge}
          </div>
        </div>
        <div class="meeting-actions">
          ${m.status !== "ENDED" ? `<button class="btn btn-primary btn-sm js-rejoin" data-code="${m.meetingCode}">Rejoin</button>` : `<span class="btn btn-secondary btn-sm" style="opacity:.5;cursor:default">Ended</span>`}
        </div>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".js-rejoin").forEach((btn) =>
    btn.addEventListener("click", () => {
      window.location.href = `meeting.html?code=${btn.dataset.code}`;
    })
  );
}

function bindModals() {
  // Create meeting
  const createBtn = document.querySelectorAll(".js-open-create-meeting");
  const createModal = document.getElementById("createMeetingModal");
  const createForm = document.getElementById("createMeetingForm");

  createBtn.forEach((b) => b.addEventListener("click", () => createModal?.classList.remove("hidden")));
  createModal?.querySelectorAll(".js-close-modal").forEach((b) => b.addEventListener("click", () => createModal.classList.add("hidden")));

  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("meetingTitle").value.trim() || "Untitled Meeting";
    const description = document.getElementById("meetingDescription").value.trim();
    const waitingRoomEnabled = document.getElementById("waitingRoomToggle")?.checked || false;
    const submitBtn = createForm.querySelector('button[type="submit"]');

    setLoading(submitBtn, true);
    try {
      const meeting = await api.post("/meetings", { title, description, waitingRoomEnabled });
      toast.success(`Meeting "${meeting.title}" is ready.`);
      window.location.href = `meeting.html?code=${meeting.meetingCode}`;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(submitBtn, false);
    }
  });

  // Join meeting
  const joinBtn = document.querySelectorAll(".js-open-join-meeting");
  const joinModal = document.getElementById("joinMeetingModal");
  const joinForm = document.getElementById("joinMeetingForm");

  joinBtn.forEach((b) => b.addEventListener("click", () => joinModal?.classList.remove("hidden")));
  joinModal?.querySelectorAll(".js-close-modal").forEach((b) => b.addEventListener("click", () => joinModal.classList.add("hidden")));

  joinForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("joinMeetingCode").value.trim();
    if (!code) {
      toast.error("Enter a meeting code first.");
      return;
    }
    window.location.href = `meeting.html?code=${encodeURIComponent(code)}`;
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
