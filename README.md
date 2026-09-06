# BhoomiNOVA

**BhoomiNOVA** is a field-first **AI Smart Farming Assistant** prepared for **SIH 2026 problem statement SIH26180**, in the **Qualcomm Inc. · Hardware · Disaster Management** context. It helps a farmer move from farmer profile and field setup to crop selection, sensor observations, camera observations, crop intelligence, risk assessment, recommended action, alerts, recovery, harvest readiness, history, and traceability.

The repository remains a lightweight static website that is compatible with GitHub Pages root deployment. It intentionally does not require a bundler, backend server, or new dependency. The current implementation is a credible prototype: its rule-based crop intelligence and simulated sensor values are clearly labelled, while future AI, hardware, notification, and assisted-registration boundaries remain explicit.

## Current implementation

The app provides Google Sign-In as the primary Firebase Auth entry point, with Firebase Auth as the public sign-in path; local/offline state remains available when disconnected. After authentication, the farmer can create a farmer profile, farm, field, location, crop, growth-stage context, and cultivation details. The searchable crop catalog is extendable through the `CROPS` and `CROP_RULES` structures in `script.js`; it excludes Maize, Paddy, and Rice as required by the project brief.

The dashboard surfaces farmer, farm, field, selected crop, crop-health indicator, disease risk, pest risk, nutrient stress, irrigation/water stress, heat stress, drought risk, flood/excess-moisture risk, sensor status, Edge AI status, recent alerts, Family Assist status, and a crop-specific Next Best Action. Risk items use Low, Moderate, High, or Critical severity and always expose a reason and recommended action. Illustrative values are never presented as live sensor data.

The ESP-12E is represented only as a **field sensor / telemetry node**. The interface can show temperature, humidity, soil moisture, light, battery/signal concepts, pairing state, and connection state when the hardware adapter is later connected. It does not claim that the ESP-12E performs computer vision or large-model inference. Camera observations are prepared from a field, crop, image, farmer note, and symptoms context for a smartphone, camera-capable edge device, Snapdragon-capable edge device, or future gateway. The current UI says **Vision AI Integration Ready** and does not fabricate diagnosis or accuracy.

## Family Assist and notification architecture

Family Assist lets a farmer record an authorized son, daughter, spouse, or trusted family member with name, relationship, phone number, and explicit farmer consent. The contact is stored under the authenticated farmer workspace and is not exposed across users. The notification model is channel-independent: Primary Farmer · In-app is available locally; Family Assist · WhatsApp is **Integration Ready** but no delivery is claimed; SMS and Voice / IVR are future channels. The prototype sends no SMS, WhatsApp, or voice message and includes no paid gateway dependency.

## Firebase and ownership boundary

Google Sign-In uses the existing browser-safe Firebase client configuration and `firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())`. Authenticated workspaces are keyed by the Firebase UID in browser storage. The client prepares owner-aware documents under `users/{uid}` and `farmers/{uid}` with an `ownerUid` field, preserving existing farmer documents while adding the new profile, Family Assist, and notification fields through merge writes. Production Firestore Security Rules must enforce authenticated owner access, for example `request.auth.uid == resource.data.ownerUid` or equivalent nested-UID rules. No open read/write rules are introduced by this static frontend.

The existing Firebase data is not deleted or migrated destructively. A previously authenticated Firebase session can still be recognized by Firebase Auth; the primary UI now prefers Google Sign-In as requested. A Google account restores its own UID-scoped farmer workspace when the corresponding Firebase profile exists.

## Future Government Assisted Access

The project reserves a clearly labelled **Future Government Assisted Access** concept. In a future deployment, an agriculture officer could help register a farmer who does not personally use a smartphone, but the officer would not become the farmer's identity. The conceptual sequence is officer-assisted registration → farmer consent → farmer profile → farm and field → crop → authorized family contact → notification preference. No government department or government API is connected in this prototype.

## Run locally

```bash
cd predictstor-site
python3 -m http.server 4173
```

