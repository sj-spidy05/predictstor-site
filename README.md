# BhoomiNOVA

**BhoomiNOVA** is a field-first **AI Smart Farming Assistant** prepared for **SIH 2026 problem statement SIH26180**, in the **Qualcomm Inc. · Hardware · Disaster Management** context. It helps a farmer move from farmer profile and field setup to crop selection, sensor observations, camera observations, crop intelligence, risk assessment, recommended action, alerts, recovery, harvest readiness, history, and traceability.

The repository remains a lightweight static website that is compatible with GitHub Pages root deployment. It intentionally does not require a bundler, backend server, or new dependency. The current implementation is a credible prototype: its rule-based crop intelligence and simulated sensor values are clearly labelled, while future AI, hardware, notification, and assisted-registration boundaries remain explicit.

## Current implementation

The app provides Google Sign-In as the primary Firebase Auth entry point, with an explicitly labelled local demo workspace for presentations and offline development. After authentication, the farmer can create a farmer profile, farm, field, location, crop, growth-stage context, and cultivation details. The searchable crop catalog is extendable through the `CROPS` and `CROP_RULES` structures in `script.js`; it excludes Maize, Paddy, and Rice as required by the project brief.

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
