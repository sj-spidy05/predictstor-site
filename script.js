 const firebaseConfig = {
  apiKey: "AIzaSyBxVrLZ0YYaGYcEjxL2gyDXKaudDyPNvZM",
  authDomain: "predictstor.firebaseapp.com",
  projectId: "predictstor",
  storageBucket: "predictstor.firebasestorage.app",
  messagingSenderId: "984193094318",
  appId: "1:984193094318:web:5c5614bf83a431b98f133f",
  measurementId: "G-L254S3YZ5D"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const STORAGE_KEY = "predictstor_profile_v1";

const pages = {
  dashboard: "Storage Dashboard",
  sensors: "Live Sensor Network",
  prediction: "AI Spoilage Prediction",
  alerts: "Alerts & Actions",
  storage: "Storage Batches",
  controls: "Automatic Control Status",
  reports: "Reports & Analytics",
  settings: "Settings"
};

let confirmationResult = null;
let recaptchaVerifier = null;

let sensorData = {
  temperature: 24.6,
  humidity: 68,
  gas: 0.82,
  airflow: 1.8,
  battery: 86
};

let alerts = [
  {
    level: "warning",
    title: "Gas concentration rising",
    time: "2 min ago",
    desc: "Gas level is approaching the configured watch range."
  },
  {
    level: "info",
    title: "Sensor system ready",
    time: "34 min ago",
    desc: "Demo sensor values are available until the physical device is connected."
  },
  {
    level: "warning",
    title: "Humidity monitoring",
    time: "1 hr ago",
    desc: "Humidity trend is being checked against the storage recommendation."
  },
  {
    level: "good",
    title: "System stabilized",
    time: "2 hr ago",
    desc: "Environmental values are currently within the demo target range."
  }
];

let batches = [
  ["ON-2026-0815", "Red Onion", "4.8 t", "15 Aug 2026", "24.6°C", "68%", "Healthy"],
  ["ON-2026-0812", "Nashik Red", "7.2 t", "12 Aug 2026", "25.1°C", "70%", "Healthy"],
  ["ON-2026-0808", "Bellary Onion", "5.4 t", "08 Aug 2026", "27.4°C", "76%", "Watch"],
  ["ON-2026-0801", "White Onion", "3.1 t", "01 Aug 2026", "26.8°C", "72%", "Healthy"]
];


/* ---------------------------------------------
   BASIC HELPERS
--------------------------------------------- */

function showToast(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// ============================================
// PREDICSTOR SECURE FARMER PROFILE SYSTEM
// Firebase Authentication + Cloud Firestore
// ============================================

// Firestore database
const db = firebase.firestore();

// Current farmer profile stored only in memory.
// localStorage is NOT used as the source of truth.
let currentProfile = null;


// --------------------------------------------
// GET CURRENT FARMER PROFILE
// --------------------------------------------
function getProfile() {
  return currentProfile;
}


// --------------------------------------------
// LOAD PROFILE FOR CURRENT LOGGED-IN USER
// --------------------------------------------
async function loadProfile() {
  const user = firebase.auth().currentUser;

  if (!user) {
    currentProfile = null;
    return null;
  }

  try {
    const farmerRef = db.collection("farmers").doc(user.uid);

    const farmerDoc = await farmerRef.get();

    if (!farmerDoc.exists) {
      currentProfile = null;
      return null;
    }

    currentProfile = {
      uid: user.uid,
      ...farmerDoc.data()
    };

    return currentProfile;

  } catch (error) {
    console.error("Error loading farmer profile:", error);
    currentProfile = null;
    throw error;
  }
}


// --------------------------------------------
// SAVE FARMER PROFILE
// --------------------------------------------
async function saveProfile(profile) {
  const user = firebase.auth().currentUser;

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const data = {
    ...profile,

    uid: user.uid,

    // Authenticated phone is the trusted identity
    phone: user.phoneNumber || profile.phone || "",

    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db
    .collection("farmers")
    .doc(user.uid)
    .set(data, { merge: true });

  currentProfile = {
    ...currentProfile,
    ...data
  };

  return currentProfile;
}


// --------------------------------------------
// CHECK DUPLICATE FARMER ID
// --------------------------------------------
async function isFarmerIdTaken(farmerId) {

  if (!farmerId) return false;

  const user = firebase.auth().currentUser;

  const snapshot = await db
    .collection("farmers")
    .where("farmerId", "==", farmerId.trim())
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  // Same logged-in farmer editing own profile = allowed
  return snapshot.docs.some(doc => doc.id !== user.uid);
}


// --------------------------------------------
// CHECK DUPLICATE PHONE
// --------------------------------------------
async function isPhoneTaken(phone) {

  if (!phone) return false;

  const user = firebase.auth().currentUser;

  const normalizedPhone = phone.trim();

  const snapshot = await db
    .collection("farmers")
    .where("phone", "==", normalizedPhone)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  return snapshot.docs.some(doc => doc.id !== user.uid);
}


// --------------------------------------------
// CREATE OR UPDATE FARMER PROFILE
// --------------------------------------------
async function createOrUpdateFarmer(profile) {

  const user = firebase.auth().currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const farmerId = (profile.farmerId || "").trim();

  // Name is NOT checked because multiple farmers
  // can legitimately have the same name.

  if (!farmerId) {
    throw new Error("Farmer ID is required.");
  }


  // Duplicate Farmer ID protection
  const farmerIdTaken = await isFarmerIdTaken(farmerId);

  if (farmerIdTaken) {
    throw new Error(
      "This Farmer ID is already registered. Please use your correct unique Farmer ID."
    );
  }


  // Always use authenticated phone number
  const authenticatedPhone = user.phoneNumber;

  if (!authenticatedPhone) {
    throw new Error(
      "Authenticated phone number not found. Please login again."
    );
  }


  const phoneTaken = await isPhoneTaken(authenticatedPhone);

  if (phoneTaken) {
    throw new Error(
      "This phone number is already linked to another farmer."
    );
  }


  const farmerData = {
    ...profile,

    uid: user.uid,
    farmerId: farmerId,

    phone: authenticatedPhone,

    name: (profile.name || "").trim(),

    createdAt:
      currentProfile?.createdAt ||
      firebase.firestore.FieldValue.serverTimestamp(),

    updatedAt:
      firebase.firestore.FieldValue.serverTimestamp()
  };


  await db
    .collection("farmers")
    .doc(user.uid)
    .set(farmerData, { merge: true });


  currentProfile = {
    ...currentProfile,
    ...farmerData
  };

  return currentProfile;
}


// --------------------------------------------
// CLEAR PROFILE AFTER LOGOUT
// --------------------------------------------
function clearCurrentProfile() {

  currentProfile = null;

  // Remove only the old insecure cache
  localStorage.removeItem("predictstor_profile_v1");
}


// --------------------------------------------
// LISTEN FOR AUTH CHANGES
// --------------------------------------------
firebase.auth().onAuthStateChanged(async (user) => {

  if (user) {

    try {
      await loadProfile();

    } catch (error) {

      console.error(
        "Unable to load farmer profile:",
        error
      );

    }

  } else {

    clearCurrentProfile();

  }

});

function getInitials(value) {
  if (!value) return "GU";

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}


/* ---------------------------------------------
   NAVIGATION
--------------------------------------------- */

function navigate(page) {
  const target = document.getElementById(page);

  if (!target) {
    showToast("This page is not available.");
    return;
  }

  $$(".page").forEach(item => {
    item.classList.remove("active-page");
  });

  target.classList.add("active-page");

  $$(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  if ($("#pageTitle")) {
    $("#pageTitle").textContent = pages[page] || "PredicStor";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (page === "sensors") drawSensorChart();

  if (page === "prediction") {
    drawRiskChart();
    updateOptimizationUI();
  }

  if (page === "reports") drawReportChart();
}

$$(".nav-item[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.page);
  });
});

$$("[data-page]").forEach(button => {
  if (!button.classList.contains("nav-item")) {
    button.addEventListener("click", () => {
      navigate(button.dataset.page);
    });
  }
});

$("#notificationBtn")?.addEventListener("click", () => {
  navigate("alerts");
});


/* ---------------------------------------------
   CHARTS
--------------------------------------------- */

function lineChart(canvasId, datasets, labels) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) return;

  const width = canvas.clientWidth;

  if (!width) return;

  const height = canvas.clientHeight || 240;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const ctx = canvas.getContext("2d");

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "#e7ede9";
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const y = 18 + i * (height - 45) / 4;

    ctx.beginPath();
    ctx.moveTo(35, y);
    ctx.lineTo(width - 15, y);
    ctx.stroke();
  }

  const colors = ["#13834b", "#7aa9c8", "#d69a22"];

  datasets.forEach((dataset, datasetIndex) => {
    ctx.beginPath();

    dataset.forEach((value, index) => {
      const x =
        35 +
        index *
        (width - 50) /
        Math.max(dataset.length - 1, 1);

      const y =
        18 +
        (height - 50) *
        (1 - Math.max(0, Math.min(value, 100)) / 100);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = colors[datasetIndex % colors.length];
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.fillStyle = "#839088";
  ctx.font = "10px Inter";

  labels.forEach((label, index) => {
    const x =
      35 +
      index *
      (width - 50) /
      Math.max(labels.length - 1, 1);

    ctx.fillText(label, x - 8, height - 5);
  });
}

function drawEnv() {
  lineChart(
    "envChart",
    [
      [52, 55, 58, 61, 60, 58, 62, 64, 61, 59, 57, 60, 62],
      [64, 66, 67, 69, 68, 70, 71, 69, 67, 68, 69, 68, 67]
    ],
    ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22", "Now"]
  );
}

function drawSensorChart() {
  lineChart(
    "sensorChart",
    [
      [48, 49, 48, 51, 52, 51, 50, 52, 54, 53, 52, 51, 53],
      [61, 62, 62, 63, 64, 63, 64, 65, 66, 65, 67, 66, 65]
    ],
    ["-60m", "-50m", "-40m", "-30m", "-20m", "-10m", "Now"]
  );
}

function drawRiskChart() {
  const profile = getProfile();
  let risk = 12;

  if (profile) {
    risk = calculateRisk(profile);
  }

  lineChart(
    "riskChart",
    [[risk, risk + 3, risk + 5, risk + 9, risk + 13, risk + 18, risk + 23]],
    ["Now", "D1", "D2", "D3", "D4", "D5", "D6"]
  );
}

function drawReportChart() {
  lineChart(
    "reportChart",
    [[30, 42, 39, 51, 57, 68, 76, 84]],
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]
  );
}


/* ---------------------------------------------
   PRODUCT OPTIMIZATION
--------------------------------------------- */

function getRecommendation(product) {
  const recommendations = {
    Onion: {
      temp: "0–4°C for refrigerated storage or controlled ambient storage depending on curing and storage method",
      humidity: "65–75%",
      gas: "Keep gas accumulation low with regular ventilation",
      ventilation: "Moderate, dry airflow",
      note: "Avoid excess moisture because sprouting and rot risk can increase."
    },

    Potato: {
      temp: "4–10°C depending on intended use",
      humidity: "90–95%",
      gas: "Maintain fresh air exchange",
      ventilation: "Moderate airflow",
      note: "Avoid unsuitable temperatures that can affect quality."
    },

    Tomato: {
      temp: "12–20°C depending on maturity",
      humidity: "85–95%",
      gas: "Monitor ripening gases",
      ventilation: "Gentle airflow",
      note: "Do not overcool immature tomatoes."
    },

    Carrot: {
      temp: "0–4°C",
      humidity: "90–95%",
      gas: "Maintain clean air",
      ventilation: "Low to moderate",
      note: "High humidity helps reduce dehydration."
    },

    Cabbage: {
      temp: "0–4°C",
      humidity: "90–95%",
      gas: "Fresh air circulation recommended",
      ventilation: "Moderate",
      note: "Avoid prolonged heat exposure."
    },

    Cauliflower: {
      temp: "0–4°C",
      humidity: "90–95%",
      gas: "Fresh air recommended",
      ventilation: "Moderate",
      note: "Low temperature storage can extend quality."
    },

    Garlic: {
      temp: "0–5°C or suitable dry ambient storage",
      humidity: "60–70%",
      gas: "Low accumulation",
      ventilation: "Dry airflow",
      note: "Dry conditions are important."
    },

    Apple: {
      temp: "0–4°C",
      humidity: "90–95%",
      gas: "Ethylene monitoring is useful",
      ventilation: "Controlled",
      note: "Storage conditions depend on variety."
    },

    Other: {
      temp: "Set after product-specific analysis",
      humidity: "Set after product-specific analysis",
      gas: "Monitor gas accumulation",
      ventilation: "Maintain adequate airflow",
      note: "Select a specific product profile for more accurate recommendations."
    }
  };

  return recommendations[product] || recommendations.Other;
}

function calculateRisk(profile) {
  let risk = 8;

  if (sensorData.temperature > 28) risk += 15;
  if (sensorData.humidity > 80) risk += 12;
  if (sensorData.gas > 1) risk += 10;

  if (
    profile.product === "Tomato" &&
    sensorData.temperature < 10
  ) {
    risk += 8;
  }

  return Math.min(risk, 95);
}

function updateOptimizationUI() {
  const profile = getProfile();

  if (!profile) {
    $("#optimizationSummary").textContent =
      "Configure your godown and product to receive storage recommendations.";

    $("#predictionProduct").textContent = "Not configured";
    $("#predictionLocation").textContent = "Location not configured";
    $("#riskValue").textContent = "--";

    $("#recommendationDetails").textContent =
      "Configure a product to see recommended targets.";

    return;
  }

  const recommendation = getRecommendation(profile.product);
  const risk = calculateRisk(profile);

  $("#heroProduct").textContent = profile.product;
  $("#heroLocation").textContent = profile.location;

  $("#predictionProduct").textContent = profile.product;
  $("#predictionLocation").textContent =
    `${profile.godownName} • ${profile.location}`;

  $("#riskValue").textContent = `${risk}%`;

  $("#optimizationSummary").innerHTML = `
    <b>${profile.product} storage recommendation</b><br>
    Location: ${profile.location}<br>
    Current focus: ${recommendation.note}
  `;

  $("#recommendationDetails").innerHTML = `
    <div>
      <b>Temperature</b>
      <span>${recommendation.temp}</span>
    </div>
    <div>
      <b>Humidity</b>
      <span>${recommendation.humidity}</span>
    </div>
    <div>
      <b>Gas / Air Quality</b>
      <span>${recommendation.gas}</span>
    </div>
    <div>
      <b>Ventilation</b>
      <span>${recommendation.ventilation}</span>
    </div>
    <div>
      <b>Important Note</b>
      <span>${recommendation.note}</span>
    </div>
  `;
}


/* ---------------------------------------------
   PROFILE UI
--------------------------------------------- */

function updateProfileUI(user) {
  const profile = getProfile();

  /* IMPORTANT LOGOUT FIX */
  const displayName =
    user
      ? (profile?.name || user.phoneNumber || "User")
      : "Guest User";

  const phone =
    user
      ? (user.phoneNumber || profile?.phone || "Not available")
      : "Not logged in";

  const initials = getInitials(displayName);

  $("#userName").textContent = displayName;
  $("#userRole").textContent =
    user ? "Farmer" : "Not logged in";

  $("#profileUserName").textContent = displayName;
  $("#profileUserRole").textContent =
    user ? "Farmer" : "Not logged in";

  $("#profileUserPhone").textContent = phone;

  $("#topAvatar").textContent = initials;
  $("#profileAvatar").textContent = initials;

  $("#profileGodownName").textContent =
    user && profile?.godownName
      ? profile.godownName
      : "Not configured";

  if (user && profile) {
    $("#welcomeTitle").textContent =
      `Welcome, ${profile.name}`;

    $("#godownSummary").textContent =
      `${profile.godownName} • ${profile.location} • ${profile.product}`;

    $("#setupFromDashboard").textContent =
      "Edit My Godown";

    $("#pairedGodownId").textContent =
      profile.godownId || "Not configured";

    $("#pairedDeviceId").textContent =
      profile.deviceId || "Not paired";

    if (profile.deviceId) {
      $("#deviceConnectionStatus").textContent =
        `● Paired: ${profile.deviceId}`;

      $("#systemStatus").textContent = "System Ready";
      $("#systemSubStatus").textContent =
        "Device pairing saved";
    }

  } else {
    $("#welcomeTitle").textContent =
      user
        ? "Complete your godown setup"
        : "Your storage is ready";

    $("#godownSummary").textContent =
      user
        ? "Add your godown details and stored product."
        : "Login and configure your godown to begin monitoring.";

    $("#setupFromDashboard").textContent =
      user ? "Setup My Godown" : "Login to Setup";

    $("#pairedGodownId").textContent =
      "Not configured";

    $("#pairedDeviceId").textContent =
      "Not paired";

    $("#deviceConnectionStatus").textContent =
      "● Device not paired";
  }

  updateOptimizationUI();
}


/* ---------------------------------------------
   LOGIN / USER MENU
--------------------------------------------- */

$("#menuBtn")?.addEventListener("click", () => {
  const user = firebase.auth().currentUser;

  if (user) {
    $("#loginPanel").classList.add("hidden");
    $("#userProfileMenu").classList.toggle("hidden");
  } else {
    $("#userProfileMenu").classList.add("hidden");
    $("#loginPanel").classList.remove("hidden");
  }
});

$("#closeLoginBtn")?.addEventListener("click", () => {
  $("#loginPanel").classList.add("hidden");
});

$("#closeSetupBtn")?.addEventListener("click", () => {
  $("#setupModal").classList.add("hidden");
});


/* ---------------------------------------------
   FIREBASE OTP
--------------------------------------------- */

$("#sendOtpBtn")?.addEventListener("click", async () => {
  const phone = $("#phoneNumber").value.trim();

  if (!phone) {
    showToast("Enter your mobile number.");
    return;
  }

  try {
    if (!recaptchaVerifier) {
      recaptchaVerifier =
        new firebase.auth.RecaptchaVerifier(
          "recaptcha-container",
          {
            size: "normal"
          }
        );

      await recaptchaVerifier.render();
    }

    confirmationResult =
      await firebase.auth()
        .signInWithPhoneNumber(
          phone,
          recaptchaVerifier
        );

    $("#otpSection").classList.remove("hidden");

    showToast("OTP sent successfully.");

  } catch (error) {
    console.error(error);

    showToast(
      error.message || "OTP could not be sent."
    );
  }
});

$("#verifyOtpBtn")?.addEventListener("click", async () => {
  const otp = $("#otpCode").value.trim();

  if (!confirmationResult) {
    showToast("Request OTP first.");
    return;
  }

  if (!otp) {
    showToast("Enter the verification code.");
    return;
  }

  try {
    const result =
      await confirmationResult.confirm(otp);

    $("#loginPanel").classList.add("hidden");
    $("#otpSection").classList.add("hidden");

    confirmationResult = null;

    updateProfileUI(result.user);

    const profile = getProfile();

    if (!profile) {
      openSetup();
    }

    showToast("Login successful.");

  } catch (error) {
    console.error(error);
    showToast("Invalid OTP. Try again.");
  }
});


/* ---------------------------------------------
   PROFILE / GODOWN SETUP
--------------------------------------------- */

function openSetup() {
  const user = firebase.auth().currentUser;

  if (!user) {
    $("#loginPanel").classList.remove("hidden");
    return;
  }

  const profile = getProfile();

  if (profile) {
    $("#setupName").value = profile.name || "";
    $("#setupUserId").value = profile.userId || "";
    $("#setupGodownName").value =
      profile.godownName || "";
    $("#setupGodownId").value =
      profile.godownId || "";
    $("#setupLocation").value =
      profile.location || "";
    $("#setupProduct").value =
      profile.product || "";
  }

  $("#setupModal").classList.remove("hidden");
}

$("#setupFromDashboard")?.addEventListener("click", () => {
  if (!firebase.auth().currentUser) {
    $("#loginPanel").classList.remove("hidden");
    return;
  }

  openSetup();
});

$("#editProfileBtn")?.addEventListener("click", () => {
  $("#userProfileMenu").classList.add("hidden");
  openSetup();
});

$("#saveProfileBtn")?.addEventListener("click", () => {
  const user = firebase.auth().currentUser;

  if (!user) {
    showToast("Login first.");
    return;
  }

  const profile = {
    name: $("#setupName").value.trim(),
    userId: $("#setupUserId").value.trim(),
    phone: user.phoneNumber || "",
    godownName: $("#setupGodownName").value.trim(),
    godownId: $("#setupGodownId").value.trim(),
    location: $("#setupLocation").value.trim(),
    product: $("#setupProduct").value,
    deviceId: getProfile()?.deviceId || ""
  };

  if (
    !profile.name ||
    !profile.userId ||
    !profile.godownName ||
    !profile.godownId ||
    !profile.location ||
    !profile.product
  ) {
    showToast("Complete all profile and godown details.");
    return;
  }

  saveProfile(profile);

  $("#setupModal").classList.add("hidden");

  updateProfileUI(user);
  renderSensors();

  showToast("Profile and godown saved.");
});


/* ---------------------------------------------
   DEVICE PAIRING
--------------------------------------------- */

$("#pairDeviceBtn")?.addEventListener("click", () => {
  const user = firebase.auth().currentUser;

  if (!user) {
    showToast("Login first.");
    return;
  }

  const profile = getProfile();

  if (!profile) {
    showToast("Complete godown setup first.");
    openSetup();
    return;
  }

  const deviceId =
    $("#deviceIdInput").value.trim();

  if (!deviceId) {
    showToast("Enter a device or Arduino ID.");
    return;
  }

  profile.deviceId = deviceId;

  saveProfile(profile);

  updateProfileUI(user);

  $("#deviceIdInput").value = "";

  showToast(
    `Device ${deviceId} paired successfully.`
  );
});


/* ---------------------------------------------
   LOGOUT
--------------------------------------------- */

$("#logoutBtn")?.addEventListener("click", async () => {
  try {
    await firebase.auth().signOut();

    $("#userProfileMenu").classList.add("hidden");

    /* UI RESET */
    updateProfileUI(null);

    showToast("Logged out successfully.");

    navigate("dashboard");

  } catch (error) {
    console.error(error);
    showToast("Logout failed.");
  }
});


firebase.auth().onAuthStateChanged(user => {
  $("#userProfileMenu")?.classList.add("hidden");

  updateProfileUI(user);
});


/* ---------------------------------------------
   SENSOR UI
--------------------------------------------- */

function renderSensors() {
  const profile = getProfile();

  const paired =
    Boolean(profile?.deviceId);

  const data = [
    [
      "Temperature",
      `${sensorData.temperature.toFixed(1)}°C`,
      "Optimal",
      "🌡"
    ],
    [
      "Humidity",
      `${Math.round(sensorData.humidity)}%`,
      "Monitoring",
      "💧"
    ],
    [
      "Gas Level",
      `${sensorData.gas.toFixed(2)} ppm`,
      "Monitoring",
      "◉"
    ],
    [
      "Airflow",
      `${sensorData.airflow.toFixed(1)} m/s`,
      "Normal",
      "≋"
    ],
    [
      "Battery",
      `${Math.round(sensorData.battery)}%`,
      "Solar Ready",
      "☀"
    ],
    [
      "Device",
      paired ? "Paired" : "Demo",
      paired ? profile.deviceId : "Not connected",
      "▣"
    ]
  ];

  const sensorCards = $("#sensorCards");

  if (!sensorCards) return;

  sensorCards.innerHTML = data.map(item => `
    <div class="metric-card">
      <div style="font-size:22px;margin-bottom:7px">${item[3]}</div>
      <small>${item[0]}</small>
      <strong>${item[1]}</strong>
      <span>${item[2]}</span>
    </div>
  `).join("");
}


/* ---------------------------------------------
   DASHBOARD SENSOR VALUES
--------------------------------------------- */

function updateDashboardSensors() {
  $("#tempVal").textContent =
    `${sensorData.temperature.toFixed(1)}°C`;

  $("#humidVal").textContent =
    `${Math.round(sensorData.humidity)}%`;

  $("#gasVal").textContent =
    `${sensorData.gas.toFixed(2)} ppm`;

  $("#airflowVal").textContent =
    `${sensorData.airflow.toFixed(1)} m/s`;

  $("#batteryValue").textContent =
    `${Math.round(sensorData.battery)}%`;

  $("#tempStatus").textContent =
    sensorData.temperature > 28
      ? "Watch temperature"
      : "Optimal";

  $("#humidStatus").textContent =
    sensorData.humidity > 75
      ? "Humidity watch"
      : "Optimal";

  $("#gasStatus").textContent =
    sensorData.gas > 1
      ? "Gas warning"
      : "Normal";

  $("#airflowStatus").textContent =
    sensorData.airflow < 1
      ? "Low airflow"
      : "Normal";
}


/* ---------------------------------------------
   ALERTS
--------------------------------------------- */

function renderAlerts() {
  const recent = $("#recentAlerts");
  const all = $("#allAlerts");

  const buildAlert = alert => `
    <div class="alert-row">
      <div class="alert-icon">
        ${
          alert.level === "good"
            ? "✓"
            : alert.level === "info"
            ? "i"
            : "!"
        }
      </div>

      <div style="flex:1">
        <b>${alert.title}</b>
        <small>${alert.desc} • ${alert.time}</small>
      </div>
    </div>
  `;

  if (recent) {
    recent.innerHTML =
      alerts.slice(0, 4)
        .map(buildAlert)
        .join("");
  }

  if (all) {
    all.innerHTML =
      alerts.map(buildAlert).join("");
  }

  const warningCount =
    alerts.filter(item =>
      item.level === "warning"
    ).length;

  if ($("#alertBadge")) {
    $("#alertBadge").textContent =
      warningCount;
  }
}


/* ---------------------------------------------
   BATCHES
--------------------------------------------- */

function renderBatches(filter = "") {
  const table = $("#batchTable");

  if (!table) return;

  const query = filter.toLowerCase();

  const rows =
    batches.filter(row =>
      row.join(" ")
        .toLowerCase()
        .includes(query)
    );

  table.innerHTML = rows.map(row => `
    <tr>
      <td><b>${row[0]}</b></td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td>${row[3]}</td>
      <td>${row[4]}</td>
      <td>${row[5]}</td>
      <td>
        <span class="status ${
          row[6] === "Healthy"
            ? "good"
            : "watch"
        }">
          ${row[6]}
        </span>
      </td>
    </tr>
  `).join("");
}

$("#batchSearch")?.addEventListener("input", event => {
  renderBatches(event.target.value);
});

$("#newBatch")?.addEventListener("click", () => {
  const profile = getProfile();

  if (!profile) {
    showToast("Configure your godown first.");
    return;
  }

  const batchNumber =
    `PS-${Date.now().toString().slice(-6)}`;

  batches.unshift([
    batchNumber,
    profile.product,
    "1.0 t",
    new Date().toLocaleDateString(),
    `${sensorData.temperature.toFixed(1)}°C`,
    `${Math.round(sensorData.humidity)}%`,
    "Healthy"
  ]);

  renderBatches();

  showToast("Demo batch added.");
});


/* ---------------------------------------------
   CONTROL TEST
--------------------------------------------- */

$("#ventBtn")?.addEventListener("click", () => {
  const button = $("#ventBtn");

  if (button.disabled) return;

  button.disabled = true;
  button.textContent = "Ventilation Running";

  $("#ventState").textContent = "Running";

  showToast("Demo ventilation cycle started.");

  setTimeout(() => {
    button.disabled = false;
    button.textContent = "Test Ventilation";

    $("#ventState").textContent = "Standby";

    showToast("Demo ventilation cycle completed.");
  }, 5000);
});


/* ---------------------------------------------
   SETTINGS
--------------------------------------------- */

$("#saveSettings")?.addEventListener("click", () => {
  const settings = {
    temp: $("#tempThreshold").value,
    humidity: $("#humidityThreshold").value,
    autoVentilation:
      $("#autoVentilation").checked
  };

  localStorage.setItem(
    "predictstor_settings",
    JSON.stringify(settings)
  );

  showToast("Settings saved.");
});


/* ---------------------------------------------
   DOWNLOAD / EXPORT PLACEHOLDERS
--------------------------------------------- */

$("#downloadBtn")?.addEventListener("click", () => {
  showToast("Report export will be connected later.");
});

$("#csvBtn")?.addEventListener("click", () => {
  showToast("CSV export will be connected later.");
});


/* ---------------------------------------------
   LIVE DEMO SENSOR SIMULATION
--------------------------------------------- */

function simulateSensors() {
  sensorData.temperature =
    24 + Math.random() * 3;

  sensorData.humidity =
    66 + Math.random() * 8;

  sensorData.gas =
    0.7 + Math.random() * 0.4;

  sensorData.airflow =
    1.4 + Math.random() * 0.9;

  sensorData.battery =
    Math.max(
      50,
      Math.min(
        100,
        sensorData.battery +
        (Math.random() * 2 - 1)
      )
    );

  updateDashboardSensors();
  renderSensors();

  const profile = getProfile();

  if (profile) {
    updateOptimizationUI();
  }
}


/* ---------------------------------------------
   INITIALIZE
--------------------------------------------- */

renderAlerts();
renderBatches();
renderSensors();
drawEnv();
drawSensorChart();
updateDashboardSensors();
updateOptimizationUI();

window.addEventListener("resize", () => {
  drawEnv();

  if ($("#sensors").classList.contains("active-page")) {
    drawSensorChart();
  }

  if ($("#prediction").classList.contains("active-page")) {
    drawRiskChart();
  }

  if ($("#reports").classList.contains("active-page")) {
    drawReportChart();
  }
});

setInterval(simulateSensors, 5000);
