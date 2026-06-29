/* =============================================================================
   auth.js — handles the login and register form submissions.
   ============================================================================= */

function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
}

function showFieldErrors(form, fieldErrors) {
  if (!fieldErrors) return;
  Object.entries(fieldErrors).forEach(([field, message]) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;
    const err = document.createElement('div');
    err.className = 'field-error';
    err.textContent = message;
    input.closest('.field').appendChild(err);
  });
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  // Already logged in? skip straight to the dashboard.
  if (TokenStore.getAccess()) {
    window.location.href = 'dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const btn = form.querySelector('button[type="submit"]');
    setButtonLoading(btn, true, 'Log in');

    const payload = {
      usernameOrEmail: form.usernameOrEmail.value.trim(),
      password: form.password.value
    };

    try {
      const jwt = await Api.login(payload);
      TokenStore.save(jwt);
      Toast.success(`Welcome back, ${jwt.user.fullName.split(' ')[0]}!`);
      window.location.href = 'dashboard.html';
    } catch (err) {
      if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
      Toast.error(err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  if (TokenStore.getAccess()) {
    window.location.href = 'dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const btn = form.querySelector('button[type="submit"]');

    if (form.password.value !== form.confirmPassword.value) {
      const err = document.createElement('div');
      err.className = 'field-error';
      err.textContent = 'Passwords do not match';
      form.confirmPassword.closest('.field').appendChild(err);
      return;
    }

    setButtonLoading(btn, true, 'Create account');

    const payload = {
      fullName: form.fullName.value.trim(),
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value
    };

    try {
      const jwt = await Api.register(payload);
      TokenStore.save(jwt);
      Toast.success(`Account created — welcome, ${jwt.user.fullName.split(' ')[0]}!`);
      window.location.href = 'dashboard.html';
    } catch (err) {
      if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
      Toast.error(err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
});
