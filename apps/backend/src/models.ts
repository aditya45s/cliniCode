import mongoose, { Schema } from 'mongoose'

const json = { type: Schema.Types.Mixed }
const base = { timestamps: true, versionKey: false as const }

export const User = mongoose.models.User ?? mongoose.model('User', new Schema({ email: { type: String, unique: true, sparse: true }, passwordHash: String, role: String }, base))
export const Patient = mongoose.models.Patient ?? mongoose.model('Patient', new Schema({ userId: String, name: String, abhaId: { type: String, unique: true }, aadhaarHash: String, dateOfBirth: Date }, base))
export const Doctor = mongoose.models.Doctor ?? mongoose.model('Doctor', new Schema({ userId: String, name: String, specialty: String, department: String }, base))
export const Hospital = mongoose.models.Hospital ?? mongoose.model('Hospital', new Schema({ name: String }, base))
export const Department = mongoose.models.Department ?? mongoose.model('Department', new Schema({ name: String, hospitalId: String }, base))
export const Case = mongoose.models.Case ?? mongoose.model('Case', new Schema({ _id: String, patientId: String, hospitalId: String, departmentId: String, status: String, complaint: String, aiFindings: json, riskLevel: String, responses: [json], summaries: [json], symptoms: [json], riskAssessments: [json] }, base))
export const Document = mongoose.models.Document ?? mongoose.model('MedicalDocument', new Schema({ patientId: String, caseId: String, type: String, fileName: String, storagePath: String, mimeType: String, fileSize: Number, fileHash: String, processingStatus: String, classification: String, classificationConfidence: Number, rawText: String, extractedData: json, extractionConfidence: Number, versions: [json], reviews: [json] }, base))
export const Consultation = mongoose.models.Consultation ?? mongoose.model('DoctorConsultation', new Schema({ caseId: String, patientId: String, doctorId: String, clinicalAssessment: String, clinicalNotes: String, diagnoses: [json], prescriptions: [json], investigations: [json], treatmentPlan: String, followUp: json, status: String, completedAt: Date }, base))
export const Appointment = mongoose.models.Appointment ?? mongoose.model('Appointment', new Schema({ patientId: String, caseId: String, doctorId: String, departmentId: String, hospitalId: String, scheduledAt: Date, status: String }, base))
export const Queue = mongoose.models.Queue ?? mongoose.model('Queue', new Schema({ patientId: String, caseId: String, departmentId: String, hospitalId: String, token: String, position: Number, status: String }, base))
export const Registration = mongoose.models.Registration ?? mongoose.model('Registration', new Schema({ patientId: String, caseId: String, departmentId: String, hospitalId: String, registrationNumber: String, status: String }, base))
export const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', new Schema({ actorId: String, action: String, entityType: String, entityId: String, metadata: json }, base))
export const RecordVersion = mongoose.models.RecordVersion ?? mongoose.model('RecordVersion', new Schema({ recordId: String, patientId: String, version: Number, structuredRecord: json, createdBy: String, role: String, reason: String }, base))
export const RefreshToken = mongoose.models.RefreshToken ?? mongoose.model('RefreshToken', new Schema({ userId: String, tokenHash: String, expiresAt: Date, revokedAt: Date }, base))

export const collections = { User, Patient, Doctor, Hospital, Department, Case, Document, Consultation, Appointment, Queue, Registration, AuditLog, RecordVersion, RefreshToken }
