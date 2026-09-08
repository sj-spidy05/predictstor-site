# BhoomiNOVA

**BhoomiNOVA — Intelligence for Every Field** is a field-first smart-farming interface for SIH 2026 problem statement **SIH26180**, in the Qualcomm Inc. hardware and disaster-management context.

The core product model is:

> **SENSE → SEE → SCOUT → ANALYSE → ADVISE → ACT → VERIFY → RECOVER → LEARN**

BhoomiNOVA combines farmer-owned field context, crop rules, observations, sensor adapters, offline-first decision support, explainable recommendations, and farmer-controlled actions. The website is a static GitHub Pages application and does not claim hardware, AI, weather, messaging, satellite, or government integrations that are not connected.

## Product status

The public flow is **BhoomiNOVA intro → Who are you? → Farmer or Consumer → role-specific authentication**. The former internal Demo Workspace and Demo Login have been removed from the user-facing product.

Farmer and Consumer workspaces are separate. Farmer access is private and UID-scoped; Consumer access is limited to farmer-approved public information. Firebase authentication is not required for the public landing page, so an unavailable Firebase/network service does not create a blank page or startup spinner.

After successful Firebase authentication, the user must create or verify an exactly six-digit security password. The password is stored as a salted SHA-256 hash under the authenticated Firebase UID; plaintext passwords are not stored in browser storage or Firestore. Google authentication and phone-number SMS OTP are supported through Firebase Auth when the provider configuration is available.

## Implemented

| Area | Current state |
| --- | --- |
| Branding and entry | Official BhoomiNOVA logo, cinematic intro, timeout-safe activation, responsive Farmer/Consumer role selection. |
| Authentication | Firebase Google popup/redirect flow, phone-number OTP path, role-specific login copy, auth error recovery, logout/session clearing. |
| Security password | Six-digit setup and verification gate after authentication; salted hash stored against the Firebase UID. |
| Farmer workspace | Dashboard, profile, crop catalog, rule-based assessment, alerts, history, recovery/harvest, sensors, map/digital-twin structure, adaptive monitoring, Smart Farming, offline network, procurement, reports, settings, and help. |
| Consumer workspace | Separate shell with approved-public discovery, farmer UID search, products/harvest entry points, favorites, requests, notifications, profile, settings, and help. Private farmer modules are not rendered in the Consumer shell. |
| Offline behavior | Local workspace state, pending-sync state, local decision-engine architecture, and reconnect/sync boundaries. Hardware operation is not controlled by the browser. |
| Language architecture | Centralized English/Tamil/Hindi translation dictionary, persistent language selection, role-portal selector, and Settings selector. The architecture is extensible for full copy coverage. |
| Truthful no-data states | Missing telemetry renders as **Not connected**, **Awaiting sensor data**, or **Analysis pending** rather than invented measurements or scores. |

## Integration-ready boundaries

The code contains provider-independent boundaries for a Personal AI Core, a BhoomiNOVA skill, crop knowledge/rules, tools, user preferences, and memory. The current browser application does not call an LLM, fabricate expert responses, or expose private Farmer memory to Consumers.

The following are designed for future integration without claiming current availability:

- ESP32/ESP-12E, ESP-NOW, LoRa, gateway, and sensor telemetry adapters.
- Open-Meteo weather context with last-known/offline handling.
- Camera/image pipeline, model adapter, confidence, explanation, and expert-review workflow.
- Sarvam-compatible voice provider abstraction with speech-to-text and text-to-speech fallback states.
- MSG91-compatible SMS/OTP and critical-notification adapter.
- MapLibre/MapCN-compatible map provider and attribution layer.
- Public farm/product feed, farmer-approved content, consumer favorites, and connection requests.
- Firebase Firestore owner rules and server-side validation.

Unavailable services must display a truthful state such as **Service not connected**, **To be verified**, **Awaiting sync**, or **Analysis pending**.

## Explicit waitlist

The following are intentionally architecture/UI only:

1. Actual drone hardware control or autonomous flight.
2. Actual pump/relay hardware actuation.
3. Production crop-diagnosis AI and expert response generation.
4. Satellite NDVI and advanced satellite analytics.

The UI may prepare a mission, action approval, image upload, or adapter contract, but it must not claim that a drone is connected, a pump is running, a diagnosis is confirmed, or satellite stress values are available.

## Security and privacy

Firebase client configuration is limited to the registered web-app configuration. Admin credentials and provider secrets are not stored in the repository. Firebase UID is the ownership boundary for authenticated data; Firestore Security Rules must enforce owner-only access in the deployed Firebase project. Public Farmer UIDs are discovery identifiers only and are never security permissions.

Logout clears the browser session, role state, pending OAuth role, and active private workspace view. Switching roles returns to the public role portal. Consumer rendering does not include private Farmer boundaries, sensors, irrigation, family information, drone controls, private analytics, or private AI records.

## Local run

```bash
cd predictstor-site
python3 -m http.server 4173
```

Open <http://localhost:4173>.

The repository can be deployed from the `main` branch through GitHub Pages. No server-side routing is required for the static entry application.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Intro, role portal, authenticated login/OTP/password modals, Farmer shell, Consumer shell mount, modules, and forms. |
| `script.js` | Firebase initialization, auth routing, password gate, role separation, local persistence, routing, crop rules, no-data states, language architecture, and integration boundaries. |
| `style.css` | BhoomiNOVA visual system, responsive layout, mobile navigation, overlays, cards, forms, statuses, and modal behavior. |
| `assets/bhoominova-official-logo.png` | Official BhoomiNOVA logo supplied for the entry experience. |

## Development principles

BhoomiNOVA follows the rule:

> **AI recommends. Safety rules validate. Farmer decides.**

No data is presented as live unless an actual integration confirms it. No diagnosis is presented as certain. No browser action directly powers a pump. No notification is described as delivered without a provider confirmation.

## Research boundary

The crop-rule scaffold is intended for interface and explainability work. It must be validated against local ICAR, state agricultural university, extension, and field evidence before production agronomic decisions. The current application does not browse live agricultural sources, call live weather services, diagnose disease, predict yield, deliver SMS/WhatsApp/voice messages, or connect to government systems.

## Verification checklist

Before deployment, verify:

- Firebase Google and Phone providers and authorized domains.
- Firebase Firestore owner-only Security Rules.
- Six-digit password Firestore access and reset/recovery policy.
- Mobile and desktop OAuth behavior.
- Open-Meteo, map, AI, voice, SMS, sensor, gateway, and hardware providers.
- Empty-state, offline, reconnect, logout, refresh, role-switching, and failed-provider behavior.
- Full translation coverage for all Farmer and Consumer dynamic copy.

The repository is a truthful SIH-ready prototype, not a claim that every external integration is already connected.

**Repository:** <https://github.com/sj-spidy05/predictstor-site>
**Deployment target:** GitHub Pages from `main`

[FAO crop water requirements]: https://www.fao.org/4/x0490e/x0490e00.htm
[TNAU crop production guides]: https://agritech.tnau.ac.in/pdf/AGRICULTURE.pdf
[TNAU agrometeorology guidance]: https://agritech.tnau.ac.in/agriculture/agri_agrometeorology_microclimate.html
[USDA integrated pest management]: https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/office-pest-management-policy-opmp/integrated-pest-management

## References

The crop-rule scaffolding is informed by the structure of agricultural guidance from [FAO crop water requirements], [TNAU crop production guides], [TNAU agrometeorology guidance], and [USDA integrated pest management].
