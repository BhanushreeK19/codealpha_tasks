/* ==========================================================================
   Confera — Meeting room orchestrator
   Ties together ConferaSocket, WebRTCManager, Whiteboard, ChatModule and
   FileShareModule, and drives the lobby -> room transition plus all
   control-bar interactions.
   ========================================================================== */
console.log("meeting.js loaded", Date.now());

const originalReload = window.location.reload.bind(window.location);

window.location.reload = function () {
    console.trace("location.reload() called");
    originalReload();
};

const originalAssign = window.location.assign.bind(window.location);

window.location.assign = function (url) {
    console.trace("location.assign()", url);
    originalAssign(url);
};

const originalReplace = window.location.replace.bind(window.location);

window.location.replace = function (url) {
    console.trace("location.replace()", url);
    originalReplace(url);
};


Auth.requireAuth();

const Room = {
  meetingCode: null,
  selfId: null,
  selfName: null,
  meeting: null,
  settings: {},

  localStream: null,
  socket: null,
  webrtc: null,
  whiteboard: null,
  chat: null,
  fileshare: null,

  tiles: new Map(), // peerId -> { wrapper, video, label, nameLabel }
  peerMediaState: new Map(), // peerId -> { audio: bool, video: bool }

  startedAt: null,
  timerHandle: null,
  whiteboardActive: false,
  screenSharing: false,
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  console.log("INIT CALLED");
  Room.meetingCode = new URLSearchParams(window.location.search).get("code");
  Room.selfName = Auth.getUser()?.fullName || "Guest";
  Room.selfId = (window.crypto?.randomUUID && crypto.randomUUID()) || `peer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  Room.settings = JSON.parse(localStorage.getItem("confera_settings") || "{}");

  if (!Room.meetingCode) {
    toast.error("No meeting code provided.");
    setTimeout(() => (window.location.href = "dashboard.html"), 1200);
    return;
  }

  try {
    Room.meeting = await api.get(`/meetings/${Room.meetingCode}`);
  } catch (err) {
    document.getElementById("lobbyError").textContent = err.message || "Meeting not found.";
    document.getElementById("lobbyJoinBtn").disabled = true;
    return;
  }

  document.getElementById("lobbyMeetingTitle").textContent = Room.meeting.title;
  document.getElementById("lobbyMeetingCode").textContent = Room.meeting.meetingCode;

  await setupLobbyPreview();
  bindLobbyControls();
}

/* ---------------------------------------------------------------------- */
/* Lobby                                                                   */
/* ---------------------------------------------------------------------- */

async function setupLobbyPreview() {
  try {
    const constraints = {
      video: Room.settings.cameraId ? { deviceId: { exact: Room.settings.cameraId } } : true,
      audio: Room.settings.micId ? { deviceId: { exact: Room.settings.micId } } : true,
    };
    Room.localStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    toast.warning("Camera/microphone unavailable — you can still join with them off.");
    Room.localStream = new MediaStream();
  }

  const preview = document.getElementById("lobbyPreviewVideo");
  preview.srcObject = Room.localStream;
  if (Room.settings.mirrorVideo !== false) preview.classList.add("mirrored");
}

function bindLobbyControls() {
  const micBtn = document.getElementById("lobbyMicBtn");
  const camBtn = document.getElementById("lobbyCamBtn");

  micBtn.addEventListener("click", () => {
    const enabled = toggleTracks(Room.localStream.getAudioTracks());
    micBtn.classList.toggle("off", !enabled);
  });
  camBtn.addEventListener("click", () => {
    const enabled = toggleTracks(Room.localStream.getVideoTracks());
    camBtn.classList.toggle("off", !enabled);
    document.getElementById("lobbyPreviewVideo").style.visibility = enabled ? "visible" : "hidden";
  });

  document.getElementById("lobbyJoinBtn").addEventListener("click", joinRoom);
}

function toggleTracks(tracks) {
  if (!tracks.length) return false;
  const next = !tracks[0].enabled;
  tracks.forEach((t) => (t.enabled = next));
  return next;
}

/* ---------------------------------------------------------------------- */
/* Joining the room                                                        */
/* ---------------------------------------------------------------------- */

async function joinRoom() {

  console.log("JOIN ROOM START");

  const joinBtn = document.getElementById("lobbyJoinBtn");
  setLoading(joinBtn, true);

  try {
    await api.post("/meetings/join", { meetingCode: Room.meetingCode });
    console.log("JOIN API SUCCESS");
  } catch (err) {
    toast.error(err.message);
    setLoading(joinBtn, false);
    return;
  }

  document.getElementById("lobbyView").classList.add("hidden");
  document.getElementById("roomView").classList.remove("hidden");
  console.log("ROOM SHOWN");
  document.body.classList.add("meeting-body");

  document.getElementById("roomMeetingCode").textContent = Room.meetingCode;
  createLocalTile();
  startTimer();
  bindRoomControls();

  Room.socket = new ConferaSocket();
  Room.socket.connect({
    onConnect: () => {
      Room.webrtc = new WebRTCManager({
        socket: Room.socket,
        meetingCode: Room.meetingCode,
        selfId: Room.selfId,
        selfName: Room.selfName,
        callbacks: {
          onRemoteStream: handleRemoteStream,
          onPeerLeft: handlePeerLeft,
          onMediaState: handlePeerMediaState,
          onScreenShareState: handlePeerScreenShare,
          onConnectionStateChange: handleConnectionState,
        },
      });
      Room.webrtc.start(Room.localStream);

      Room.chat = new ChatModule({
        socket: Room.socket,
        meetingCode: Room.meetingCode,
        selfId: Room.selfId,
        container: document.getElementById("chatMessages"),
        inputEl: document.getElementById("chatInput"),
        sendBtn: document.getElementById("chatSendBtn"),
        badgeEl: document.getElementById("chatBadge"),
      });
      Room.chat.loadHistory();
      Room.chat.systemMessage(`${Room.selfName} joined the meeting`);

      Room.fileshare = new FileShareModule({
        meetingCode: Room.meetingCode,
        container: document.getElementById("filesList"),
        dropZone: document.getElementById("fileDropZone"),
        fileInput: document.getElementById("fileInput"),
        badgeEl: document.getElementById("filesBadge"),
      });
      Room.fileshare.loadFiles();

      renderParticipants();
    },
    onError: (msg) => toast.error("Connection error: " + msg),
  });

  setLoading(joinBtn, false);
}

/* ---------------------------------------------------------------------- */
/* Video tiles                                                             */
/* ---------------------------------------------------------------------- */

function createLocalTile() {
  const grid = document.getElementById("videoGrid");
  const wrapper = document.createElement("div");
  wrapper.className = "video-tile";
  wrapper.id = "tile-local";

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = Room.localStream;
  if (Room.settings.mirrorVideo !== false) video.classList.add("mirrored");

  wrapper.appendChild(video);
  wrapper.insertAdjacentHTML(
    "beforeend",
    `<span class="tile-badge-host" id="localHostBadge" style="display:none">Host</span>
     <span class="tile-screen-badge" id="localScreenBadge" style="display:none">Presenting</span>
     <div class="tile-label"><span class="mic-off-icon">${micOffSvg()}</span><span>${escapeHtmlRoom(Room.selfName)} (you)</span></div>`
  );
  grid.appendChild(wrapper);

  if (Room.meeting?.host?.fullName === Room.selfName) {
    document.getElementById("localHostBadge").style.display = "inline-flex";
  }

  Room.tiles.set("local", { wrapper, video });
}

function handleRemoteStream(peerId, peerName, stream) {
  let tile = Room.tiles.get(peerId);
  if (!tile) {
    const grid = document.getElementById("videoGrid");
    const wrapper = document.createElement("div");
    wrapper.className = "video-tile";
    wrapper.id = `tile-${peerId}`;

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;

    wrapper.appendChild(video);
    const isHost = Room.meeting?.host?.fullName === peerName;
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<span class="tile-badge-host" style="display:${isHost ? "inline-flex" : "none"}">Host</span>
       <span class="tile-screen-badge" style="display:none">Presenting</span>
       <div class="tile-label"><span class="mic-off-icon">${micOffSvg()}</span><span class="tile-name">${escapeHtmlRoom(peerName)}</span></div>`
    );
    grid.appendChild(wrapper);

    tile = { wrapper, video };
    Room.tiles.set(peerId, tile);
    Room.peerMediaState.set(peerId, { audio: true, video: true });
    renderParticipants();
    Room.chat?.systemMessage(`${peerName} joined the meeting`);
  }
  tile.video.srcObject = stream;
}

