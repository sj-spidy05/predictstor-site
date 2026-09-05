/* BhoomiNOVA — browser-safe demo application logic */
(() => {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyBxVrLZ0YYaGYcEjxL2gyDXKaudDyPNvZM",
    authDomain: "predictstor.firebaseapp.com",
    projectId: "predictstor",
    storageBucket: "predictstor.firebasestorage.app",
    messagingSenderId: "984193094318",
    appId: "1:984193094318:web:5c5614bf83a431b98f133f",
    measurementId: "G-L254S3YZ5D"
  };

  const CROP_PROFILES = {
    Onion: { temp: "0–4°C where refrigerated storage is verified", humidity: "65–75%", note: "Keep produce dry and ventilated; conditions depend on curing and storage method." },
    Potato: { temp: "4–10°C depending on intended use", humidity: "90–95%", note: "Avoid unsuitable temperatures that can affect quality and sprouting." },
    Tomato: { temp: "12–20°C depending on maturity", humidity: "85–95%", note: "Do not overcool immature tomatoes; variety and maturity matter." },
    Carrot: { temp: "0–4°C", humidity: "90–95%", note: "High humidity can reduce dehydration when verified for the crop." },
    Cabbage: { temp: "0–4°C", humidity: "90–95%", note: "Avoid prolonged heat exposure and record field conditions." },
    Cauliflower: { temp: "0–4°C", humidity: "90–95%", note: "Low-temperature storage may help quality depending on cultivar." },
    Garlic: { temp: "0–5°C or suitable dry ambient storage", humidity: "60–70%", note: "Dry conditions and airflow are important for stored bulbs." },
    Apple: { temp: "0–4°C depending on variety", humidity: "90–95%", note: "Storage conditions and ethylene management depend on variety." },
    Brinjal: { temp: "10–12°C depending on variety", humidity: "90–95%", note: "Avoid chilling injury; verify crop-specific guidance before acting." },
    Other: { temp: "Crop-specific rule not configured", humidity: "Crop-specific rule not configured", note: "Add a verified crop profile before using storage recommendations." }
  };
  const CROPS = Object.keys(CROP_PROFILES);
  const PAGE_TITLES = { dashboard: "Field overview", sensors: "Live sensor network", prediction: "Crop intelligence", alerts: "Alerts & actions", history: "Event history", traceability: "Traceability records", settings: "Settings & profile", help: "Help & about" };
  const STORAGE_PREFIX = "bhoominova_workspace_v1_";
  const SETTINGS_KEY = "bhoominova_settings_v1";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const text = (selector, value) => { const el = $(selector); if (el) el.textContent = value ?? ""; };
  const safeParse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; } };
  const nowIso = () => new Date().toISOString();
  const formatDate = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
  const formatTime = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };
  const initials = (value) => String(value || "BN").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "BN";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

  let firebaseReady = false;
  let firebaseDb = null;
  let confirmationResult = null;
  let recaptchaVerifier = null;
  try {
    if (window.firebase) {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      firebaseReady = Boolean(firebase.auth);
      firebaseDb = firebase.firestore ? firebase.firestore() : null;
    }
  } catch (error) {
    console.warn("Firebase browser configuration unavailable; local mode remains available.", error);
  }

  const DEFAULT_ALERTS = [
    { id: "alert-gas-demo", level: "warning", title: "Gas observation requires review", desc: "A simulated gas trend is approaching the local watch range. Verify airflow before taking action.", time: "Demo · 12 min ago", field: "North field", crop: "Onion", status: "open", demo: true },
    { id: "alert-humidity-demo", level: "warning", title: "Humidity monitoring reminder", desc: "The simulated humidity trend is being compared with the crop profile. No physical sensor reading is connected.", time: "Demo · 1 hr ago", field: "North field", crop: "Onion", status: "open", demo: true },
    { id: "alert-ready-demo", level: "info", title: "Sensor workspace ready", desc: "Register an ESP-12E device ID when the field kit is available. Pairing does not claim a live connection.", time: "Demo · 2 hr ago", field: "North field", crop: "Onion", status: "resolved", demo: true, resolvedAt: nowIso() }
  ];
  const DEFAULT_EVENTS = [
    { id: "event-system", type: "system", title: "Demo workspace opened", detail: "Local workspace initialized. No live telemetry is connected.", timestamp: nowIso() },
    { id: "event-observation", type: "observation", title: "Sensor observation available", detail: "Simulated temperature, humidity, gas, and airflow values are shown with an explicit demo label.", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: "event-trace", type: "system", title: "Traceability record prepared", detail: "Field-to-storage record boundary is ready for future farmer-owned events.", timestamp: new Date(Date.now() - 7200000).toISOString() }
  ];
  const EMPTY_WORKSPACE = () => ({ profile: null, pairing: null, observations: [], alerts: [], events: [], traceEvents: [], settings: safeParse(localStorage.getItem(SETTINGS_KEY), { tempThreshold: 28, humidityThreshold: 75, localNotifications: true }) });
  const state = { session: null, workspace: EMPTY_WORKSPACE(), alertFilter: "open", historyFilter: "all" };

  function demoProfile() {
    return { name: "Demo Farmer", phone: "+91 98765 43210", farmerId: "BN-DEMO-001", farmName: "Shakti Farm", fieldName: "North field", crop: "Onion", location: "Nashik", district: "Nashik", state: "Maharashtra", coordinates: "20.0059, 73.7897", cultivation: "Kharif · drip irrigation", godown: "Shakti store · demo", savedAt: nowIso() };
  }
  function workspaceKey() { return state.session?.mode === "firebase" && state.session.uid ? state.session.uid : "demo"; }
  function storageKey() { return `${STORAGE_PREFIX}${workspaceKey()}`; }
  function saveWorkspace() { try { localStorage.setItem(storageKey(), JSON.stringify(state.workspace)); } catch (error) { console.warn("Local workspace could not be saved", error); } }
  function loadWorkspace() {
    const saved = safeParse(localStorage.getItem(storageKey()), null);
    if (saved) {
      state.workspace = { ...EMPTY_WORKSPACE(), ...saved, settings: { ...EMPTY_WORKSPACE().settings, ...(saved.settings || {}) } };
    } else {
      state.workspace = EMPTY_WORKSPACE();
      if (state.session?.mode === "demo") {
        state.workspace.profile = demoProfile();
        state.workspace.alerts = DEFAULT_ALERTS.map((item) => ({ ...item }));
        state.workspace.events = DEFAULT_EVENTS.map((item) => ({ ...item }));
        state.workspace.traceEvents = [{ id: "trace-field", title: "Field registered", detail: "Farmer-owned field record prepared", status: "done" }, { id: "trace-monitoring", title: "Monitoring workspace", detail: "Demo observation layer available", status: "done" }];
        saveWorkspace();
      }
    }
  }
  function addEvent(type, title, detail) {
    state.workspace.events.unshift({ id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`, type, title, detail, timestamp: nowIso() });
    saveWorkspace();
  }

  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove("show"), 3000);
  }
  function openModal(id) { const el = $(`#${id}`); if (el) { el.classList.remove("hidden"); document.body.style.overflow = "hidden"; } }
  function closeModal(id) { const el = $(`#${id}`); if (el) { el.classList.add("hidden"); document.body.style.overflow = ""; } }
  function closeAllOverlays() { closeModal("loginModal"); closeModal("profileModal"); $("#profilePopover")?.classList.add("hidden"); document.body.style.overflow = ""; }
  function openLogin() { closeAllOverlays(); text("#loginMessage", ""); $("#otpSection")?.classList.add("hidden"); $("#phoneLoginForm")?.classList.remove("hidden"); openModal("loginModal"); }
  function openProfileForm() {
    if (!state.session) { openLogin(); return; }
    closeAllOverlays();
    const profile = state.workspace.profile || {};
    ["profileName", "profileFarmerId", "profileFarmName", "profileFieldName", "profileLocation", "profileDistrict", "profileState", "profileCoordinates", "profileCultivation", "profileGodown"].forEach((id) => { const el = $(`#${id}`); if (el) el.value = profile[id.replace("profile", "").replace(/^./, (char) => char.toLowerCase())] || ""; });
    const phone = $("#profilePhone"); if (phone) phone.value = profile.phone || state.session.phone || "";
    const crop = $("#profileCrop"); if (crop) crop.value = profile.crop || "";
    text("#profileFormMessage", "");
    openModal("profileModal");
  }

  function setAvatar(selector, value) { const el = $(selector); if (el) el.textContent = initials(value); }
  function renderAuth() {
    const profile = state.workspace.profile;
    const loggedIn = Boolean(state.session);
    const name = profile?.name || (loggedIn ? "Farmer workspace" : "Guest workspace");
    const role = loggedIn ? (state.session.mode === "demo" ? "Demo farmer · local" : "Farmer · verified mobile") : "Login to begin";
    setAvatar("#topAvatar", name); setAvatar("#sidebarAvatar", name); setAvatar("#settingsAvatar", name); setAvatar("#popoverAvatar", name);
    text("#topName", profile?.name || (loggedIn ? "Farmer" : "Guest")); text("#topRole", loggedIn ? role : "Not signed in");
    text("#sidebarName", name); text("#sidebarRole", role); text("#popoverName", name); text("#popoverRole", role);
    text("#popoverPhone", profile?.phone || state.session?.phone || "Not signed in"); text("#popoverFarmerId", profile?.farmerId || "Pending setup");
    text("#settingsName", name); text("#settingsRole", loggedIn ? role : "Farmer profile locked"); text("#settingsPhone", profile?.phone || state.session?.phone || "Not signed in");
    text("#settingsFarmerId", profile?.farmerId || "—"); text("#settingsFarm", profile ? `${profile.farmName || "Farm"} · ${profile.fieldName || "Field"}` : "—"); text("#settingsLocation", profile ? [profile.location, profile.district, profile.state].filter(Boolean).join(", ") || "Not saved" : "—");
    const profilePill = $("#profileStatusPill"); if (profilePill) { profilePill.textContent = loggedIn ? (profile ? "Profile ready" : "Setup pending") : "Signed out"; profilePill.className = `pill ${loggedIn && profile ? "pill-green" : "pill-neutral"}`; }
    const loginButton = $("#popoverLoginBtn"); const logoutButton = $("#popoverLogoutBtn"); if (loginButton) loginButton.classList.toggle("hidden", loggedIn); if (logoutButton) logoutButton.classList.toggle("hidden", !loggedIn);
    const strip = $("#authStrip"); if (strip) strip.classList.toggle("hidden", false);
    text("#authStripText", loggedIn ? (state.session.mode === "demo" ? "Local demo workspace · data stays in this browser." : "Verified farmer workspace · profile data is scoped to this account.") : "This view is locked until a farmer signs in.");
    const stripButton = $("#authStripBtn"); if (stripButton) stripButton.textContent = loggedIn ? "Edit profile" : "Sign in";
    const dot = $("#connectionDot"); if (dot) dot.className = `status-dot ${loggedIn ? "offline" : "offline"}`;
    text("#connectionLabel", loggedIn ? "Offline ready" : "Offline ready"); text("#connectionSubtext", loggedIn ? "Local workspace is available." : "Local workspace is available.");
  }

  function renderSelectOptions() {
    const profile = state.workspace.profile;
    const selects = [$("#profileCrop"), $("#observationCrop")];
    selects.forEach((select) => { if (!select) return; const current = select.value; select.innerHTML = `<option value="">Select crop</option>${CROPS.map((crop) => `<option value="${crop}">${crop}</option>`).join("")}`; select.value = current || profile?.crop || ""; });
    const fields = [$("#pairField"), $("#observationField")];
    fields.forEach((select) => { if (!select) return; const current = select.value; select.innerHTML = `<option value="">Select field</option>${profile ? `<option value="${escapeHtml(profile.fieldName || "Primary field")}">${escapeHtml(profile.fieldName || "Primary field")} · ${escapeHtml(profile.farmName || "Farm")}</option>` : ""}`; select.value = current || profile?.fieldName || ""; });
  }

  function renderDashboard() {
    const profile = state.workspace.profile; const alerts = state.workspace.alerts || []; const openAlerts = alerts.filter((item) => item.status === "open");
    text("#welcomeName", profile?.name ? profile.name.split(" ")[0] : "farmer"); text("#welcomeSummary", profile ? `${profile.fieldName || "Your field"} · ${profile.crop || "Crop not selected"} · ${profile.location || "Location not saved"}. Values marked demo are not live telemetry.` : "Sign in to open your private crop workspace. Demo values are never presented as live telemetry.");
    text("#statField", profile?.fieldName || "Not configured"); text("#statLocation", profile ? [profile.location, profile.district].filter(Boolean).join(" · ") || "Location not saved" : "Location not saved");
    const health = profile ? "Monitor" : "—"; text("#statHealth", health); text("#statHealthFoot", profile ? "Demo indicator · not diagnosis" : "No assessment"); text("#statAlerts", profile ? openAlerts.length : 0); text("#statAlertsFoot", openAlerts.length ? "Review recommended actions" : "No active risk event"); text("#statSensor", state.workspace.pairing ? "Registered" : "Disconnected"); text("#statSensorFoot", state.workspace.pairing ? "Gateway not verified" : "Integration ready");
    text("#fieldPanelTitle", profile?.fieldName || "Your primary field"); text("#fieldPanelBadge", profile ? "Workspace ready" : "Not configured"); text("#fieldCrop", profile ? `${profile.crop || "Crop not selected"} · ${profile.farmName || "Farm"}` : "Select a crop to begin"); text("#fieldMeta", profile ? `${profile.location || "Location not saved"} · ${profile.state || "State not saved"}` : "Field and cultivation details will appear here."); text("#fieldDistrict", profile?.district || "—"); text("#fieldCultivation", profile?.cultivation || "—"); text("#fieldUpdated", profile?.savedAt ? formatDate(profile.savedAt) : "—"); text("#healthRingValue", profile ? "—" : "—");
    const container = $("#dashboardAlerts"); if (container) { container.innerHTML = openAlerts.length ? openAlerts.slice(0, 3).map(alertMini).join("") : `<div class="empty-state"><strong>No open alerts</strong><span>New signals will appear here after verified data is connected.</span></div>`; }
    text("#navAlertBadge", profile ? openAlerts.length : 0); text("#topAlertBadge", profile ? openAlerts.length : 0); $("#topAlertBadge")?.classList.toggle("hidden", !openAlerts.length);
  }
  function alertMini(item) { return `<div class="alert-item ${escapeHtml(item.level)}"><span class="alert-item-indicator"></span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.desc)}</p><small>${escapeHtml(item.time)} · ${escapeHtml(item.field || "Field not set")}</small></div></div>`; }

  function sensorCard(title, glyph, value, foot) { return `<article class="sensor-card"><div class="sensor-card-head"><span><i class="sensor-glyph">${glyph}</i>${title}</span><span class="status-dot offline"></span></div><strong class="sensor-card-value">${value}</strong><div class="sensor-card-footer"><span>${foot}</span><span class="pill pill-amber">Demo data</span></div></article>`; }
  function renderSensors() {
    const cards = $("#sensorCards"); if (cards) cards.innerHTML = [sensorCard("Temperature", "°", "24.6°C", "Simulated value"), sensorCard("Humidity", "%", "68%", "Simulated value"), sensorCard("Gas", "≈", "0.82", "No calibrated feed"), sensorCard("Airflow", "↝", "1.8 m/s", "Simulated value")].join("");
    const result = $("#pairingResult"); if (result) result.innerHTML = state.workspace.pairing ? `<span class="status-dot offline"></span><div><strong>${escapeHtml(state.workspace.pairing.deviceId)} · registered locally</strong><p>Field: ${escapeHtml(state.workspace.pairing.field)} · Hardware connection not verified.</p></div>` : `<span class="status-dot offline"></span><div><strong>Node not paired</strong><p>Waiting for a local device ID.</p></div>`;
    const deviceInput = $("#deviceId"); if (deviceInput && state.workspace.pairing && !deviceInput.value) deviceInput.value = state.workspace.pairing.deviceId;
  }
  function renderIntelligence() {
    const profile = state.workspace.profile; const crop = profile?.crop; const rule = CROP_PROFILES[crop] || null;
    text("#intelligenceCrop", crop || "Select a crop"); text("#intelligenceLocation", profile ? [profile.fieldName, profile.location].filter(Boolean).join(" · ") : "Set up a field to see the right profile."); text("#riskScore", profile ? "—" : "—"); text("#guidanceHeadline", profile ? "Rule-based field guidance" : "No crop profile yet"); text("#guidanceBody", profile ? "This is a crop profile reference, not a diagnosis or a live risk score. Verify conditions locally before acting." : "Verified crop rules can be added per crop. This demo does not infer a disease or live risk.");
    const pill = $("#riskPill"); if (pill) { pill.textContent = profile ? "Guidance available" : "No assessment"; pill.className = `pill ${profile ? "pill-green" : "pill-neutral"}`; }
    const rec = $("#recommendationDetails"); if (rec) rec.innerHTML = rule ? `<div class="recommendation-row"><span>⌁</span><div><strong>Temperature reference</strong><small>${escapeHtml(rule.temp)}</small></div></div><div class="recommendation-row"><span>◌</span><div><strong>Humidity reference</strong><small>${escapeHtml(rule.humidity)}</small></div></div><div class="recommendation-row"><span>i</span><div><strong>Crop note</strong><small>${escapeHtml(rule.note)}</small></div></div>` : `<div class="empty-state"><strong>Choose a crop in Settings</strong><span>Crop-specific guidance will appear here.</span></div>`;
  }
  function renderAlerts() {
    const alerts = state.workspace.alerts || []; const open = alerts.filter((item) => item.status === "open"); const resolved = alerts.filter((item) => item.status === "resolved");
    text("#openAlertCount", open.length); text("#resolvedAlertCount", resolved.length);
    const list = $("#alertsList"); if (!list) return;
    const visible = state.alertFilter === "all" ? alerts : state.alertFilter === "resolved" ? resolved : open;
    list.innerHTML = visible.length ? visible.map(alertRecord).join("") : `<div class="panel empty-state"><strong>${state.alertFilter === "resolved" ? "No resolved alerts yet" : "No open alerts"}</strong><span>There is no alert state to show for this filter. Live alerts remain integration-ready.</span></div>`;
  }
  function alertRecord(item) { const resolved = item.status === "resolved"; return `<article class="alert-record"><span class="alert-record-marker ${escapeHtml(item.level)}"></span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.desc)}</p><div class="alert-meta"><span>${escapeHtml(item.time)}</span><span>${escapeHtml(item.field || "Field not set")}</span><span>${escapeHtml(item.crop || "Crop not set")}</span><span class="pill ${resolved ? "pill-green" : item.level === "warning" ? "pill-amber" : "pill-neutral"}">${resolved ? "Resolved" : item.demo ? "Demo signal" : "Open"}</span></div></div><div class="alert-actions"><small>${resolved ? `Resolved ${formatDate(item.resolvedAt)}` : "Action required"}</small>${resolved ? "" : `<button class="btn btn-secondary resolve-alert" data-alert-id="${escapeHtml(item.id)}" type="button">Mark resolved</button>`}</div></article>`; }

  function renderHistory() {
    const events = state.workspace.events || []; const visible = state.historyFilter === "all" ? events : events.filter((item) => item.type === state.historyFilter);
    const list = $("#historyList"); if (!list) return; list.innerHTML = visible.length ? visible.map((event) => `<article class="history-item"><time>${formatTime(event.timestamp)}</time><div class="history-item-body"><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.detail)}</p><span class="history-item-tag">${escapeHtml(event.type)}</span></div></article>`).join("") : `<div class="empty-state"><strong>No events match this filter</strong><span>Actions and observations will appear here as you use the workspace.</span></div>`;
  }
  function renderTraceability() {
    const profile = state.workspace.profile; text("#traceabilityTitle", profile ? `${profile.fieldName || "Primary field"} · ${profile.crop || "Crop not selected"}` : "Set up a field to begin"); text("#traceabilitySubtitle", profile ? `${profile.farmName || "Farm"} · ${[profile.location, profile.district, profile.state].filter(Boolean).join(", ") || "Location not saved"}` : "Your farmer-owned record will appear here.");
    const steps = [{ title: "Field", detail: profile ? "Registered" : "Awaiting setup", done: Boolean(profile) }, { title: "Crop", detail: profile?.crop || "Awaiting crop", done: Boolean(profile?.crop) }, { title: "Monitoring", detail: profile ? "Workspace ready" : "Integration ready", done: Boolean(profile) }, { title: "Actions", detail: state.workspace.events?.some((e) => e.type === "action") ? "Recorded" : "Future event", done: state.workspace.events?.some((e) => e.type === "action") }, { title: "Harvest", detail: "Future record", done: false }, { title: "Storage / linkage", detail: "Not connected", done: false }];
    const timeline = $("#traceabilityTimeline"); if (timeline) timeline.innerHTML = steps.map((step) => `<div class="trace-step ${step.done ? "" : "locked"}"><strong>${step.title}</strong><span>${step.detail}</span></div>`).join("");
  }
  function renderSettings() {
    const settings = state.workspace.settings || {}; const temp = $("#tempThreshold"); const humidity = $("#humidityThreshold"); const notifications = $("#localNotifications"); if (temp) temp.value = settings.tempThreshold ?? 28; if (humidity) humidity.value = settings.humidityThreshold ?? 75; if (notifications) notifications.checked = settings.localNotifications !== false;
  }
  function renderAll() { renderAuth(); renderSelectOptions(); renderDashboard(); renderSensors(); renderIntelligence(); renderAlerts(); renderHistory(); renderTraceability(); renderSettings(); drawAllCharts(); }

  function drawChart(canvasId, dataSets, colors) {
    const canvas = $(`#${canvasId}`); if (!canvas || !canvas.offsetWidth) return; const width = canvas.offsetWidth; const height = Number(canvas.getAttribute("height")) || 220; const ratio = window.devicePixelRatio || 1; canvas.width = width * ratio; canvas.height = height * ratio; canvas.style.height = `${height}px`; const ctx = canvas.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height); const pad = { top: 15, right: 12, bottom: 22, left: 22 }; ctx.strokeStyle = "#e8efea"; ctx.lineWidth = 1; for (let i = 0; i < 4; i += 1) { const y = pad.top + i * ((height - pad.top - pad.bottom) / 3); ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke(); } dataSets.forEach((values, setIndex) => { const max = 100; ctx.beginPath(); values.forEach((value, index) => { const x = pad.left + index * ((width - pad.left - pad.right) / Math.max(values.length - 1, 1)); const y = pad.top + (height - pad.top - pad.bottom) * (1 - Math.max(0, Math.min(value, max)) / max); if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.strokeStyle = colors[setIndex]; ctx.lineWidth = 2; ctx.stroke(); }); ctx.fillStyle = "#91a097"; ctx.font = "10px DM Sans"; ["-12h", "-8h", "-4h", "Now"].forEach((label, index, labels) => { const x = pad.left + index * ((width - pad.left - pad.right) / (labels.length - 1)); ctx.fillText(label, x - 10, height - 5); }); }
  function drawAllCharts() { drawChart("dashboardChart", [[62, 64, 66, 65, 68, 67, 68, 69, 68], [48, 48, 50, 51, 52, 51, 52, 53, 52]], ["#168255", "#5d96bc"]); drawChart("sensorChart", [[61, 62, 61, 64, 63, 65, 64, 66, 65], [45, 46, 48, 47, 49, 50, 49, 51, 50]], ["#168255", "#c69446"]); }

  function navigate(page) { const target = $(`#${page}`); if (!target) return; $$(".page").forEach((item) => item.classList.remove("active-page")); target.classList.add("active-page"); $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === page)); text("#pageTitle", PAGE_TITLES[page] || "Field overview"); $("#appShell")?.classList.remove("nav-open"); window.scrollTo({ top: 0, behavior: "smooth" }); window.setTimeout(drawAllCharts, 30); }

  async function saveProfile(profile) {
    state.workspace.profile = { ...(state.workspace.profile || {}), ...profile, savedAt: nowIso() }; saveWorkspace(); addEvent("system", "Farmer profile saved", `${state.workspace.profile.name} updated the farmer-owned field profile.`);
    if (state.session?.mode === "firebase" && firebaseDb && firebase.auth().currentUser) {
      try { await firebaseDb.collection("farmers").doc(firebase.auth().currentUser.uid).set({ ...state.workspace.profile, uid: firebase.auth().currentUser.uid, phone: firebase.auth().currentUser.phoneNumber || state.workspace.profile.phone, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); toast("Profile saved to the browser and Firebase."); } catch (error) { console.warn("Firebase profile save failed", error); toast("Profile saved locally; Firebase sync is unavailable."); }
    } else toast("Farmer profile saved locally.");
    closeModal("profileModal"); renderAll();
  }
  async function loadFirebaseProfile(user) { if (!firebaseDb) return null; try { const doc = await firebaseDb.collection("farmers").doc(user.uid).get(); return doc.exists ? { uid: user.uid, ...doc.data(), phone: user.phoneNumber || doc.data().phone } : null; } catch (error) { console.warn("Firebase profile load failed", error); return null; } }

  async function signOut() {
    try { if (state.session?.mode === "firebase" && firebaseReady) await firebase.auth().signOut(); } catch (error) { console.warn("Firebase sign out failed", error); }
    state.session = null; state.workspace = EMPTY_WORKSPACE(); closeAllOverlays(); navigate("dashboard"); renderAll(); toast("You have been logged out. Private farmer information is cleared from view.");
  }

  function bindEvents() {
    $$('[data-page]').forEach((button) => button.addEventListener("click", () => navigate(button.dataset.page)));
    $("#mobileMenuBtn")?.addEventListener("click", () => $("#appShell")?.classList.add("nav-open")); $("#mobileCloseNav")?.addEventListener("click", () => $("#appShell")?.classList.remove("nav-open")); $("#mobileBackdrop")?.addEventListener("click", () => $("#appShell")?.classList.remove("nav-open"));
    [$("#topProfileBtn"), $("#sidebarProfileBtn")].forEach((button) => button?.addEventListener("click", () => $("#profilePopover")?.classList.toggle("hidden")));
    $("#popoverLoginBtn")?.addEventListener("click", openLogin); $("#popoverLogoutBtn")?.addEventListener("click", signOut); $("#popoverEditBtn")?.addEventListener("click", () => { $("#profilePopover")?.classList.add("hidden"); state.session ? (state.workspace.profile ? navigate("settings") : openProfileForm()) : openLogin(); });
    $("#topAlertBtn")?.addEventListener("click", () => navigate("alerts")); $("#authStripBtn")?.addEventListener("click", () => state.session ? openProfileForm() : openLogin()); $("#dashboardSetupBtn")?.addEventListener("click", () => state.session ? openProfileForm() : openLogin()); $("#editProfilePageBtn")?.addEventListener("click", openProfileForm); $("#settingsLogoutBtn")?.addEventListener("click", signOut);
    $$('[data-close-modal]').forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
    $$(".modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal.id); }));
    document.addEventListener("click", (event) => { const popover = $("#profilePopover"); if (popover && !popover.classList.contains("hidden") && !popover.contains(event.target) && !event.target.closest(".top-profile") && !event.target.closest(".sidebar-profile")) popover.classList.add("hidden"); });

    $("#demoLoginBtn")?.addEventListener("click", () => { state.session = { mode: "demo", phone: "+91 98765 43210" }; loadWorkspace(); closeModal("loginModal"); renderAll(); toast("Demo workspace opened. All values remain locally labelled."); });
    $("#phoneLoginForm")?.addEventListener("submit", async (event) => { event.preventDefault(); const input = $("#phoneNumber"); const phone = input?.value.trim(); const message = $("#loginMessage"); if (!/^\+\d{8,15}$/.test(phone || "")) { text("#loginMessage", "Enter a valid number with country code, such as +919876543210."); return; } if (!firebaseReady) { text("#loginMessage", "Phone authentication is not available in this browser. Use the demo workspace or connect Firebase Auth."); return; } try { if (!recaptchaVerifier) recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", { size: "invisible" }); confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, recaptchaVerifier); $("#phoneLoginForm")?.classList.add("hidden"); $("#otpSection")?.classList.remove("hidden"); text("#loginMessage", "Verification code sent. Check your phone."); } catch (error) { console.error(error); if (message) message.textContent = "Could not send a code. Check Firebase Auth configuration or use the demo workspace."; } });
    $("#verifyOtpBtn")?.addEventListener("click", async () => { const code = $("#otpCode")?.value.trim(); if (!confirmationResult || !/^\d{6}$/.test(code || "")) { text("#loginMessage", "Enter the 6-digit verification code."); return; } try { await confirmationResult.confirm(code); closeModal("loginModal"); } catch (error) { console.error(error); text("#loginMessage", "The verification code could not be confirmed."); } });

    $("#profileForm")?.addEventListener("submit", async (event) => { event.preventDefault(); const values = { name: $("#profileName")?.value.trim(), phone: $("#profilePhone")?.value.trim(), farmerId: $("#profileFarmerId")?.value.trim(), farmName: $("#profileFarmName")?.value.trim(), fieldName: $("#profileFieldName")?.value.trim(), crop: $("#profileCrop")?.value, location: $("#profileLocation")?.value.trim(), district: $("#profileDistrict")?.value.trim(), state: $("#profileState")?.value.trim(), coordinates: $("#profileCoordinates")?.value.trim(), cultivation: $("#profileCultivation")?.value.trim(), godown: $("#profileGodown")?.value.trim() }; if (!values.name || !values.farmerId || !values.fieldName || !values.crop) { text("#profileFormMessage", "Name, Farmer ID, field name, and crop are required."); return; } await saveProfile(values); });
    $("#pairingForm")?.addEventListener("submit", (event) => { event.preventDefault(); const field = $("#pairField")?.value; const deviceId = $("#deviceId")?.value.trim(); if (!field || !deviceId) { toast("Select a field and enter the ESP-12E device ID."); return; } state.workspace.pairing = { field, deviceId, registeredAt: nowIso(), connected: false }; addEvent("system", "Hardware pairing registered", `${deviceId} was registered locally for ${field}; live connection is not verified.`); saveWorkspace(); renderAll(); toast("Pairing saved locally. Hardware remains disconnected until a verified message arrives."); });
    $("#observationImage")?.addEventListener("change", (event) => { const file = event.target.files?.[0]; const preview = $("#imagePreview"); if (!preview) return; if (!file) { preview.innerHTML = "<span>Image preview appears here</span>"; return; } const reader = new FileReader(); reader.onload = () => { preview.innerHTML = `<img src="${reader.result}" alt="Selected crop observation preview">`; }; reader.readAsDataURL(file); });
    $("#observationForm")?.addEventListener("submit", (event) => { event.preventDefault(); const field = $("#observationField")?.value; const crop = $("#observationCrop")?.value; const notes = $("#observationNotes")?.value.trim(); const file = $("#observationImage")?.files?.[0]; if (!field || !crop || !notes) { const result = $("#observationResult"); if (result) { result.classList.remove("hidden"); result.textContent = "Select a field, crop, and add a short observation note."; } return; } const observation = { id: `obs-${Date.now()}`, field, crop, notes, imageName: file?.name || null, timestamp: nowIso(), status: "recorded" }; state.workspace.observations.unshift(observation); addEvent("observation", "Farmer observation recorded", `${crop} note added for ${field}${file ? ` with image ${file.name}` : " without an image"}.`); saveWorkspace(); const result = $("#observationResult"); if (result) { result.classList.remove("hidden"); result.textContent = "Observation recorded locally. Image analysis integration ready — diagnosis is not available in this demo."; } $("#observationNotes").value = ""; toast("Observation recorded in event history."); });
    $$(".filter-btn").forEach((button) => button.addEventListener("click", () => { $$(".filter-btn").forEach((item) => item.classList.remove("active")); button.classList.add("active"); state.alertFilter = button.dataset.alertFilter; renderAlerts(); }));
    $("#refreshAlertsBtn")?.addEventListener("click", () => { renderAlerts(); toast("Demo state refreshed. No live telemetry was received."); });
    $("#alertsList")?.addEventListener("click", (event) => { const button = event.target.closest(".resolve-alert"); if (!button) return; const alert = state.workspace.alerts.find((item) => item.id === button.dataset.alertId); if (!alert) return; alert.status = "resolved"; alert.resolvedAt = nowIso(); addEvent("action", "Alert resolved", `${alert.title} marked resolved for ${alert.field || "field"}.`); saveWorkspace(); renderAll(); toast("Alert resolved and action added to event history."); });
    $("#historyFilter")?.addEventListener("change", (event) => { state.historyFilter = event.target.value; renderHistory(); }); $("#clearDemoHistoryBtn")?.addEventListener("click", () => { state.workspace.events = []; saveWorkspace(); renderHistory(); toast("Event history cleared for this local workspace."); });
    $("#addTraceEventBtn")?.addEventListener("click", () => { if (!state.workspace.profile) { toast("Set up a farmer profile before adding a traceability event."); return; } state.workspace.traceEvents = [...(state.workspace.traceEvents || []), { id: `trace-${Date.now()}`, title: "Farmer action recorded", detail: "Demo traceability event", status: "done" }]; addEvent("action", "Traceability event recorded", "A farmer action was added to the local record boundary."); saveWorkspace(); renderTraceability(); toast("Traceability event added to local history."); });
    $("#saveSettingsBtn")?.addEventListener("click", () => { state.workspace.settings = { tempThreshold: Number($("#tempThreshold")?.value || 28), humidityThreshold: Number($("#humidityThreshold")?.value || 75), localNotifications: Boolean($("#localNotifications")?.checked) }; localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.workspace.settings)); saveWorkspace(); addEvent("system", "Workspace preferences saved", "Local demo thresholds were updated in this browser."); toast("Preferences saved locally."); });
    $("#resetWorkspaceBtn")?.addEventListener("click", () => { if (!window.confirm("Reset this browser's BhoomiNOVA demo data?")) return; localStorage.removeItem(storageKey()); state.workspace = EMPTY_WORKSPACE(); renderAll(); toast("Local demo data reset. Profile details are no longer visible."); });
    window.addEventListener("resize", drawAllCharts);
  }

  if (firebaseReady) {
    firebase.auth().onAuthStateChanged(async (user) => { if (user) { state.session = { mode: "firebase", uid: user.uid, phone: user.phoneNumber || "" }; loadWorkspace(); const remote = await loadFirebaseProfile(user); if (remote) { state.workspace.profile = remote; saveWorkspace(); } renderAll(); if (!state.workspace.profile) openProfileForm(); } else if (state.session?.mode !== "demo") { state.session = null; state.workspace = EMPTY_WORKSPACE(); renderAll(); } });
  }

  bindEvents();
  loadWorkspace();
  renderAll();
})();
