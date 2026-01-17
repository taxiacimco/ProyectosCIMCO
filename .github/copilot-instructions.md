# 🤖 Copilot Instructions for TaxiA-CIMCO

## Project Overview
TaxiA-CIMCO is a monorepo for a Firebase-based platform with:
- **Backend** (`functions/`): Firebase Functions in TypeScript, integrated with Firestore and Firebase Hosting.
- **Frontend** (`frontend/`): React (Vite) app, PWA-ready, with custom scripts and Tailwind CSS.
- **Scripts & Tools**: PowerShell scripts automate setup, build, and deployment.

## Key Workflows
- **Start Backend (local emulators):**
  - Run: `iniciar-backend.ps1` (root) or `npm run serve` in `functions/`
- **Start Frontend (dev):**
  - Run: `iniciar-frontend.ps1` (root) or `npm run dev` in `frontend/`
  - Tailwind watcher is auto-started by the script
- **Build Frontend:**
  - `npm run build` in `frontend/` (see also `move-and-build.ps1` for asset prep)
- **Clean Project:**
  - `limpiar-proyecto.ps1` (root) cleans temp files and reinstalls dependencies
- **Deploy:**
  - Use `deploy-firebase.ps1` or `npm run deploy` in `functions/` for backend+hosting

## Conventions & Patterns
- **Backend:**
  - Source: `functions/src/`, entry: `functions/src/functions/index.ts`
  - Build output: `functions/lib/` (never edit by hand)
  - Use TypeScript, follow Firebase Functions structure
- **Frontend:**
  - Source: `frontend/src/`, public assets: `frontend/public/`
  - PWA manifests and service workers in `frontend/public/`
  - Tailwind config: `frontend/tailwind.config.js`, CSS entry: `public/css/style.css`
  - Use Vite for dev/build, React for UI
- **Scripts:**
  - PowerShell scripts in root and `frontend/` automate common tasks (see file headers for usage)
  - Many scripts expect to be run from the repo root

## Integration Points
- **Firebase:**
  - Config in `firebase.json`, `firestore.rules`, `firestore.indexes.json`
  - Service account keys are ignored by git; use `.env` or `serviceAccountKey.json` locally
- **Cross-component:**
  - Frontend and backend communicate via Firebase (Firestore, Functions)
  - Shared config/scripts may move files between `frontend/` and `public/`

## Examples
- To start full local dev: run `iniciar-todo.ps1` (starts both frontend and backend)
- To update Firebase config: use `verificar-firebase-config*.ps1` scripts

## Tips for AI Agents
- Prefer PowerShell scripts for setup/build over raw npm commands
- Never edit files in `lib/`, `dist/`, or `build/` directly
- Check for `.env.example` files for required environment variables
- When in doubt, check script headers for usage notes

---
For more details, see `functions/README-backend.md` and `frontend/README.md`.