function handlePeerLeft(peerId) {
  const tile = Room.tiles.get(peerId);
  if (tile) {
    tile.wrapper.remove();
    Room.tiles.delete(peerId);
  }
  Room.peerMediaState.delete(peerId);
  renderParticipants();
}

function handlePeerMediaState(peerId, payload) {
  const [kind, value] = payload.split(":");
  const enabled = value === "true";
  const state = Room.peerMediaState.get(peerId) || { audio: true, video: true };
  state[kind] = enabled;
  Room.peerMediaState.set(peerId, state);

  const tile = Room.tiles.get(peerId);
  if (tile && kind === "audio") {
    tile.wrapper.classList.toggle("muted", !enabled);
  }
  renderParticipants();
}

function handlePeerScreenShare(peerId, sharing) {
  const tile = Room.tiles.get(peerId);
  if (!tile) return;
  const badge = tile.wrapper.querySelector(".tile-screen-badge");
  if (badge) badge.style.display = sharing ? "inline-flex" : "none";
}

function handleConnectionState(peerId, state) {
  // Surface fatal states briefly; transient "connecting"/"checking" states are expected during ICE negotiation.
  if (state === "failed") {
    toast.warning("Connection to a participant was lost.");
  }
}

/* ---------------------------------------------------------------------- */
/* Participants panel                                                      */
/* ---------------------------------------------------------------------- */