Open <http://localhost:4173>. The repository root can be deployed directly through GitHub Pages from the `main` branch. No server-side routing is required.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Semantic app shell, farmer navigation, dashboard, sensors, crop intelligence, alerts, history, recovery trace, settings, Google Sign-In, Family Assist, and future-access UI. |
| `style.css` | BhoomiNOVA visual system, responsive layouts, mobile slide-out navigation, cards, forms, statuses, and accessible states. |
| `script.js` | Client routing, local workspace state, Google/Firebase auth boundary, owner-scoped persistence, crop rules, location-aware risk assessment, alerts, observations, Family Assist, notifications, history, and traceability. |

## Research-backed boundary and limitations

The crop rules are a transparent knowledge scaffold informed by the structure of agricultural guidance from [FAO crop water requirements][1], [TNAU crop production guides][2], [TNAU agrometeorology guidance][3], and [USDA integrated pest management principles][4]. Exact thresholds and actions must be validated with local ICAR, state agricultural university, and extension advice before production use. The prototype does not browse live sources, call a live weather API, diagnose disease, predict yield, claim live hardware connectivity, deliver WhatsApp/SMS/voice messages, or connect to government systems.

| Capability | Current state |
| --- | --- |
| Google Sign-In and logout | Firebase integration boundary implemented; Firebase Console must enable Google provider and authorized domains. |
| Farmer/farm/field/crop profile | Implemented locally and prepared for UID-scoped Firebase merge persistence. |
| Crop intelligence and risk assessment | Implemented as deterministic, crop-specific, location-aware rule scaffolding with explicit illustrative inputs. |
| ESP-12E telemetry | Field-node pairing and status boundary are integration-ready; no live device is claimed. |
| Camera / Edge AI | Observation preparation is implemented; vision analysis is not connected. |
| Family Assist | Consent-based contact record and channel preferences are implemented; no message delivery is claimed. |
| WhatsApp, SMS, Voice / IVR | Future backend/provider integrations only. |
| Government Assisted Access | Future conceptual module only; no government connection is claimed. |
| Firestore ownership enforcement | Client writes include `ownerUid`; production Security Rules must be configured and tested separately. |

[1]: https://www.fao.org/4/x0490e/x0490e00.htm "FAO Irrigation and drainage paper 56"
[2]: https://agritech.tnau.ac.in/pdf/AGRICULTURE.pdf "TNAU Crop Production Guide"
[3]: https://agritech.tnau.ac.in/agriculture/agri_agrometeorology_microclimate.html "TNAU Agrometeorology"
[4]: https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/office-pest-management-policy-opmp/integrated-pest-management "USDA Integrated Pest Management"

## Final offline-first architecture pass

BhoomiNOVA is the digital interface of a distributed, offline-first field system. Strategic sensors and a camera feed an ESP32/ESP-12E field transmitter over a local wireless link such as ESP-NOW or LoRa. The farmer's home gateway stores buffered data locally, displays values, drives buzzer/LED outputs, and runs the local decision engine even when the Internet is unavailable. When connectivity returns, buffered events can synchronize to Firebase/cloud services. This static interface labels all telemetry and integrations honestly as Demo, Simulation, Integration Ready, Planned, Local Mode, Pending Sync, or Sync Complete.

The intelligence model is layered: deterministic local rules handle immediate thresholds and hardware conditions; Edge AI is reserved for image-based crop assessment; Cloud AI is reserved for historical and multi-source analysis; and the farmer remains in control of higher-risk actions. The safety pattern is **AI recommends → safety rules validate → farmer approves where required → actuator performs a configured safe action**.

The new operating modules cover the private farm map and digital twin, adaptive small/medium/large deployment bands, low-power wake/sense/process/transmit/sleep behavior, smart irrigation decisions, optional drone mission planning, offline network and sync state, public 10-digit discovery UID, Farmer/Consumer privacy separation, official-data-dependent procurement, local reports, and backup/restore concepts. Public UID is never a security permission; Firebase UID and owner-only Firestore rules remain the data boundary. PredicStor remains a future post-harvest integration and BhoomiNOVA remains focused on field intelligence.

The visual architecture story is: **SENSE** ground sensors → **SEE** smartphone/camera → **SCOUT** optional drone → **ANALYSE** local rules + Edge AI + Cloud AI → **ACT** alerts, recommendations, safe actuator integration, and farmer decisions.


## Functional integration and demo system pass

