/* ==========================================================================
   Confera — WebRTC mesh manager
   Each pair of participants gets exactly one RTCPeerConnection carrying
   bidirectional audio/video (both sides add their local tracks to the same
   connection before offer/answer). Media itself never touches the server —
   it flows peer-to-peer, encrypted end-to-end via DTLS-SRTP (mandatory in
   WebRTC), while the STOMP/WebSocket channel is used only to exchange the
   small JSON signaling messages needed to set that connection up.
   ========================================================================== */

class WebRTCManager {
  constructor({ socket, meetingCode, selfId, selfName, callbacks }) {
    this.socket = socket;
    this.meetingCode = meetingCode;
    this.selfId = selfId;
    this.selfName = selfName;
    this.callbacks = callbacks || {};

    this.localStream = null;
    this.screenStream = null;
    this.cameraVideoTrack = null;

    this.peers = new Map(); // peerId -> RTCPeerConnection
    this.peerNames = new Map(); // peerId -> displayName
    this.pendingCandidates = new Map(); // peerId -> RTCIceCandidateInit[]

    this.unsubscribe = null;
  }

  start(localStream) {
    this.localStream = localStream;
    this.cameraVideoTrack = localStream.getVideoTracks()[0] || null;

    this.unsubscribe = this.socket.subscribe(`/topic/signal/${this.meetingCode}`, (msg) => this._handleSignal(msg));

    // Announce presence so existing participants initiate connections to us.
    this._send({ type: "JOIN", senderId: this.selfId, senderName: this.selfName });
  }

  _send(message) {
    this.socket.publish(`/app/signal/${this.meetingCode}`, message);
  }

  _handleSignal(message) {
    if (message.senderId === this.selfId) return; // ignore our own broadcasts
    if (message.targetId && message.targetId !== this.selfId) return; // not addressed to us

    switch (message.type) {
      case "JOIN":
        this._onPeerJoined(message.senderId, message.senderName);
        break;
      case "OFFER":
        this._onOffer(message);
        break;
      case "ANSWER":
        this._onAnswer(message);
        break;
      case "ICE_CANDIDATE":
        this._onIceCandidate(message);
        break;
      case "LEAVE":
        this._onPeerLeft(message.senderId);
        break;
      case "MEDIA_STATE":
        this.callbacks.onMediaState?.(message.senderId, message.payload);
        break;
      case "SCREEN_SHARE_START":
        this.callbacks.onScreenShareState?.(message.senderId, true);
        break;
      case "SCREEN_SHARE_STOP":
        this.callbacks.onScreenShareState?.(message.senderId, false);
        break;
    }
  }

  async _onPeerJoined(peerId, peerName) {
    this.peerNames.set(peerId, peerName);
    const pc = this._createPeerConnection(peerId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this._send({ type: "OFFER", senderId: this.selfId, senderName: this.selfName, targetId: peerId, sdp: offer.sdp });
    } catch (err) {
      console.error("Failed to create offer for", peerId, err);
    }
  }

  async _onOffer(message) {
    this.peerNames.set(message.senderId, message.senderName);
    const pc = this._createPeerConnection(message.senderId);

    try {
      await pc.setRemoteDescription({ type: "offer", sdp: message.sdp });
      await this._flushPendingCandidates(message.senderId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this._send({ type: "ANSWER", senderId: this.selfId, senderName: this.selfName, targetId: message.senderId, sdp: answer.sdp });
    } catch (err) {
      console.error("Failed to answer offer from", message.senderId, err);
    }
  }

  async _onAnswer(message) {
    const pc = this.peers.get(message.senderId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription({ type: "answer", sdp: message.sdp });
      await this._flushPendingCandidates(message.senderId, pc);
    } catch (err) {
      console.error("Failed to apply answer from", message.senderId, err);
    }
  }

  async _onIceCandidate(message) {
    const pc = this.peers.get(message.senderId);
    const candidate = JSON.parse(message.candidate);

    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Failed to add ICE candidate", err);
      }
    } else {
      const queue = this.pendingCandidates.get(message.senderId) || [];
      queue.push(candidate);
      this.pendingCandidates.set(message.senderId, queue);
    }
  }

  async _flushPendingCandidates(peerId, pc) {
    const queue = this.pendingCandidates.get(peerId);
    if (!queue) return;
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Failed to flush ICE candidate", err);
      }
    }
    this.pendingCandidates.delete(peerId);
  }

  _createPeerConnection(peerId) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId);
    }

    const pc = new RTCPeerConnection({ iceServers: window.CONFERA_CONFIG.ICE_SERVERS });

    this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this._send({
          type: "ICE_CANDIDATE",
          senderId: this.selfId,
          targetId: peerId,
          candidate: JSON.stringify(event.candidate),
        });
      }
    };

    pc.ontrack = (event) => {
      this.callbacks.onRemoteStream?.(peerId, this.peerNames.get(peerId), event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(peerId, pc.connectionState);
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        // Leave cleanup to explicit LEAVE signal / ICE restart in a production build.
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  _onPeerLeft(peerId) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.peerNames.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.callbacks.onPeerLeft?.(peerId);
  }

  setAudioEnabled(enabled) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    this._send({ type: "MEDIA_STATE", senderId: this.selfId, payload: `audio:${enabled}` });
  }

  setVideoEnabled(enabled) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
    this._send({ type: "MEDIA_STATE", senderId: this.selfId, payload: `video:${enabled}` });
  }

  async startScreenShare() {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const screenTrack = this.screenStream.getVideoTracks()[0];

    for (const pc of this.peers.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) await sender.replaceTrack(screenTrack);
    }

    screenTrack.addEventListener("ended", () => this.stopScreenShare());
    this._send({ type: "SCREEN_SHARE_START", senderId: this.selfId });
    return this.screenStream;
  }

  async stopScreenShare() {
    if (!this.screenStream) return;
    this.screenStream.getTracks().forEach((t) => t.stop());
    this.screenStream = null;

    for (const pc of this.peers.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender && this.cameraVideoTrack) await sender.replaceTrack(this.cameraVideoTrack);
    }

    this._send({ type: "SCREEN_SHARE_STOP", senderId: this.selfId });
  }

  leaveAll() {
    this._send({ type: "LEAVE", senderId: this.selfId });
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.unsubscribe?.();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
  }
}
