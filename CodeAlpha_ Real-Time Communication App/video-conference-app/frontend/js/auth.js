/* ==========================================================================
   Confera — Auth state management (shared) + Login page logic
   ========================================================================== */

window.Auth = (function () {
  const { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } = window.CONFERA_CONFIG;

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function logout(redirect = true) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    if (redirect) window.location.href = "index.html";
  }

  /** Call at the top of every protected page. */
  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = "index.html";
    }
  }

  /** Call at the top of login/register pages so logged-in users skip straight to the dashboard. */
  function redirectIfAuthed() {
    if (isAuthenticated()) {
      window.location.href = "dashboard.html";
    }
  }

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  }

  return { saveSession, getUser, getToken, isAuthenticated, logout, requireAuth, redirectIfAuthed, initials };
})();

/*Auth.redirectIfAuthed();*/
if (
  window.location.pathname.endsWith("index.html") ||
  window.location.pathname.endsWith("register.html")
) {
  Auth.redirectIfAuthed();
}

if (new URLSearchParams(window.location.search).get("expired") === "1") {
  window.addEventListener("DOMContentLoaded", () => toast.warning("Please sign in again to continue."));
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const submitBtn = document.getElementById("loginSubmitBtn");
  const togglePw = document.getElementById("togglePassword");
  const pwInput = document.getElementById("password");

  if (togglePw) {
    togglePw.addEventListener("click", () => {
      pwInput.type = pwInput.type === "password" ? "text" : "password";
      togglePw.innerHTML = pwInput.type === "password" ? eyeIcon() : eyeOffIcon();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const email = document.getElementById("email").value.trim();
    const password = pwInput.value;

    if (!email || !password) {
      toast.error("Please fill in both fields.");
      return;
    }

    setLoading(submitBtn, true);
    try {
      const result = await api.post("/auth/login", { email, password });
      Auth.saveSession(result.accessToken, result.user);
      toast.success(`Welcome back, ${result.user.fullName.split(" ")[0]}!`);
      setTimeout(() => (window.location.href = "dashboard.html"), 500);
    } catch (err) {
      applyFieldErrors(form, err.fieldErrors);
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(submitBtn, false);
    }
  });
});

function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? '<span class="spinner"></span> Please wait…'
    : btn.dataset.label;
}

function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
}

function applyFieldErrors(form, fieldErrors) {
  if (!fieldErrors) return;
  Object.entries(fieldErrors).forEach(([field, message]) => {
    const el = form.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = message;
  });
}

function eyeIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
}
function eyeOffIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
}