function renderParticipants() {
  const list = document.getElementById("participantsList");
  if (!list) return;

  const rows = [{ id: "local", name: `${Room.selfName} (you)`, audio: true, video: true }];
  Room.webrtc?.peerNames.forEach((name, id) => {
    const state = Room.peerMediaState.get(id) || { audio: true, video: true };
    rows.push({ id, name, audio: state.audio, video: state.video });
  });

  document.getElementById("participantsCount").textContent = rows.length;

  list.innerHTML = rows
    .map(
      (r) => `
    <div class="participant-row">
      <div class="avatar" style="width:32px;height:32px;font-size:12.5px">${Auth.initials(r.name)}</div>
      <div class="p-name">${escapeHtmlRoom(r.name)}</div>
      <div class="p-icons">
        <span class="${r.audio ? "" : "off"}">${r.audio ? micSvg() : micOffSvg()}</span>
        <span class="${r.video ? "" : "off"}">${r.video ? camSvg() : camOffSvg()}</span>
      </div>
    </div>`
    )
    .join("");
}

/* ---------------------------------------------------------------------- */
/* Control bar                                                             */
/* ---------------------------------------------------------------------- */

function bindRoomControls() {
  document.getElementById("micBtn").addEventListener("click", toggleMic);
  document.getElementById("camBtn").addEventListener("click", toggleCam);
  document.getElementById("screenShareBtn").addEventListener("click", toggleScreenShare);
  document.getElementById("whiteboardBtn").addEventListener("click", toggleWhiteboard);
  document.getElementById("leaveBtn").addEventListener("click", leaveMeeting);
  document.getElementById("copyCodeBtn").addEventListener("click", copyMeetingCode);

  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => openPanelTab(btn.dataset.tab));
  });
  document.getElementById("closePanelBtn")?.addEventListener("click", closePanel);

  document.getElementById("chatInput")?.addEventListener("focus", () => Room.chat?.setPanelOpen(true));

  window.addEventListener("beforeunload", () => {
    try {
      Room.webrtc?.leaveAll();
      Room.socket?.disconnect();
    } catch {}
  });
}

function toggleMic() {
  const btn = document.getElementById("micBtn");
  const enabled = !btn.classList.contains("off");
  Room.webrtc.setAudioEnabled(!enabled);
  btn.classList.toggle("off", enabled);
  btn.innerHTML = enabled ? micOffSvg() : micSvg();
}

function toggleCam() {
  const btn = document.getElementById("camBtn");
  const enabled = !btn.classList.contains("off");
  Room.webrtc.setVideoEnabled(!enabled);
  btn.classList.toggle("off", enabled);
  btn.innerHTML = enabled ? camOffSvg() : camSvg();

  const localTile = Room.tiles.get("local");
  if (localTile) localTile.video.style.visibility = enabled ? "hidden" : "visible";
}

async function toggleScreenShare() {
  const btn = document.getElementById("screenShareBtn");
  try {
    if (!Room.screenSharing) {
      const screenStream = await Room.webrtc.startScreenShare();
      Room.tiles.get("local").video.srcObject = screenStream;
      document.getElementById("localScreenBadge").style.display = "inline-flex";
      btn.classList.add("active-tool");
      Room.screenSharing = true;
    } else {
      await Room.webrtc.stopScreenShare();
      Room.tiles.get("local").video.srcObject = Room.localStream;
      document.getElementById("localScreenBadge").style.display = "none";
      btn.classList.remove("active-tool");
      Room.screenSharing = false;
    }
  } catch (err) {
    if (err.name !== "NotAllowedError") toast.error("Screen share failed: " + err.message);
  }
}

