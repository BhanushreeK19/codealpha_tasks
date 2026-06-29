/* ==========================================================================
   Confera — Settings page logic
   ========================================================================== */

Auth.requireAuth();

const SETTINGS_KEY = "confera_settings";

function loadSettings() {
  try {
    return { notifications: true, soundOnJoin: true, mirrorVideo: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { notifications: true, soundOnJoin: true, mirrorVideo: true };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

document.addEventListener("DOMContentLoaded", async () => {
  bindUserChrome();
  await populateDevices();
  bindToggles();
  bindDangerZone();
});

function bindUserChrome() {
  const user = Auth.getUser();
  if (!user) return;
  document.querySelectorAll(".js-user-name").forEach((el) => (el.textContent = user.fullName));
  document.querySelectorAll(".js-user-email").forEach((el) => (el.textContent = user.email));
  document.querySelectorAll(".js-user-initials").forEach((el) => (el.textContent = Auth.initials(user.fullName)));
  document.querySelectorAll(".js-logout").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); Auth.logout(); }));
}

async function populateDevices() {
  const camSelect = document.getElementById("cameraSelect");
  const micSelect = document.getElementById("micSelect");
  if (!camSelect || !micSelect) return;

  try {
    // Requesting permission first so device labels are populated (browsers hide
    // labels until a getUserMedia grant has occurred at least once).
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    tempStream.getTracks().forEach((t) => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    const mics = devices.filter((d) => d.kind === "audioinput");

    camSelect.innerHTML = cams.map((d, i) => `<option value="${d.deviceId}">${d.label || "Camera " + (i + 1)}</option>`).join("") || "<option>No camera found</option>";
    micSelect.innerHTML = mics.map((d, i) => `<option value="${d.deviceId}">${d.label || "Microphone " + (i + 1)}</option>`).join("") || "<option>No microphone found</option>";

    const saved = loadSettings();
    if (saved.cameraId) camSelect.value = saved.cameraId;
    if (saved.micId) micSelect.value = saved.micId;

    camSelect.addEventListener("change", () => saveSettings({ ...loadSettings(), cameraId: camSelect.value }));
    micSelect.addEventListener("change", () => saveSettings({ ...loadSettings(), micId: micSelect.value }));
  } catch (err) {
    camSelect.innerHTML = "<option>Camera access denied</option>";
    micSelect.innerHTML = "<option>Microphone access denied</option>";
    toast.warning("Allow camera/microphone access to configure devices.");
  }
}

function bindToggles() {
  const settings = loadSettings();
  const map = {
    notifToggle: "notifications",
    soundToggle: "soundOnJoin",
    mirrorToggle: "mirrorVideo",
  };

  Object.entries(map).forEach(([elementId, key]) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.checked = !!settings[key];
    el.addEventListener("change", () => {
      const current = loadSettings();
      current[key] = el.checked;
      saveSettings(current);
      toast.success("Preference saved");
    });
  });
}

function bindDangerZone() {
  const logoutAllBtn = document.getElementById("logoutEverywhereBtn");
  logoutAllBtn?.addEventListener("click", () => {
    if (confirm("This will sign you out on this device. Continue?")) {
      Auth.logout();
    }
  });
}
