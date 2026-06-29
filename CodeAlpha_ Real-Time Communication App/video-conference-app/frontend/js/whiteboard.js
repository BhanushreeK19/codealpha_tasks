/* ==========================================================================
   Confera — Collaborative Whiteboard
   Coordinates are normalized to [0,1] before being broadcast so every
   participant's canvas — regardless of window size — redraws strokes in
   the same relative position.
   ========================================================================== */

class Whiteboard {
  constructor({ canvas, socket, meetingCode, selfId, selfName }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.socket = socket;
    this.meetingCode = meetingCode;
    this.selfId = selfId;
    this.selfName = selfName;

    this.tool = "pen"; // "pen" | "eraser"
    this.color = "#1f2937";
    this.brushSize = 4;

    this.drawing = false;
    this.last = null;
    this.history = []; // replayable stroke segments, for resize redraw

    this._resizeObserver = new ResizeObserver(() => this._handleResize());
    this._resizeObserver.observe(this.canvas.parentElement);

    this._bindPointerEvents();
    this.unsubscribe = this.socket.subscribe(`/topic/whiteboard/${meetingCode}`, (event) => this._applyRemoteEvent(event));

    this._handleResize();
  }

  setTool(tool) { this.tool = tool; }
  setColor(color) { this.color = color; }
  setBrushSize(size) { this.brushSize = size; }

  clear(broadcast = true) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.history = [];
    if (broadcast) {
      this._publish({ type: "clear" });
    }
  }

  destroy() {
    this._resizeObserver.disconnect();
    this.unsubscribe?.();
  }

  _bindPointerEvents() {
    const canvas = this.canvas;
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.drawing = true;
      this.last = this._toNormalized(e);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.drawing) return;
      const point = this._toNormalized(e);
      this._strokeSegment(this.last, point);
      this.last = point;
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach((evt) =>
      canvas.addEventListener(evt, () => {
        this.drawing = false;
        this.last = null;
      })
    );
  }

  _toNormalized(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  _strokeSegment(from, to) {
    const event = {
      type: "draw",
      tool: this.tool,
      x0: from.x,
      y0: from.y,
      x1: to.x,
      y1: to.y,
      color: this.color,
      brushSize: this.brushSize,
      senderId: this.selfId,
      senderName: this.selfName,
    };
    this._drawSegment(event);
    this.history.push(event);
    this._publish(event);
  }

  _publish(event) {
    this.socket.publish(`/app/whiteboard/${this.meetingCode}`, event);
  }

  _applyRemoteEvent(event) {
    if (event.senderId === this.selfId) return;

    if (event.type === "clear") {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.history = [];
      return;
    }
    if (event.type === "draw") {
      this._drawSegment(event);
      this.history.push(event);
    }
  }

  _drawSegment(event) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = event.tool === "eraser" ? event.brushSize * 4 : event.brushSize;
    ctx.strokeStyle = event.tool === "eraser" ? "#ffffff" : event.color;
    ctx.globalCompositeOperation = event.tool === "eraser" ? "destination-out" : "source-over";

    ctx.beginPath();
    ctx.moveTo(event.x0 * width, event.y0 * height);
    ctx.lineTo(event.x1 * width, event.y1 * height);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  _handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Replay history at the new resolution so existing strokes don't vanish.
    const history = this.history;
    this.history = [];
    history.forEach((event) => {
      this._drawSegment(event);
      this.history.push(event);
    });
  }
}
