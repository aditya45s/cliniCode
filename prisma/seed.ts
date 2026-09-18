import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from '../apps/backend/src/db.js'
import { Appointment, Case, Consultation, Department, Document, Doctor, Hospital, Patient, Queue, Registration, User } from '../apps/backend/src/models.js'

const passwordHash = bcrypt.hashSync('CareKareDemo2026!', 10)

async function main() {
  await connectDatabase()
  await Promise.all([User.deleteMany({}), Patient.deleteMany({}), Doctor.deleteMany({}), Hospital.deleteMany({}), Department.deleteMany({}), Case.deleteMany({}), Document.deleteMany({}), Consultation.deleteMany({}), Appointment.deleteMany({}), Queue.deleteMany({}), Registration.deleteMany({})])

  const [city, sunrise] = await Hospital.create([{ name: 'City Care Hospital' }, { name: 'Sunrise Medical Centre' }])
  const [general, gastro, cardiology, diagnostics] = await Department.create([
    { name: 'General Medicine', hospitalId: String(city._id) },
    { name: 'Gastroenterology', hospitalId: String(city._id) },
    { name: 'Cardiology', hospitalId: String(city._id) },
    { name: 'Diagnostics', hospitalId: String(sunrise._id) },
  ])
  const patientSeeds = [
    { email: 'ananya@carekare.demo', name: 'Ananya Sharma', abhaId: '91-4821-6630-1198' },
    { email: 'ravi@carekare.demo', name: 'Ravi Kumar', abhaId: '91-4821-6630-2209' },
    { email: 'meera@carekare.demo', name: 'Meera Iyer', abhaId: '91-4821-6630-3310' },
  ]
  const patients = []
  for (const seed of patientSeeds) {
    const user: any = await User.create({ email: seed.email, passwordHash, role: 'PATIENT' })
    patients.push(await Patient.create({ userId: String(user._id), name: seed.name, abhaId: seed.abhaId }))
  }
  const doctorSeeds = [
    { email: 'doctor@carekare.demo', name: 'Dr. Rohan Mehta', specialty: 'General Medicine', department: 'General Medicine' },
    { email: 'kavya@carekare.demo', name: 'Dr. Kavya Nair', specialty: 'Gastroenterology', department: 'Gastroenterology' },
  ]
  const doctors = []
  for (const seed of doctorSeeds) {
    const user: any = await User.create({ email: seed.email, passwordHash, role: 'DOCTOR' })
    doctors.push(await Doctor.create({ userId: String(user._id), name: seed.name, specialty: seed.specialty, department: seed.department }))
  }
  const sampleCases: any[] = [
    { _id: 'CK-2026-0091', patientId: String(patients[0]._id), departmentId: String(gastro._id), status: 'READY_FOR_CONSULTATION', complaint: 'Stomach discomfort and nausea for three days', riskLevel: 'LOW' },
    { _id: 'CK-2026-0074', patientId: String(patients[0]._id), departmentId: String(general._id), status: 'CONSULTATION_COMPLETED', complaint: 'Seasonal cough since Monday', riskLevel: 'LOW' },
    { _id: 'CK-2026-0112', patientId: String(patients[1]._id), departmentId: String(general._id), status: 'DRAFT', complaint: 'Persistent headache', riskLevel: 'MODERATE' },
    { _id: 'CK-2026-0108', patientId: String(patients[2]._id), departmentId: String(cardiology._id), status: 'IN_PROGRESS', complaint: 'Severe chest discomfort', riskLevel: 'POTENTIALLY_URGENT' },
  ]
  await Case.insertMany(sampleCases.map(item => ({ ...item, aiFindings: { symptoms: item.complaint.split(' ').slice(0, 4), recommendedDepartment: item.departmentId === String(gastro._id) ? 'Gastroenterology' : 'General Medicine', confidence: 0.92 }, riskAssessments: [{ level: item.riskLevel, action: 'ROUTINE_CARE' }] })))
  await Document.create({ patientId: String(patients[0]._id), caseId: 'CK-2026-0091', type: 'LAB_REPORT', fileName: 'Blood test report.pdf', storagePath: 'demo/blood-test-report.pdf', mimeType: 'application/pdf', fileSize: 128000, fileHash: 'demo-lab-hash', processingStatus: 'REVIEW_REQUIRED', classification: 'Lab Report', extractedData: { results: [{ testName: 'Hemoglobin', value: '12.5', unit: 'g/dL', referenceRange: '12-16 g/dL' }] }, extractionConfidence: 0.94 })
  await Document.create({ patientId: String(patients[0]._id), caseId: 'CK-2026-0091', type: 'PRESCRIPTION', fileName: 'Previous prescription.pdf', storagePath: 'demo/previous-prescription.pdf', mimeType: 'application/pdf', fileSize: 89000, fileHash: 'demo-prescription-hash', processingStatus: 'VERIFIED', classification: 'Prescription', extractedData: { diagnosis: 'GERD', medicines: [{ medicineName: 'Pantoprazole', dose: '40 mg', frequency: 'Once daily', duration: '14 days' }] }, extractionConfidence: 0.96 })
  await Consultation.create({ caseId: 'CK-2026-0074', patientId: String(patients[0]._id), doctorId: String(doctors[0]._id), clinicalAssessment: 'Symptoms consistent with a self-limited seasonal cough.', clinicalNotes: 'Demo completed consultation.', diagnoses: [{ name: 'Seasonal cough', confirmed: true }], prescriptions: [{ items: [{ medicineName: 'Supportive care', duration: '5 days' }] }], treatmentPlan: 'Continue supportive care and return if symptoms worsen.', status: 'COMPLETED', completedAt: new Date() })
  await Appointment.create({ patientId: String(patients[0]._id), caseId: 'CK-2026-0091', doctorId: String(doctors[1]._id), hospitalId: String(city._id), departmentId: String(gastro._id), scheduledAt: new Date(Date.now() + 86400000), status: 'BOOKED' })
  await Queue.create({ patientId: String(patients[1]._id), caseId: 'CK-2026-0112', hospitalId: String(city._id), departmentId: String(general._id), token: 'A23', position: 5, status: 'WAITING' })
  await Registration.create({ patientId: String(patients[2]._id), caseId: 'CK-2026-0108', hospitalId: String(sunrise._id), departmentId: String(diagnostics._id), registrationNumber: 'REG-26090101', status: 'CREATED' })
  console.log(`Seeded ${patients.length} patients, ${doctors.length} doctors, and MongoDB demo records.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => disconnectDatabase())
