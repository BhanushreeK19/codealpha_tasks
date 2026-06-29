/* ==========================================================================
   Confera — Register page logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const submitBtn = document.getElementById("registerSubmitBtn");
  const pwInput = document.getElementById("password");
  const strengthBars = document.querySelectorAll(".password-strength i");
  const togglePw = document.getElementById("togglePassword");

  if (togglePw) {
    togglePw.addEventListener("click", () => {
      pwInput.type = pwInput.type === "password" ? "text" : "password";
    });
  }

  if (pwInput) {
    pwInput.addEventListener("input", () => {
      const score = passwordScore(pwInput.value);
      strengthBars.forEach((bar, i) => {
        bar.style.background = i < score ? scoreColor(score) : "var(--color-border)";
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = pwInput.value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const agree = document.getElementById("agreeTerms");

    if (password !== confirmPassword) {
      document.querySelector('[data-error-for="confirmPassword"]').textContent = "Passwords do not match";
      return;
    }
    if (agree && !agree.checked) {
      toast.warning("Please accept the terms to continue.");
      return;
    }

    setLoading(submitBtn, true);
    try {
      const result = await api.post("/auth/register", { fullName, email, password });
      Auth.saveSession(result.accessToken, result.user);
      toast.success("Account created — let's get you set up!");
      setTimeout(() => (window.location.href = "dashboard.html"), 500);
    } catch (err) {
      applyFieldErrors(form, err.fieldErrors);
      toast.error(err.message || "Could not create your account");
    } finally {
      setLoading(submitBtn, false);
    }
  });
});

function passwordScore(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
function scoreColor(score) {
  return ["", "var(--color-danger)", "var(--color-warning)", "var(--color-success)", "var(--color-live)"][score];
}
