/* ==========================================================================
   Confera — Profile page logic
   ========================================================================== */

Auth.requireAuth();

document.addEventListener("DOMContentLoaded", async () => {
  await loadProfile();
  bindProfileForm();
  bindPasswordForm();
  bindUserChrome();
});

function bindUserChrome() {
  const user = Auth.getUser();
  if (!user) return;
  document.querySelectorAll(".js-user-name").forEach((el) => (el.textContent = user.fullName));
  document.querySelectorAll(".js-user-email").forEach((el) => (el.textContent = user.email));
  document.querySelectorAll(".js-user-initials").forEach((el) => (el.textContent = Auth.initials(user.fullName)));
  document.querySelectorAll(".js-logout").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); Auth.logout(); }));
}

async function loadProfile() {
  try {
    const profile = await api.get("/users/me");
    Auth.saveSession(Auth.getToken(), profile);

    document.getElementById("profileName").textContent = profile.fullName;
    document.getElementById("profileEmail").textContent = profile.email;
    document.getElementById("profileJobTitle").textContent = profile.jobTitle || "No job title set";
    document.getElementById("profileInitials").textContent = Auth.initials(profile.fullName);
    document.getElementById("profileSince").textContent = profile.createdAt
      ? `Member since ${new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
      : "";

    document.getElementById("editFullName").value = profile.fullName || "";
    document.getElementById("editJobTitle").value = profile.jobTitle || "";
    document.getElementById("editEmail").value = profile.email || "";
  } catch (err) {
    toast.error(err.message);
  }
}

function bindProfileForm() {
  const form = document.getElementById("editProfileForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    setLoading(submitBtn, true);

    try {
      const updated = await api.put("/users/me", {
        fullName: document.getElementById("editFullName").value.trim(),
        jobTitle: document.getElementById("editJobTitle").value.trim(),
      });
      Auth.saveSession(Auth.getToken(), updated);
      toast.success("Profile updated successfully");
      await loadProfile();
      bindUserChrome();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function bindPasswordForm() {
  const form = document.getElementById("changePasswordForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setLoading(submitBtn, true);
    try {
      await api.put("/users/me/password", { currentPassword, newPassword });
      toast.success("Password changed successfully");
      form.reset();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(submitBtn, false);
    }
  });
}
