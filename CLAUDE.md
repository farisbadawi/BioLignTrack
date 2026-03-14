# BioLignTrack - CLAUDE.md

## What Is This?

BioLignTrack is a React Native/Expo orthodontic treatment tracking app with two user roles: **patients** and **doctors**. It's a companion app to the BioLign3D PMS (Practice Management System). Patients track aligner wear time, manage trays, view appointments, and message their doctor. Doctors manage patients, send invites, and communicate via real-time chat.

## Tech Stack

- **Framework:** React Native 0.81.5, Expo SDK 54, Expo Router 6 (file-based routing)
- **Language:** TypeScript 5.9 (strict mode)
- **State:** Zustand 5 (`stores/patient-store.ts`, `stores/chat-store.ts`)
- **Styling:** NativeWind 4 (Tailwind for RN) + inline styles with theme context
- **Auth:** Auth0 (OIDC/PKCE flow via `expo-auth-session`, tokens in `expo-secure-store`)
- **Real-time:** Socket.io client 4.8 for messaging
- **Data fetching:** React Query 5 + direct fetch calls in Zustand actions
- **Icons:** Lucide React Native
- **Notifications:** Expo Notifications (local scheduling + push token support)
- **Backend:** Shared Node.js/Express/Prisma/SQL Server at `https://aligner4d-backend.azurewebsites.net`

## Related Repositories

- **Aligner4D-V2** (`/Users/farisbadawi/Desktop/Aligner4D-V2`) — PMS frontend (React 19/Vite/Ant Design/BabylonJS)
- **Aligner4D-V2-Backend** (`/Users/farisbadawi/Desktop/Aligner4D-V2-Backend`) — Shared backend for both apps
  - Two-DB architecture: Common DB (users, patients, corporates) + Tenant DBs (per clinic)
  - Auth0 JWT authentication, multi-tenant via corporateId/clientCode

## Commands

```bash
npm start          # expo start --tunnel --clear
npm run dev        # expo start --tunnel
npm run lan        # expo start --lan
npm run ios        # expo start --ios --tunnel
npm run android    # expo start --android --tunnel
npm run web        # expo start --web
```

No test suite currently exists.

## Project Structure

```
app/                          # Expo Router file-based routing
├── _layout.tsx               # Root layout (Auth0 + QueryClient + theme + notifications)
├── auth.tsx                  # Auth0 login + post-login registration
├── role-selection.tsx        # Patient vs Doctor role picker
├── onboarding.tsx            # Patient treatment setup
├── doctor-onboarding.tsx     # Doctor practice setup
├── book-appointment.tsx      # Appointment booking (modal)
├── view-bookings.tsx         # Calendly bookings viewer
├── edit-practice.tsx         # Practice info editor
├── (patient)/                # Patient tab group
│   ├── _layout.tsx           # 6-tab layout
│   ├── index.tsx             # Dashboard (wear tracker, stats, weekly chart)
│   ├── tray.tsx              # Tray management
│   ├── appointments.tsx      # View/book appointments (PMS-linked only)
│   ├── messages.tsx          # Conversation list
│   ├── progress.tsx          # Compliance charts & insights
│   └── profile.tsx           # Settings, doctor linking, notifications
├── (doctor)/                 # Doctor tab group
│   ├── _layout.tsx           # 6-tab layout
│   ├── index.tsx             # Dashboard (patient stats)
│   ├── patients.tsx          # Patient list with compliance status
│   ├── invite.tsx            # Invitation code generation
│   ├── messages.tsx          # Conversation list
│   ├── appointments.tsx      # Appointment management
│   └── profile.tsx           # Practice settings
├── chat/[id].tsx             # Chat conversation screen (Socket.io)
└── patient/[id].tsx          # Patient detail (doctor view)

stores/
├── patient-store.ts          # Main app state (~1180 lines) — auth, patient data, wear tracking, tray mgmt, doctor relationships, appointments, settings
└── chat-store.ts             # Messaging state (~430 lines) — Socket.io, conversations, messages, typing, read receipts

lib/
├── api.ts                    # Typed API client (3 namespaces: linked, standalone patient, standalone doctor)
├── auth0.ts                  # Auth0 config (domain, clientId, PKCE helpers)
└── socket.ts                 # Socket.io connection manager

contexts/
├── Auth0Context.tsx          # Auth state provider (token storage/refresh)
├── ThemeContext.tsx           # Light/dark/system theme provider
└── NotificationContext.tsx   # Push notification scheduling

services/
└── notifications.ts          # Local notification service (wear reminders, tray changes, messages)

hooks/
├── useSessionTimeout.ts      # 15-min HIPAA inactivity timeout
└── useNotifications.ts       # Notification context accessor

components/
├── Button.tsx                # Themed button (primary/secondary/outline)
├── Card.tsx                  # Container with shadow
├── CodeInput.tsx             # 6-box character input for doctor codes
├── CustomAlert.tsx           # Modal alert (success/error/warning/info)
├── LogHoursModal.tsx         # Bottom sheet for manual wear logging
├── ProgressRing.tsx          # SVG circular progress
├── DentalArchIcon.tsx        # Teeth visualization
└── TeethIcon.tsx             # Tooth icon

constants/
└── colors.ts                 # Theme colors, spacing, border radius
```

