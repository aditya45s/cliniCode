# CareKare

CareKare is a full-stack healthcare workflow demo for AI-assisted case organization, doctor-led consultation, document extraction, clinical review, and ABHA-linked longitudinal records.

> Demo only: CareKare organizes patient-provided information and does not diagnose, replace a clinician, or support emergencies.

## Architecture

- `apps/frontend`: React + TypeScript + Vite CareKare interface.
- `apps/backend`: Express + TypeScript REST API with JWT access/refresh sessions, Zod validation, role and ownership checks, Mongoose persistence, local original-document storage, mock OCR/Vision extraction, consultation, audit, and record-version workflows.
- MongoDB collections are defined in `apps/backend/src/models.ts`: users, patients, doctors, hospitals, departments, cases, documents, consultations, appointments, queues, registrations, audit logs, record versions, and refresh tokens.
- `apps/ai-service`: Optional provider-independent FastAPI mock service for future AI integrations.

The frontend communicates only with REST APIs. It never connects directly to MongoDB.

## Local setup

Prerequisites: Node.js 20+, npm, a locally installed MongoDB service listening on `127.0.0.1:27017`, and Python 3.12+ only if you run the optional AI service.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:seed
npm.cmd run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/health`.

To run the API or web app separately:

```powershell
npm.cmd run dev:backend
npm.cmd run dev:frontend
```

The workspace keeps the frontend and backend under `apps/frontend` and `apps/backend`:

```powershell
Push-Location apps/backend
npm.cmd install
npm.cmd run dev
Pop-Location

Push-Location apps/frontend
npm.cmd install
npm.cmd run dev
Pop-Location
```

MongoDB must be installed and started as a normal local service on `127.0.0.1:27017`.

## Demo access

- Patient: choose **Patient login**, then **Use demo account**.
- Doctor: choose **Doctor login**, then **Use demo account**.
- Patient: Ananya Sharma, demo ABHA `91-4821-6630-1198`.
- Doctor: `doctor@carekare.demo`.
- Demo password when `MOCK_AUTH=false`: `CareKareDemo2026!`.

All identity values and medical records are fake demo data.

## Functional workflow

The existing UI is connected to persisted API state for patient login, cases, AI-assisted responses and risk assessment, department routing, appointments, queues, registrations, health history, document upload, original-file retrieval, mock extraction, doctor consultation, review/verification, audit logging, and record versions. Original uploaded files remain in configured storage while extracted data is stored separately with provenance metadata.

AI/OCR providers are intentionally abstracted by configuration. `MOCK_AI=true` and `MOCK_VISION=true` keep the local demo runnable without external credentials. AI output is assistive; doctors retain clinical decision-making authority.

## Environment

Copy `.env.example` to `.env` and configure:

- Required for the local demo: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `API_PORT`, `WEB_ORIGIN`, and `VITE_API_URL` when overriding the frontend default.
- Optional integrations: `AI_SERVICE_URL`, `AI_API_KEY`, `VISION_API_KEY`, object-storage settings, and approved Aadhaar/ABHA or hospital integration credentials.
- `STORAGE_PROVIDER=local` stores originals under `STORAGE_LOCAL_PATH`; use an object-storage adapter for deployment.

Never expose secrets through frontend environment variables or commit real credentials.

## Commands

```powershell
npm.cmd run db:seed       # reset and seed MongoDB demo records
npm.cmd run build         # build frontend and backend
npm.cmd test              # API safety tests
```

MongoDB may also be provided by a managed deployment; set `MONGODB_URI` accordingly. Local development uses `mongodb://127.0.0.1:27017/carekare`.

## Production hardening

Replace mock identity verification with approved integrations; configure secure JWT secrets, rate limiting, encryption, object storage, OCR/Vision and AI providers, restrictive CORS, privacy governance, retention controls, and formal clinical/security review. Demo credentials and mock extraction are not production controls.
