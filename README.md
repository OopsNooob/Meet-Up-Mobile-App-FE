# MeetUp Mobile App 📍

> Real-time location-aware mobile client for spontaneous and scheduled group meetups, featuring fair ETA recommendation, AI venue explanations, in-app group chat, and privacy-first location sharing.

Part of the **SE405 — Pervasive and Mobile Computing** project, connecting to the [MeetUp Backend (`Meet-Up-Mobile-App-BE`)](../Meet-Up-Mobile-App-BE/README.md).

---

## 🛠 Tech Stack

- **Framework:** React Native 0.86 / [Expo](https://expo.dev/) (SDK 57) with React 19 Compiler
- **Routing & Navigation:** [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based, Type-safe routing)
- **State Management:** [Zustand v5](https://github.com/pmndrs/zustand)
- **Maps & Geolocation:** `react-native-maps` (Google Maps SDK for Android), `expo-location`
- **Real-time Networking:** Socket.IO Client v4, Axios
- **Internationalization (i18n):** `i18next` & `react-i18next` (Bilingual: English & Vietnamese)
- **UI & Theming:** Custom Design System with System / Manual Dark Mode support, Lucide Icons
- **Security & Storage:** `expo-secure-store` (AES-encrypted JWT storage)
- **Push Notifications:** `expo-notifications` (FCM v1 & Deep Linking)

---

## 📋 Prerequisites

- **Node.js:** v20.x or v22.x LTS
- **Package Manager:** `pnpm` (recommended) or `npm`
- **Android Development:**
  - Android Studio with Android SDK (API 34/35).
  - Android Emulator with **Google Play Services** enabled (required for Google Maps rendering).
  - `ANDROID_HOME` environment variable configured correctly in your system.

---

## ⚙️ Environment Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set up the following variables in your `.env` (this file is ignored by Git):
   ```env
   # Backend REST & WebSocket URL (10.0.2.2 is the Android Emulator localhost bridge)
   EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1

   # Toggle mock API mode for standalone frontend testing (true/false)
   EXPO_PUBLIC_USE_MOCK_API=true

   # Google Maps SDK for Android API Key
   GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
   ```

---

## 🗺 Google Maps SDK & Security Configuration

The app uses `react-native-maps` backed by the native **Google Maps SDK for Android**. To ensure zero secret leaks on Git repositories:

1. **Dynamic Resolution via `app.config.js`:**  
   The application injects the key at build time from `process.env.GOOGLE_MAPS_API_KEY` into `AndroidManifest.xml`. If the variable is absent, it falls back to a safe placeholder to prevent build failures without exposing production credentials.
2. **Google Cloud Key Restrictions:**  
   For local debugging or production, configure the API key in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with **Application Restrictions**:
   - **Application Type:** Android apps
   - **Package Name:** `com.anonymous.mobile`
   - **SHA-1 Fingerprint (Debug Keystore):** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - **API Restriction:** Restrict key to **Maps SDK for Android**.

---

## 🏛 Project Architecture & Structure

The codebase is organized into modular layers with clean separation of concerns:

```text
Meet Up Mobile App/
├── app/                        # Expo Router File-Based Routing
│   ├── (auth)/                 # Public Auth: Login, Register
│   ├── (app)/                  # Protected Application Flow
│   │   ├── (tabs)/             # Bottom Tabs: Map, Meetups, Friends, Profile
│   │   ├── meetup/             # Meetup creation, invitations, chat, vote, recommendations
│   │   ├── place/              # Place details and AI explanation modal
│   │   ├── settings/           # Location privacy & nearby friends toggles
│   │   ├── admin/              # User management & audit reports
│   │   └── dev/                # Developer debugging suite (notifications, performance)
│   ├── _layout.tsx             # Root layout: ThemeProvider, AuthGuard, Toast, i18n
├── components/                 # Reusable UI Primitives and Domain Components
│   ├── map/                    # FriendMarker, FriendInfoModal, MapControls
│   ├── meetup/                 # MeetupCard, MemberList, PlaceRecommendationCard
│   ├── chat/                   # ChatBubble, MessageInput
│   └── common/                 # Buttons, Modals, EmptyState, ThemedView, ThemedText
├── store/                      # Zustand Global State Slices (auth, meetup, location, chat)
├── services/                   # HTTP API Clients (Axios) & WebSocket Handlers
├── hooks/                      # Custom hooks: useTheme, useSocket, useLocationTracking
├── locales/                    # i18n translation bundles (en.json, vi.json)
├── theme/                      # Design tokens, color palettes (Light & Dark Mode)
├── app.config.js               # Dynamic Expo config for environment variables
└── app.json                    # Static Expo configuration metadata
```

---

## 🚀 Core Feature Modules

- **Real-time Friend Map (`(tabs)/index.tsx`):** Displays friends' live positions on Google Maps, freshness indicators (<5m, ~1km approx, stale >5m, offline), and centering controls.
- **Location Privacy Engine (`settings/location.tsx`):** Granular controls for location sharing mode (`always`, `meetup_only`, `off`), approximate radius jitter (~1km), auto-expiry timers, and friend blacklist.
- **Smart Recommendations (`meetup/[meetupId]/recommendations.tsx`):** Location engine computing fair transit distances (`Avg ETA` & `Max ETA`) with opening-hours filter and multi-member map view.
- **AI Venue Explanations (`place/[placeId]/explanation.tsx`):** Explains why a venue fits group activity preferences and transit trade-offs using aggregated group data.
- **In-Meetup Real-time Chat (`meetup/[meetupId]/chat.tsx`):** Dedicated chat channel for each meetup with optimistic delivery, read states, and quick venue sharing.
- **Voting System (`meetup/[meetupId]/vote.tsx`):** Group polling mechanism to democratically select the final meetup place.
- **Push Notifications & Deep Linking:** FCM integration routing directly to meetups, chat messages, and location requests.

---

## 🛠 Developer Debugging Suite (`/dev`)

The app includes built-in diagnostics screens for testing without full backend readiness:
- `/dev/notifications` — Trigger local and remote FCM push notification payloads and test deep link routing.
- `/dev/performance` — Live FPS meter, memory footprint, render timers, and WebSocket heartbeat inspector.
- `/dev/auth` — Switch between mock auth accounts and test session expiration / refresh token flows.
- `/dev/components` — Visual showcase of design system primitives in Light and Dark themes.

---

## 💻 CLI Commands

```bash
# Run on Android Emulator (compiles native code and launches app)
pnpm expo run:android

# Start Metro Bundler without re-compiling native code
pnpm expo start

# Type check TypeScript definitions across the project
npx tsc --noEmit

# Run ESLint validation
pnpm lint

# Clean and regenerate native Android directories (after native config changes)
pnpm expo prebuild --clean
pnpm expo run:android
```

---

## 🔗 Related Documentation

- [Backend Documentation (`Meet-Up-Mobile-App-BE`)](../Meet-Up-Mobile-App-BE/README.md)
- [Project Requirements & Architecture Specification (`docs/02_nghiep_vu_va_dac_ta.md`)](docs/02_nghiep_vu_va_dac_ta.md)
- [Frontend Assignment Matrix (`docs/MeetUp_Frontend_2_Assignment_for_Agent.md`)](docs/MeetUp_Frontend_2_Assignment_for_Agent.md)

---

## 📄 License

This is an internal project for academic and research purposes. All rights reserved.
