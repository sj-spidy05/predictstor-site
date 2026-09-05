# BhoomiNOVA

**BhoomiNOVA — Next-generation Optimized Vision for Agriculture** is a low-cost, field-deployable, offline-first smart farming assistant for Indian farmers. This repository contains the static web prototype prepared for **SIH 2026, problem statement SIH26180**, in the Qualcomm Inc hardware and disaster-management context.

The application is deliberately honest about the boundary between the working prototype and future integrations. Local demo values are visibly labelled as **Demo data**, **Simulated**, or **Integration ready**. The prototype does not claim live sensor readings, disease diagnosis, weather data, hardware connectivity, market prices, or government linkage.

## What is implemented

The application is a lightweight static single-page workspace with a farmer-first responsive layout. It includes farmer access through the existing browser-safe Firebase phone-auth boundary plus a local demo workspace, farmer-scoped profile and field setup, dashboard status cards, live sensor preparation, crop-specific reference guidance, camera observation capture, alerts and action resolution, event history, traceability, settings, local persistence, offline-ready status messaging, and a mobile slide-out navigation where Settings remains visible.

The local workspace persists in browser `localStorage`. A demo login seeds a clearly marked demonstration profile and simulated alert state. Firebase profile loading and saving are attempted only for a verified Firebase user; if the browser cannot reach Firebase, the local workspace remains available without pretending it is synchronized.

## Run locally

The project intentionally keeps the existing static-site architecture and does not require a bundler or dependency installation.

```bash
cd predictstor-site
python3 -m http.server 4173
```

Then open <http://localhost:4173> in a browser. For a production static server, serve the repository root as the document directory.

## GitHub Pages deployment

1. Push the repository to GitHub.
2. In the repository settings, open **Pages**.
3. Select **Deploy from a branch**, choose the required branch, and select the repository root.
4. Save and wait for GitHub Pages to publish `index.html`.

Because the application is a static single-page document, it does not require server-side routing. The existing Firebase configuration contains only browser-safe client configuration. Never add Firebase service-account keys, admin credentials, OAuth secrets, device tokens, or private API keys to this repository.

## Architecture

The static application is intentionally organized into three files:

| File | Responsibility |
| --- | --- |
| `index.html` | Semantic app shell, navigation, pages, forms, dialogs, status labels, and accessible controls. |
| `style.css` | BhoomiNOVA visual system, responsive grid layout, slide-out mobile navigation, form states, cards, timelines, and reduced-motion support. |
| `script.js` | Client-side routing, local workspace state, demo data, browser persistence, Firebase Auth/Firestore boundary, charts, forms, alerts, history, and traceability updates. |

The conceptual data model is designed for future Firestore collections or a mobile application:

`users`, `profiles`, `fields`, `crops`, `pairings`, `observations`, `sensorTelemetry`, `cameraObservations`, `alerts`, `actions`, `events`, and `traceability`.

Each workspace is keyed to the active demo session or Firebase user ID. The Firebase path uses `farmers/{uid}` for the farmer profile. Firestore rules must be configured separately and must enforce authenticated owner access; this client does not enable unsafe public access.

## ESP-12E integration boundary

The ESP-12E is represented only as a **field sensor/telemetry node**. It is not described as a computer-vision device. The Live sensor network page provides the future pairing UI for a field, device ID, gateway state, and last-message state. Pairing currently registers a device ID locally and explicitly keeps the hardware disconnected until a verified gateway message is received.

A future telemetry adapter can map verified messages into a shared shape such as:

```text
{
  farmerId,
  fieldId,
  deviceId,
  observedAt,
  temperature,
  humidity,
  gas,
  co2,
  airflow,
  battery,
  connectionState,
  source: "esp-12e"
}
```

The UI is designed so live telemetry can replace the demo adapter without redesigning the page. The communication protocol, gateway, calibration, sensor selection, and alert thresholds still require hardware validation.

## Camera and crop analysis boundary

Camera observations can be recorded with a selected field, crop, optional image, and farmer notes. The prototype stores the observation metadata locally and shows the exact state **Image analysis integration ready — diagnosis is not available in this demo.** Computer vision must run on a separate smartphone, camera-capable edge device, or gateway; it is not attributed to the ESP-12E.

A future analysis service can consume the observation record and return a verified result through a backend boundary. The current app does not fabricate disease predictions or accuracy claims.

## Demo versus integration-ready behavior

| Area | Current state |
| --- | --- |
| Farmer setup, profile, navigation, settings, alerts, actions, history, traceability | Implemented locally in the browser. |
| Demo workspace | Implemented and visibly labelled. It seeds demo profile, alerts, and simulated observations. |
| Firebase phone authentication | Preserved as a browser-safe integration boundary; requires a configured Firebase Auth environment and valid phone verification. |
| Firebase profile sync | Implemented as an authenticated `farmers/{uid}` read/write attempt; failure falls back to local state with a visible message. |
| ESP-12E, Arduino-compatible sensors, gateways | Pairing UI and data boundary are integration-ready; no physical connection is claimed. |
| Camera image analysis | Observation workflow is implemented; diagnosis is not available in this demo. |
| Weather, market, government, LoRa, Wi-Fi, GSM, real hardware | Not connected and not claimed. |

## Mobile and offline behavior

The sidebar becomes a slide-out navigation on small screens. It remains scrollable through the full account section, including **Settings** and **Help & about**. The mobile layout uses touch-sized controls, single-column cards, full-width forms, responsive charts, and a modal layout that stays within the viewport. Local browser state keeps the demo useful without connectivity, while the UI explicitly says that local data is not synchronized to Firebase while offline.

## Verification checklist

The final local pass covered the following items:

- The application renders at the repository root with the BhoomiNOVA brand.
- Main navigation includes Dashboard, Live sensors, Crop intelligence, Alerts & actions, Event history, Traceability, Settings, and Help & about.
- Phone-auth entry and the demo workspace entry are both visible.
- Demo login renders a farmer profile, field, crop, location, and open alerts.
- Settings shows profile, mobile number, Farmer ID, farm/field, location, local controls, data boundary, reset demo data, and Logout.
- Logout clears the active session and the private farmer view without requiring a manual refresh.
- Alert resolution creates an event history record.
- Camera observation submission creates a local observation and explicitly avoids diagnosis.
- ESP-12E pairing saves a local device registration without claiming a live connection.
- Traceability exposes the field-to-storage and future-linkage timeline.
- Browser console was checked after load, demo login, and Settings navigation; no runtime errors were emitted.
- A 390px-wide mobile screenshot confirmed the dashboard content fits the viewport without horizontal overflow.
- A repository search found no disallowed legacy product references.

## Known limitations

Firebase phone verification depends on the Firebase project configuration, authorized domains, billing/quotas, and a real phone verification flow. The demo workspace is the reliable presentation path when Firebase Auth is not available. Real telemetry, calibration, storage rules, crop-specific research validation, gateway communications, image analysis, weather services, market integration, and government services must be implemented and verified separately before being presented as live functionality.
