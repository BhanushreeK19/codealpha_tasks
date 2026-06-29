/* ==========================================================================
   Confera — REST API client
   Thin wrapper around fetch() that attaches "Authorization: Bearer <jwt>"
   to every request and normalizes the ApiResponse<T> envelope returned by
   the Spring Boot backend.
   ========================================================================== */

window.api = (function () {
  const { API_BASE_URL, TOKEN_STORAGE_KEY } = window.CONFERA_CONFIG;

  function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  async function request(method, path, { body, isMultipart = false } = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let payload = body;
    if (body && !isMultipart) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload });
    } catch (networkErr) {
      throw new Error("Cannot reach the server. Is the backend running on " + API_BASE_URL + "?");
    }

    if (response.status === 401 && !path.startsWith("/auth")) {
      // Token missing/expired — bounce to login.
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(window.CONFERA_CONFIG.USER_STORAGE_KEY);
      if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
        window.location.href = "index.html?expired=1";
      }
      throw new Error("Your session has expired. Please log in again.");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      return response; // binary/file response — caller handles it
    }

    const data = await response.json();
    if (!response.ok || data.success === false) {
      const message = data.message || "Request failed";
      const err = new Error(message);
      err.fieldErrors = typeof data.data === "object" ? data.data : null;
      throw err;
    }
    return data.data;
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, { body }),
    put: (path, body) => request("PUT", path, { body }),
    del: (path) => request("DELETE", path),
    upload: (path, formData) => request("POST", path, { body: formData, isMultipart: true }),
    getToken,
  };
})();
