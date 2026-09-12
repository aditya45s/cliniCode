import 'dotenv/config'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import helmet from 'helmet'
import { z } from 'zod'

const app = express()
const port = Number(process.env.API_PORT ?? 4000)
app.use(helmet())
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '2mb' }))

const users = {
  patient: { id: 'pat_001', role: 'PATIENT', name: 'Ananya Sharma', abhaId: '91-4821-6630-1198' },
  doctor: { id: 'doc_001', role: 'DOCTOR', name: 'Dr. Rohan Mehta', department: 'General Medicine' },
}
const cases = new Map<string, Record<string, unknown>>([
  ['CK-2026-0091', { id: 'CK-2026-0091', patientId: users.patient.id, status: 'READY_FOR_CONSULTATION', complaint: 'Stomach discomfort & nausea', department: 'Gastroenterology', riskLevel: 'LOW' }],
])
const documents = new Map<string, Record<string, unknown>>([
  ['doc_001', { id: 'doc_001', caseId: 'CK-2026-0091', type: 'LAB_REPORT', status: 'REVIEW_REQUIRED', fileName: 'Blood test report.pdf', extractedData: { results: [{ name: 'Hemoglobin', value: 12.5, unit: 'g/dL', referenceRange: '12-16 g/dL' }] } }],
])

const authSchema = z.object({ identifier: z.string().min(1), password: z.string().optional() })
const caseSchema = z.object({ complaint: z.string().min(3).max(4000), patientId: z.string().optional() })
const reviewSchema = z.object({ action: z.enum(['VERIFY', 'REJECT', 'EDIT']), structuredData: z.record(z.unknown()).optional() })

function tokenFor(user: Record<string, unknown>) { return Buffer.from(JSON.stringify({ sub: user.id, role: user.role })).toString('base64url') }
function requireRole(role: 'PATIENT' | 'DOCTOR') { return (request: Request, response: Response, next: () => void) => { const header = request.header('authorization'); if (!header) return response.status(401).json({ error: 'Authentication required' }); try { const user = JSON.parse(Buffer.from(header.replace('Bearer ', ''), 'base64url').toString()) as { role: string }; if (user.role !== role) return response.status(403).json({ error: 'Insufficient permissions' }); next() } catch { return response.status(401).json({ error: 'Invalid access token' }) } } }
function riskForComplaint(complaint: string) { if (/chest pain|difficulty breathing|fainted|unconscious|stroke/i.test(complaint)) return 'EMERGENCY'; if (/severe pain|persistent vomiting|high fever|blood in/i.test(complaint)) return 'POTENTIALLY_URGENT'; if (/pain|vomit|dizzy/i.test(complaint)) return 'MODERATE'; return 'LOW' }

app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'carekare-api' }))
app.post('/auth/patient/login', (request, response) => { const result = authSchema.safeParse(request.body); if (!result.success) return response.status(400).json({ error: 'Enter a valid ABHA ID or identity identifier' }); response.json({ accessToken: tokenFor(users.patient), refreshToken: 'demo-refresh-patient', user: users.patient, mock: true }) })
app.post('/auth/doctor/login', (request, response) => { const result = authSchema.safeParse(request.body); if (!result.success) return response.status(400).json({ error: 'Enter a valid doctor ID and password' }); response.json({ accessToken: tokenFor(users.doctor), refreshToken: 'demo-refresh-doctor', user: users.doctor, mock: true }) })
app.post('/auth/refresh', (_request, response) => response.json({ accessToken: tokenFor(users.patient), mock: true }))
app.post('/auth/logout', (_request, response) => response.status(204).send())

app.get('/patients/me', requireRole('PATIENT'), (_request, response) => response.json(users.patient))
app.get('/patients/me/cases', requireRole('PATIENT'), (_request, response) => response.json([...cases.values()]))
app.get('/patients/me/documents', requireRole('PATIENT'), (_request, response) => response.json([...documents.values()]))
app.get('/patients/me/history', requireRole('PATIENT'), (_request, response) => response.json({ abhaId: users.patient.abhaId, timeline: [...cases.values(), ...documents.values()] }))