The current main branch includes a connected browser prototype layer without changing the existing BhoomiNOVA visual identity. Every fresh page load runs the cinematic entry sequence with a timeout-safe state machine before role selection; switching between Farmer and Consumer returns to role selection without a blank screen. The Consumer workspace now stores a persistent local Buyer UID, viewed public profiles, favorites, follows-ready state, enquiries, request history, and notification-ready state. It searches only farmer-approved public UID data and does not expose private farm geometry, sensor values, irrigation, family, or analytics data.

The Farmer prototype includes a functional spatial boundary sequence (select → confirm → save), persisted farm/zone metadata, a field-condition simulator, local rule evaluation, critical dry-soil event creation, alert creation, dashboard refresh, and offline/online sync queue states. Simulated packets and actions are explicitly labelled DEMO/SIMULATED; no physical relay, pump, drone, AI diagnosis, SMS, WhatsApp, or voice delivery is claimed. The existing Firebase client boundary remains UID-scoped and is used only when Firebase Auth and Firestore are available; localStorage remains the offline demo buffer.

The field simulator is intentionally deterministic: changing soil moisture to a critical value creates a “Zone 2 — Critical Water Stress” event, records a recommendation to irrigate after farmer approval, increments pending sync state, and updates the dashboard. The official BhoomiNOVA logo is stored at `assets/bhoominova-official-logo.png` and is used by the entry experience. Remaining production dependencies are Firebase Console/provider configuration, Firestore Security Rules deployment, real sensor/gateway/LoRa hardware, a verified AI provider, weather data, notification providers, and drone hardware/services.


## Final continuation pass: refresh-safe workspace

The boot flow now restores the locally persisted demo session, Farmer/Consumer role, current Farmer route, workspace telemetry, pending sync count, farm map status, custom sensors, automation rules, event history, Consumer Buyer UID, favorites, and request history after an actual browser reload. The cinematic intro still runs on every fresh page load, then the restored demo workspace reopens without losing the route or data. Intentional Switch User remains distinct from refresh and returns immediately to role selection without deleting persistent records.

The Sensors page now supports locally persisted custom sensor configuration. The Offline Network page now supports locally persisted automation rules with configurable sensor, operator, value, action, and farmer-approval boundary. The dry-field simulator updates stored telemetry, creates a critical water-stress event/alert, increments the pending queue, and keeps the result explicitly marked as DEMO/SIMULATED. Firebase Google sign-in now explicitly requests LOCAL auth persistence when the SDK exposes that capability, and the UID-scoped sync payload is prepared to include the consumer profile.


## Prototype integration pass: Consumer views and Farm Map controls

The Consumer shell now opens real local views for Home, Discover Farmers, Products & Harvest, Favorites, Requests & History, Notifications, and Profile. Consumer Profile saves full name, store, phone, city, description, and a public-visibility choice locally alongside the generated Buyer UID. Products and procurement clearly show integration-ready or official-data-required states rather than fabricating listings or government status. Consumer rendering remains separate from the Farmer shell and does not expose private map, sensor, irrigation, family, AI, or analytics data.

The Farmer Farm Map now has a lightweight static-host-compatible interactive prototype layer: demo location search, zoom controls, reset, sensor-marker placement, and named-zone creation. These controls persist selected location, markers, and zones in the owner-scoped local workspace. The map remains explicitly labelled as a local demo; real basemap/satellite/GPS provider integration is not claimed.


## Authentication and production-flow hardening

The public entry flow now uses Firebase Authentication as its source of truth. The obsolete public demo-login path was removed. Google Sign-In uses explicit local persistence, a mobile redirect path where required, a desktop popup path, one auth-state listener, redirect-result handling, and actionable error messages for common Firebase Auth failures. Successful authentication closes stale login UI and routes directly to the persisted Farmer or Consumer workspace without requiring a refresh.

Farmer profile save is owner-scoped to the authenticated Firebase UID and requires confirmed Firebase sync for authenticated sessions before closing the profile form; local drafts remain available when the network is unavailable. Consumer profile edits use the same UID-scoped sync payload. Mobile fields no longer fall back to the account email and display `Not added` when no mobile number exists. Public UID, route, local workspace, Consumer profile, and offline state remain persisted separately from authentication state.

The GitHub Pages production build contains one Firebase client configuration and one initialization path. Firebase Console Google provider enablement, authorized domains, Firestore rules, and external provider availability remain deployment-level dependencies; this repository does not expose Admin credentials or alter Security Rules.
