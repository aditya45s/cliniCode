# CareKare

CareKare is a full-stack healthcare workflow demo for AI-assisted case organization, deterministic safety routing, document extraction, clinician review, and ABHA-linked longitudinal records.

> **Important:** This repository runs in mock/demo mode. CareKare AI organizes patient-provided information; it does not diagnose or replace a clinician. The demo is not for emergencies and is not a claim of regulatory compliance.

## Architecture

- `apps/web`: React + TypeScript + Vite client with patient and doctor workspaces.
- `apps/api`: Express + TypeScript REST API with signed JWT access tokens, hashed refresh-token records, Zod validation, role/ownership middleware, case/risk/document/consultation/care-action routes.
- `apps/ai-service`: FastAPI provider-independent mock service for structured symptom understanding and deterministic safety risk assessment.
- `prisma`: PostgreSQL schema and demo seed data for ABHA-linked patients, cases, documents, consultations, history, reviews, and audit-ready entities.

## Run locally

Prerequisites: Node.js 20+, npm, and Docker Desktop for PostgreSQL. Python 3.12+ is needed only to run the AI service outside Docker.

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

`db:migrate` is the normal PostgreSQL path. `npm run db:push` is available for a disposable local database when migration history is not present; it should not be used as the production deployment workflow.

Run the AI service separately when needed:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r apps/ai-service/requirements.txt
uvicorn apps.ai-service.app.main:app --reload --port 8000
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/health`.

## Demo access

- Patient: choose **Patient login**, then **Use demo account**.
- Doctor: choose **Doctor login**, then **Use demo account**.
- Seed patient: Ananya Sharma, ABHA `91-4821-6630-1198`.
- Seed doctor: Dr. Rohan Mehta, `doctor@carekare.demo`.
- Second doctor: Dr. Kavya Nair, `kavya@carekare.demo`.
- Demo password when non-mock authentication is enabled: `CareKareDemo2026!`.

## Safety behavior

The mock AI extracts signals, but risk is decided by deterministic rules in both the API and AI service. Chest pain, difficulty breathing, fainting, unconsciousness, and stroke signals produce `EMERGENCY` and stop ordinary routing. Severe pain, persistent vomiting, high fever, or blood signals produce `POTENTIALLY_URGENT`. Non-critical patients can continue with warnings and may change department.

## Documents

The document UI demonstrates the pipeline: original upload -> mock classification/OCR -> structured extraction -> pending doctor review -> verification. The Prisma model preserves file metadata, raw text, structured JSON, confidence, review action, versions, and source evidence. Local storage is represented by a storage path; an S3 adapter and real OCR/Vision provider are production configuration work.

## Care actions

Appointments reserve a future scheduled slot. Queues create a current waiting token and position. Registrations create a hospital visit registration without booking a time. These are separate PostgreSQL records and demo workflows; no real hospital scheduling or registration system is connected.

## Verification

```powershell
npm run build:web
npm run build:api
npm test
npm run db:migrate -- --create-only --name verify
```

## Configuration required for production

Replace mock identity verification with approved ABHA/Aadhaar integrations, configure `DATABASE_URL`, JWT secrets, cloud storage, OCR/Vision credentials, AI provider credentials, secure CORS, rate limiting, encryption, privacy governance, and a formal clinical/security review. The backend already supports password hashing and refresh-token persistence; seeded demo credentials are for development only. Do not expose them in a deployed environment.