app.post('/cases', requireRole('PATIENT'), (request, response) => { const result = caseSchema.safeParse(request.body); if (!result.success) return response.status(400).json({ error: 'Complaint must be at least 3 characters' }); const id = `CK-${new Date().getFullYear()}-${String(cases.size + 92).padStart(4, '0')}`; const riskLevel = riskForComplaint(result.data.complaint); const item = { id, patientId: users.patient.id, abhaId: users.patient.abhaId, status: 'IN_PROGRESS', complaint: result.data.complaint, riskLevel, department: /stomach|nausea|abdomen/i.test(result.data.complaint) ? 'Gastroenterology' : 'General Medicine', createdAt: new Date().toISOString() }; cases.set(id, item); response.status(201).json(item) })
app.get('/cases/:id', (request, response) => { const item = cases.get(request.params.id); return item ? response.json(item) : response.status(404).json({ error: 'Case not found' }) })
app.post('/cases/:id/risk-assessment', (request, response) => { const item = cases.get(request.params.id); if (!item) return response.status(404).json({ error: 'Case not found' }); const riskLevel = riskForComplaint(String(item.complaint)); response.json({ riskLevel, emergency: riskLevel === 'EMERGENCY', acknowledged: Boolean(request.body?.acknowledged) }) })
app.post('/cases/:id/summary', (request, response) => { const item = cases.get(request.params.id); if (!item) return response.status(404).json({ error: 'Case not found' }); const summary = { mainComplaint: item.complaint, recommendedDepartment: item.department, safetyLevel: item.riskLevel, confidence: 0.92, disclaimer: 'AI organizes information; a clinician provides diagnosis and treatment.' }; cases.set(request.params.id, { ...item, summary, status: 'READY_FOR_CONSULTATION' }); response.json(summary) })

app.get('/doctor/dashboard', requireRole('DOCTOR'), (_request, response) => response.json({ activeCases: 8, reportsForReview: 3, completedConsultations: 24, recentCases: [...cases.values()] }))
app.get('/doctor/cases', requireRole('DOCTOR'), (_request, response) => response.json([...cases.values()]))
app.get('/doctor/cases/:id', requireRole('DOCTOR'), (request, response) => { const id = String(request.params.id); const item = cases.get(id); return item ? response.json(item) : response.status(404).json({ error: 'Case not found' }) })
app.post('/doctor/consultations', requireRole('DOCTOR'), (request, response) => response.status(201).json({ id: 'consult_001', ...request.body, status: 'DRAFT', createdAt: new Date().toISOString() }))
app.put('/doctor/consultations/:id', requireRole('DOCTOR'), (request, response) => response.json({ id: request.params.id, ...request.body, updatedAt: new Date().toISOString() }))
app.post('/doctor/documents/:id/review', requireRole('DOCTOR'), (request, response) => { const result = reviewSchema.safeParse(request.body); if (!result.success) return response.status(400).json({ error: 'Invalid review action' }); const id = String(request.params.id); const document = documents.get(id); if (!document) return response.status(404).json({ error: 'Document not found' }); const updated = { ...document, reviewAction: result.data.action, reviewStatus: result.data.action === 'VERIFY' ? 'VERIFIED' : result.data.action === 'REJECT' ? 'REJECTED' : 'REVIEW_REQUIRED', structuredData: result.data.structuredData ?? document.extractedData, reviewedAt: new Date().toISOString(), reviewerId: users.doctor.id }; documents.set(id, updated); response.json(updated) })

app.use((_request, response) => response.status(404).json({ error: 'Route not found' }))
app.use((error: Error, _request: Request, response: Response, _next: unknown) => { console.error(error); response.status(500).json({ error: 'Unexpected server error' }) })

if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`CareKare API listening on http://localhost:${port}`))
export default app
