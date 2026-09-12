import bcrypt from 'bcryptjs'
import { PrismaClient, Role, CaseStatus, RiskLevel, DocumentStatus } from '@prisma/client'

const prisma = new PrismaClient()
const passwordHash = bcrypt.hashSync('CareKareDemo2026!', 10)

async function department(name: string, hospitalId: string) {
  const existing = await prisma.department.findFirst({ where: { name, hospitalId } })
  return existing ?? prisma.department.create({ data: { name, hospitalId } })
}

async function main() {
  const [city, sunrise] = await Promise.all([
    prisma.hospital.upsert({ where: { id: 'hospital-city-care' }, update: {}, create: { id: 'hospital-city-care', name: 'City Care Hospital' } }),
    prisma.hospital.upsert({ where: { id: 'hospital-sunrise' }, update: {}, create: { id: 'hospital-sunrise', name: 'Sunrise Medical Centre' } }),
  ])
  const [general, gastro, cardiology, diagnostics] = await Promise.all([
    department('General Medicine', city.id),
    department('Gastroenterology', city.id),
    department('Cardiology', city.id),
    department('Diagnostics', sunrise.id),
  ])

  const patientSeeds = [
    { id: 'patient-ananya', email: 'ananya@carekare.demo', name: 'Ananya Sharma', abhaId: '91-4821-6630-1198' },
    { id: 'patient-ravi', email: 'ravi@carekare.demo', name: 'Ravi Kumar', abhaId: '91-4821-6630-2209' },
    { id: 'patient-meera', email: 'meera@carekare.demo', name: 'Meera Iyer', abhaId: '91-4821-6630-3310' },
  ]
  const patients = []
  for (const seed of patientSeeds) {
    const user = await prisma.user.upsert({ where: { email: seed.email }, update: { passwordHash, role: Role.PATIENT }, create: { id: `user-${seed.id}`, email: seed.email, passwordHash, role: Role.PATIENT } })
    patients.push(await prisma.patient.upsert({ where: { userId: user.id }, update: { name: seed.name, abhaId: seed.abhaId }, create: { id: seed.id, userId: user.id, name: seed.name, abhaId: seed.abhaId } }))
  }
  const doctorSeeds = [
    { id: 'doctor-rohan', email: 'doctor@carekare.demo', name: 'Dr. Rohan Mehta', specialty: 'General Medicine', department: 'General Medicine' },
    { id: 'doctor-kavya', email: 'kavya@carekare.demo', name: 'Dr. Kavya Nair', specialty: 'Gastroenterology', department: 'Gastroenterology' },
  ]
  const doctors = []
  for (const seed of doctorSeeds) {
    const user = await prisma.user.upsert({ where: { email: seed.email }, update: { passwordHash, role: Role.DOCTOR }, create: { id: `user-${seed.id}`, email: seed.email, passwordHash, role: Role.DOCTOR } })
    doctors.push(await prisma.doctor.upsert({ where: { userId: user.id }, update: { name: seed.name, specialty: seed.specialty, department: seed.department }, create: { id: seed.id, userId: user.id, name: seed.name, specialty: seed.specialty, department: seed.department } }))
  }

  const sampleCases = [
    { id: 'CK-2026-0091', patientId: patients[0].id, departmentId: gastro.id, status: CaseStatus.READY_FOR_CONSULTATION, complaint: 'Stomach discomfort and nausea for three days', riskLevel: RiskLevel.LOW },
    { id: 'CK-2026-0074', patientId: patients[0].id, departmentId: general.id, status: CaseStatus.CONSULTATION_COMPLETED, complaint: 'Seasonal cough since Monday', riskLevel: RiskLevel.LOW },
    { id: 'CK-2026-0112', patientId: patients[1].id, departmentId: general.id, status: CaseStatus.DRAFT, complaint: 'Persistent headache', riskLevel: RiskLevel.MODERATE },
    { id: 'CK-2026-0108', patientId: patients[2].id, departmentId: cardiology.id, status: CaseStatus.IN_PROGRESS, complaint: 'Severe chest discomfort', riskLevel: RiskLevel.POTENTIALLY_URGENT },
    { id: 'CK-2026-0061', patientId: patients[2].id, departmentId: general.id, status: CaseStatus.CONSULTATION_COMPLETED, complaint: 'Blood pressure follow-up', riskLevel: RiskLevel.LOW },
  ]
  for (const item of sampleCases) {
    await prisma.case.upsert({ where: { id: item.id }, update: item, create: { ...item, aiFindings: { symptoms: item.complaint.split(' ').slice(0, 4), clinicalContext: item.departmentId === gastro.id ? 'Gastrointestinal' : 'General Medicine', recommendedDepartment: item.departmentId === gastro.id ? 'Gastroenterology' : 'General Medicine', confidence: 0.92 } } })
    const existingRisk = await prisma.riskAssessment.findFirst({ where: { caseId: item.id, level: item.riskLevel } })
    if (!existingRisk) await prisma.riskAssessment.create({ data: { caseId: item.id, level: item.riskLevel, action: item.riskLevel === RiskLevel.POTENTIALLY_URGENT ? 'PROMPT_CLINICAL_ATTENTION' : 'ROUTINE_CARE' } })
  }

  const labCase = await prisma.case.findUniqueOrThrow({ where: { id: 'CK-2026-0091' } })
  const existingDocument = await prisma.document.findFirst({ where: { fileName: 'Blood test report.pdf', patientId: patients[0].id } })
  if (!existingDocument) await prisma.document.create({ data: { patientId: patients[0].id, caseId: labCase.id, type: 'LAB_REPORT', fileName: 'Blood test report.pdf', storagePath: 'demo/blood-test-report.pdf', mimeType: 'application/pdf', fileSize: 128000, fileHash: 'demo-lab-hash', processingStatus: DocumentStatus.REVIEW_REQUIRED, classification: 'Lab Report', classificationConfidence: 0.94, rawText: 'Hemoglobin 12.5 g/dL', extractedData: { results: [{ testName: 'Hemoglobin', value: '12.5', unit: 'g/dL', referenceRange: '12-16 g/dL' }] }, extractionConfidence: 0.94 } })
  const verifiedDoc = await prisma.document.findFirst({ where: { fileName: 'Previous prescription.pdf', patientId: patients[0].id } })
  if (!verifiedDoc) await prisma.document.create({ data: { patientId: patients[0].id, caseId: labCase.id, type: 'PRESCRIPTION', fileName: 'Previous prescription.pdf', storagePath: 'demo/previous-prescription.pdf', mimeType: 'application/pdf', fileSize: 89000, fileHash: 'demo-prescription-hash', processingStatus: DocumentStatus.VERIFIED, classification: 'Prescription', extractedData: { diagnosis: 'GERD', medicines: [{ medicineName: 'Pantoprazole', dose: '40 mg', frequency: 'Once daily', duration: '14 days' }] }, extractionConfidence: 0.96 } })

  const completedCase = await prisma.case.findUniqueOrThrow({ where: { id: 'CK-2026-0074' } })
  const existingConsultation = await prisma.consultation.findFirst({ where: { caseId: completedCase.id } })
  if (!existingConsultation) await prisma.consultation.create({ data: { caseId: completedCase.id, patientId: patients[0].id, doctorId: doctors[0].id, clinicalAssessment: 'Symptoms consistent with a self-limited seasonal cough.', status: 'COMPLETED', completedAt: new Date(), diagnoses: { create: { name: 'Seasonal cough', confirmed: true } }, clinicalNotes: { create: { content: 'Demo completed consultation.', authorId: doctors[0].id } }, prescriptions: { create: { items: { create: { medicineName: 'Supportive care', duration: '5 days', instructions: 'Hydration and rest' } } } }, treatmentPlan: { create: { content: 'Continue supportive care and return if symptoms worsen.' } } } })

  await prisma.appointment.upsert({ where: { id: 'appointment-demo-1' }, update: {}, create: { id: 'appointment-demo-1', patientId: patients[0].id, caseId: labCase.id, doctorId: doctors[1].id, hospitalId: city.id, departmentId: gastro.id, scheduledAt: new Date(Date.now() + 86400000), status: 'BOOKED' } })
  await prisma.queue.upsert({ where: { id: 'queue-demo-1' }, update: {}, create: { id: 'queue-demo-1', patientId: patients[1].id, caseId: 'CK-2026-0112', hospitalId: city.id, departmentId: general.id, token: 'A23', position: 5, status: 'WAITING' } })
  await prisma.registration.upsert({ where: { id: 'registration-demo-1' }, update: {}, create: { id: 'registration-demo-1', patientId: patients[2].id, caseId: 'CK-2026-0061', hospitalId: sunrise.id, departmentId: diagnostics.id, registrationNumber: 'REG-26090101', status: 'CREATED' } })
  console.log(`Seeded ${patients.length} patients, ${doctors.length} doctors, ${city.name}, and ${sunrise.name}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
