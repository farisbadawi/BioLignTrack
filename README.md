# BioLignTrack

**BioLignTrack** is the companion app to BioLign3D, designed for orthodontic treatment tracking, patient–doctor communication, and real-time progress optimization.  
Built with [Expo](https://expo.dev/), [React Native](https://reactnative.dev/), and powered by [Bun](https://bun.sh/) for fast dependency management.

---

## Features
- 📈 **Wear-Time Tracking** – Record and visualize aligner wear hours.
- 💬 **Two-Way Communication** – Secure messaging between patient and orthodontist.
- 📅 **Appointment Management** – View upcoming visits with reminders.
- 📊 **Progress Insights** – Compliance graphs, tray-change history, and treatment milestones.
- 🔔 **Smart Notifications** – Nudges for low wear-time and upcoming events.

---

## Prerequisites
- **macOS**
- [VSCode](https://code.visualstudio.com/)
- [Bun](https://bun.sh/) installed
- [Node.js](https://nodejs.org/) installed
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (will be run via `npx`)

---

## Running in VSCode (macOS)

After opening the project in VSCode, run these commands in the integrated terminal:

```bash
# Set up Bun environment variables
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Confirm Bun is installed
bun --version

# Install dependencies
bun install

# Start the Expo development server
npx expo start
