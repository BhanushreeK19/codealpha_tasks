/* ==========================================================================
   Confera — STOMP over WebSocket (SockJS) connection wrapper
   Requires sockjs-client + @stomp/stompjs to be loaded on the page first.
   ========================================================================== */

class ConferaSocket {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
  }

  connect({ onConnect, onError }) {
    const token = Auth.getToken();

    this.client = new StompJs.Client({
      webSocketFactory: () => new SockJS(window.CONFERA_CONFIG.WS_BASE_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {}, // silence verbose STOMP frame logs
    });

    this.client.onConnect = () => {
      this.connected = true;
      onConnect?.();
    };

    this.client.onStompError = (frame) => {
      this.connected = false;
      onError?.(frame.headers?.message || "WebSocket protocol error");
    };

    this.client.onWebSocketClose = () => {
      this.connected = false;
    };

    this.client.activate();
  }

  /** Subscribe to a topic/queue; returns an unsubscribe function. */
  subscribe(destination, callback) {
    if (!this.client) return () => {};
    const sub = this.client.subscribe(destination, (message) => {
      try {
        callback(JSON.parse(message.body));
      } catch {
        callback(message.body);
      }
    });
    this.subscriptions.set(destination, sub);
    return () => sub.unsubscribe();
  }

  publish(destination, body) {
    if (!this.client || !this.connected) return;
    this.client.publish({ destination, body: JSON.stringify(body) });
  }

  disconnect() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.client?.deactivate();
    this.connected = false;
  }
}