function toggleWhiteboard() {
  const btn = document.getElementById("whiteboardBtn");
  const videoGrid = document.getElementById("videoGrid");
  const wbWrap = document.getElementById("whiteboardWrap");

  Room.whiteboardActive = !Room.whiteboardActive;
  btn.classList.toggle("active-tool", Room.whiteboardActive);
  videoGrid.style.display = Room.whiteboardActive ? "none" : "grid";
  wbWrap.style.display = Room.whiteboardActive ? "flex" : "none";

  if (Room.whiteboardActive && !Room.whiteboard) {
    Room.whiteboard = new Whiteboard({
      canvas: document.getElementById("whiteboardCanvas"),
      socket: Room.socket,
      meetingCode: Room.meetingCode,
      selfId: Room.selfId,
      selfName: Room.selfName,
    });
    bindWhiteboardToolbar();
  }
}

function bindWhiteboardToolbar() {
  document.querySelectorAll(".wb-tool-btn[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".wb-tool-btn[data-tool]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      Room.whiteboard.setTool(btn.dataset.tool);
    });
  });
  document.querySelectorAll(".wb-color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".wb-color-swatch").forEach((s) => s.classList.remove("selected"));
      swatch.classList.add("selected");
      Room.whiteboard.setColor(swatch.dataset.color);
    });
  });
  document.getElementById("wbSizeSlider")?.addEventListener("input", (e) => {
    Room.whiteboard.setBrushSize(Number(e.target.value));
  });
  document.getElementById("wbClearBtn")?.addEventListener("click", () => {
    if (confirm("Clear the whiteboard for everyone?")) Room.whiteboard.clear();
  });
}

const PANEL_TITLES = { chat: "Chat", participants: "Participants", files: "Files" };

function openPanelTab(tabName) {
  const roomMain = document.getElementById("roomMain");
  const isOpen = roomMain.classList.contains("with-panel");
  const currentTab = document.querySelector("[data-tab].active-tool")?.dataset.tab;

  if (isOpen && currentTab === tabName) {
    closePanel();
    return;
  }

  roomMain.classList.add("with-panel");
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const match = b.dataset.tab === tabName;
    b.classList.toggle("active-tool", match);
  });
  document.querySelectorAll(".panel-pane").forEach((p) => p.classList.toggle("active", p.id === `${tabName}Pane`));

  const titleEl = document.getElementById("panelTitle");
  if (titleEl) titleEl.textContent = PANEL_TITLES[tabName] || tabName;

  Room.chat?.setPanelOpen(tabName === "chat");
}

function closePanel() {
  document.getElementById("roomMain").classList.remove("with-panel");
  document.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active-tool"));
  Room.chat?.setPanelOpen(false);
}

function copyMeetingCode() {
  navigator.clipboard.writeText(Room.meetingCode).then(() => toast.success("Meeting code copied"));
}

function startTimer() {
  Room.startedAt = Date.now();
  const timerEl = document.getElementById("roomTimer");
  Room.timerHandle = setInterval(() => {
    const elapsed = Math.floor((Date.now() - Room.startedAt) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    timerEl.textContent = `${mm}:${ss}`;
  }, 1000);
}

async function leaveMeeting() {
  clearInterval(Room.timerHandle);
  Room.webrtc?.leaveAll();
  Room.socket?.disconnect();
  Room.whiteboard?.destroy();
  Room.chat?.destroy();

  try {
    await api.post(`/meetings/${Room.meetingCode}/leave`);
  } catch {
    /* best-effort */
  }

  window.location.href = "dashboard.html";
}

/* ---------------------------------------------------------------------- */
/* Small inline icon helpers                                               */
/* ---------------------------------------------------------------------- */

function micSvg() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>'; }
function micOffSvg() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 2l20 20M9 9v3a3 3 0 0 0 4.6 2.53M15 5.27V5a3 3 0 0 0-5.94-.6M19 10v1a7 7 0 0 1-1.16 3.88M5 10v1a7 7 0 0 0 7 7c.7 0 1.37-.1 2-.3M12 18v4"/></svg>'; }
function camSvg() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m23 7-7 5 7 5V7Z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>'; }
function camOffSvg() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2M9 5h5a2 2 0 0 1 2 2v3.5l5-3.5v9l-2.5-1.75M2 2l20 20"/></svg>'; }

function escapeHtmlRoom(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