## Three User Types

The app has three user types determined by the `whoami` endpoint:

1. **`linked`** — Patient linked to a PMS clinic. Has full features (appointments, payments). Uses `/api/v1/patient/*` endpoints.
2. **`standalone_patient`** — Patient not connected to a PMS. Uses `/api/v1/patient/standalone/*` endpoints. Can link to a standalone doctor via code.
3. **`standalone_doctor`** — Doctor without PMS. Uses `/api/v1/doctor/standalone/*` endpoints. Manages patients via invite codes.

## API Endpoints

### Whoami
- `GET /api/v1/patient/whoami` → `{ type, patient?, corporate?, standalonePatient?, standaloneDoctor? }`

### Linked Patient (`/api/v1/patient/`)
- `POST /link` — Link with invite code
- `GET /me` — Profile + treatment + recentWearLogs
- `GET /appointments` — Upcoming/past appointments
- `GET /appointments/available-slots` — Bookable slots
- `POST /appointments/book` — Book appointment
- `DELETE /appointments/{id}` — Cancel appointment
- `GET /payments` — Payment summary + list
- `POST /wear-session/start` | `POST /wear-session/stop` — Wear tracking
- `POST /tray/change` — Record tray change
- `GET /wear-logs?startDate=&endDate=` — Query wear history
- `POST /wear-log` — Manual wear entry

### Standalone Patient (`/api/v1/patient/standalone/`)
- `POST /register` — Create account
- `GET /me` — Profile (includes activeSession, assignedDoctor)
- `PUT /profile` — Update profile
- `POST /join-doctor` — Link to doctor by code
- `GET /doctor` — Get assigned doctor
- `POST /wear-session/start` | `POST /wear-session/stop` — Wear tracking
- `POST /tray/change` — Tray change
- `GET /wear-logs?days=90` — Wear history
- `POST /wear-log` — Manual entry
- `GET /tray-changes` — Tray change history

### Standalone Doctor (`/api/v1/doctor/standalone/`)
- `POST /register` — Create account
- `GET /me` — Profile + doctorCode + patients + pendingInvitations
- `PUT /profile` — Update profile
- `GET /patients` — Patient list with weeklyCompliance
- `GET /patients/{id}` — Full patient detail + wearLogs + trayChanges
- `POST /invite` — Create patient invitation

### Messaging (both patient & doctor)
- `GET /messages/conversations` — List conversations
- `GET /messages/conversations/{id}?limit=50&before={messageId}` — Paginated messages
- `POST /messages/conversations` — Create conversation (doctor only, body: `{ patientId }`)
- `GET /messages/unread-count` — Total unread
- `PATCH /messages/conversations/{id}/read` — Mark as read

### Socket.io Events
- **Emit:** `send_message`, `typing_start`, `typing_stop`, `mark_read`, `join_conversation`
- **Listen:** `new_message`, `new_message_notification`, `typing`, `read_receipt`, `unread_count`

## Key Patterns

- **Store access:** Actions use `get()` to read current state inside Zustand actions
- **API responses:** Always `{ data?: T, error?: { message, code } }`
- **Date handling:** Dates normalized to `YYYY-MM-DD` strings, parsed as local time (not UTC) to avoid off-by-one errors
- **Compliance calc:** A day "counts" if wear >= 50% of daily target
- **Optimistic updates:** Chat messages render immediately with `tempId`, replaced on server ack
- **Token flow:** Access token in module-level var + SecureStore, auto-refresh before API calls
- **Theme colors:** Primary teal `#60e4e4`, success `#36c7c7`, warning `#f6c35c`, error `#e06767`

## Auth Flow

1. User picks role (patient/doctor) on role-selection screen
2. Auth0 PKCE login via browser
3. Backend `whoami` check — if registered, load data; if new, register
4. Patient: optional doctor code entry → tries PMS link first, falls back to standalone doctor join
5. Doctor: practice info form → register as standalone doctor
6. Route to appropriate tab group

## Current Work & Roadmap

### Active: Messaging
- Real-time chat between patients and doctors (standalone + PMS)
- Socket.io integration with optimistic message rendering
- Typing indicators, read receipts, unread counts
- Conversation list with last message preview

### Planned: Payments
- Payment integration for patients (endpoint exists: `GET /api/v1/patient/payments`)
- UI not yet built

### Planned: Support Tickets
- Patients will be able to create tickets in the PMS from this app
- No code exists yet — will need new backend endpoints and UI screens

## Environment

- `.env` contains `EXPO_PUBLIC_API_BASE_URL`
- `.env` is gitignored — use `.env.example` as template
- Auth0 config is in `lib/auth0.ts` (domain, clientId, audience)
- Dev backend: `http://localhost:3000` (commented out in auth0.ts)
- Prod backend: `https://aligner4d-backend.azurewebsites.net`

## Security Notes

- No hardcoded credentials (previously fixed)
- Doctor codes use `crypto.getRandomValues()` (not `Math.random()`)
- Invitation expiry is validated
- Mutations are scoped to authenticated user (doctor_id/patient_id)
- Min password length: 8 characters
- HIPAA session timeout: 15 min inactivity with 2-min warning
