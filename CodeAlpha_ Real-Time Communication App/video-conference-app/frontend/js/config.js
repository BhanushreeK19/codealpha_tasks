/* ==========================================================================
   Confera — Global config
   Adjust API_BASE_URL if the backend isn't running on localhost:8080.
   ========================================================================== */

window.CONFERA_CONFIG = {
  API_BASE_URL: "http://localhost:8080/api",
  WS_BASE_URL: "http://localhost:8080/ws",

  // Public STUN servers for NAT traversal during WebRTC negotiation.
  // For production deployments behind restrictive corporate NATs, add a
  // TURN server here (turn:your-turn-server:3478 with credentials).
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],

  TOKEN_STORAGE_KEY: "confera_token",
  USER_STORAGE_KEY: "confera_user",
};
