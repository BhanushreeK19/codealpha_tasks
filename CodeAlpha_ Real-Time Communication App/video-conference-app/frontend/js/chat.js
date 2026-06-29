/* ==========================================================================
   Confera — Meeting chat module
   Loads persisted history over REST on join, then stays live via the
   /topic/chat/{meetingCode} STOMP topic for the rest of the session.
   ========================================================================== */

class ChatModule {
  constructor({ socket, meetingCode, selfId, container, inputEl, sendBtn, badgeEl }) {
    this.socket = socket;
    this.meetingCode = meetingCode;
    this.selfId = selfId;
    this.container = container;
    this.inputEl = inputEl;
    this.sendBtn = sendBtn;
    this.badgeEl = badgeEl;

    this.unreadCount = 0;
    this.panelOpen = false;

    this._bindInput();
    this.unsubscribe = this.socket.subscribe(`/topic/chat/${meetingCode}`, (msg) => this._onIncoming(msg));
  }

  async loadHistory() {
    try {
      const history = await api.get(`/meetings/${this.meetingCode}/chat`);
      history.forEach((msg) => this._render(msg, false));
      this._scrollToBottom();
    } catch (err) {
      console.warn("Could not load chat history:", err.message);
    }
  }

  setPanelOpen(open) {
    this.panelOpen = open;
    if (open) {
      this.unreadCount = 0;
      this._updateBadge();
    }
  }

  send() {
    const content = this.inputEl.value.trim();
    if (!content) return;
    this.socket.publish(`/app/chat/${this.meetingCode}.send`, { content });
    this.inputEl.value = "";
  }

  systemMessage(text) {
    this._render({ type: "SYSTEM", content: text, senderName: "System", sentAt: new Date().toISOString() }, true);
  }

  _bindInput() {
    this.sendBtn?.addEventListener("click", () => this.send());
    this.inputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });
  }

  _onIncoming(msg) {
    this._render(msg, true);
    if (!this.panelOpen && msg.senderId !== this.selfId) {
      this.unreadCount++;
      this._updateBadge();
    }
  }

  _updateBadge() {
    if (!this.badgeEl) return;
    this.badgeEl.style.display = this.unreadCount > 0 ? "flex" : "none";
    this.badgeEl.textContent = this.unreadCount > 9 ? "9+" : this.unreadCount;
  }

  _render(msg, scroll) {
    if (!this.container) return;
    const isOwn = msg.senderId === this.selfId;
    const isSystem = msg.type === "SYSTEM";
    const time = msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";

    const row = document.createElement("div");
    row.className = `chat-msg ${isOwn ? "own" : ""} ${isSystem ? "system" : ""}`.trim();

    if (isSystem) {
      row.innerHTML = `<div class="chat-bubble"><div class="chat-text">${escapeHtmlChat(msg.content)}</div></div>`;
    } else {
      const initials = (msg.senderName || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
      row.innerHTML = `
        <div class="avatar">${initials}</div>
        <div class="chat-bubble">
          <div class="chat-meta">
            <span class="chat-sender">${escapeHtmlChat(msg.senderName)}${isOwn ? " (you)" : ""}</span>
            <span class="chat-time">${time}</span>
          </div>
          <div class="chat-text">${escapeHtmlChat(msg.content)}</div>
        </div>`;
    }

    this.container.appendChild(row);
    if (scroll) this._scrollToBottom();
  }

  _scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }

  destroy() {
    this.unsubscribe?.();
  }
}

function escapeHtmlChat(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
