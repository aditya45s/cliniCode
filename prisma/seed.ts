import { PrismaClient, Role, CaseStatus, RiskLevel, DocumentStatus } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const patientUser = await prisma.user.upsert({ where: { email: 'ananya@carekare.demo' }, update: {}, create: { email: 'ananya@carekare.demo', role: Role.PATIENT } })
  const doctorUser = await prisma.user.upsert({ where: { email: 'doctor@carekare.demo' }, update: {}, create: { email: 'doctor@carekare.demo', role: Role.DOCTOR } })
  const patient = await prisma.patient.upsert({ where: { userId: patientUser.id }, update: {}, create: { userId: patientUser.id, name: 'Ananya Sharma', abhaId: '91-4821-6630-1198' } })
  const doctor = await prisma.doctor.upsert({ where: { userId: doctorUser.id }, update: {}, create: { userId: doctorUser.id, name: 'Dr. Rohan Mehta', specialty: 'General Medicine', department: 'General Medicine' } })
  const gastro = await prisma.department.create({ data: { name: 'Gastroenterology' } })
  const sampleCase = await prisma.case.upsert({ where: { id: 'CK-2026-0091' }, update: {}, create: { id: 'CK-2026-0091', patientId: patient.id, departmentId: gastro.id, status: CaseStatus.READY_FOR_CONSULTATION, complaint: 'Stomach discomfort & nausea', riskLevel: RiskLevel.LOW, aiFindings: { symptoms: ['stomach pain', 'nausea'], duration: '3 days', confidence: 0.92 } } })
  await prisma.document.create({ data: { patientId: patient.id, caseId: sampleCase.id, type: 'LAB_REPORT', fileName: 'Blood test report.pdf', storagePath: 'demo/blood-test-report.pdf', mimeType: 'application/pdf', fileSize: 128000, fileHash: 'demo-hash', processingStatus: DocumentStatus.REVIEW_REQUIRED, classification: 'Lab Report', classificationConfidence: 0.94, rawText: 'Hemoglobin 12.5 g/dL', extractedData: { results: [{ testName: 'Hemoglobin', value: '12.5', unit: 'g/dL', referenceRange: '12-16 g/dL' }] }, extractionConfidence: 0.94 } }).catch(() => undefined)
  console.log(`Seeded ${patient.name} and ${doctor.name}`)
}
main().finally(() => prisma.$disconnect())
