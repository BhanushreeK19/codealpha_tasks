/* =============================================================================
   websocket.js — STOMP-over-SockJS client for live task updates, live
   comments, and live notifications. Requires sockjs-client + @stomp/stompjs
   to be loaded on the page before this script.
   ============================================================================= */

const WS_BASE_URL = 'http://localhost:8080/api/ws';

const PmSocket = (() => {
  let client = null;
  let connected = false;
  const subscriptions = new Map(); // key -> subscription object
  const onConnectCallbacks = [];

  function connect() {
    const token = TokenStore.getAccess();
    if (!token || client) return;

    client = new StompJs.Client({
      webSocketFactory: () => new SockJS(WS_BASE_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000
    });

    client.onConnect = () => {
      connected = true;
      onConnectCallbacks.forEach((cb) => cb());
    };

    client.onStompError = () => { connected = false; };
    client.onWebSocketClose = () => { connected = false; };

    client.activate();
  }

  function whenConnected(cb) {
    if (connected) cb();
    else onConnectCallbacks.push(cb);
  }

  function subscribe(key, destination, handler) {
    whenConnected(() => {
      if (subscriptions.has(key)) return;
      const sub = client.subscribe(destination, (message) => {
        try { handler(JSON.parse(message.body)); } catch { /* ignore malformed payload */ }
      });
      subscriptions.set(key, sub);
    });
  }

  function unsubscribe(key) {
    const sub = subscriptions.get(key);
    if (sub) { sub.unsubscribe(); subscriptions.delete(key); }
  }

  function disconnect() {
    if (client) { client.deactivate(); client = null; }
    connected = false;
    subscriptions.clear();
  }

  return {
    connect,
    disconnect,
    /** Live notification pushes for the logged-in user. */
    subscribeNotifications(handler) {
      const user = TokenStore.getUser();
      if (!user) return;
      subscribe('notifications', `/user/queue/notifications`, handler);
    },
    /** Live task create/update/move/delete events for a project board. */
    subscribeProjectTasks(projectId, handler) {
      subscribe(`tasks:${projectId}`, `/topic/projects/${projectId}/tasks`, handler);
    },
    unsubscribeProjectTasks(projectId) { unsubscribe(`tasks:${projectId}`); },
    /** Live activity feed entries for a project. */
    subscribeProjectActivity(projectId, handler) {
      subscribe(`activity:${projectId}`, `/topic/projects/${projectId}/activity`, handler);
    },
    unsubscribeProjectActivity(projectId) { unsubscribe(`activity:${projectId}`); },
    /** Live comments on a single task's discussion thread. */
    subscribeTaskComments(taskId, handler) {
      subscribe(`comments:${taskId}`, `/topic/tasks/${taskId}/comments`, handler);
    },
    unsubscribeTaskComments(taskId) { unsubscribe(`comments:${taskId}`); }
  };
})();

window.PmSocket = PmSocket;
