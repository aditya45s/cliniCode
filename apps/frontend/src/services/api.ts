const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

function normalizeIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeIds)
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  const normalized = Object.fromEntries(Object.entries(record).filter(([key]) => key !== '_id').map(([key, item]) => [key, normalizeIds(item)]))
  if (record._id !== undefined && normalized.id === undefined) normalized.id = String(record._id)
  return normalized
}

export type AuthUser = { id: string; role: 'PATIENT' | 'DOCTOR'; name: string; abhaId?: string; department?: string }
export type AuthSession = { accessToken: string; refreshToken: string; user: AuthUser; mock: boolean }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestWithToken<T>(path, options, true)
}

async function requestWithToken<T>(path: string, options: RequestInit, allowRefresh: boolean): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const token = localStorage.getItem('carekare.accessToken')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (response.status === 401 && allowRefresh && !path.startsWith('/auth/')) {
    const refreshToken = localStorage.getItem('carekare.refreshToken')
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) })
      if (refreshResponse.ok) { const refreshed = await refreshResponse.json() as { accessToken: string }; localStorage.setItem('carekare.accessToken', refreshed.accessToken); return requestWithToken<T>(path, options, false) }
    }
  }
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? `Request failed (${response.status})`) }
  return response.status === 204 ? undefined as T : response.json().then(normalizeIds) as Promise<T>
}

export const api = {
  login: (role: 'patient' | 'doctor', identifier: string, password?: string) => request<AuthSession>(`/auth/${role}/login`, { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  register: (role: 'patient' | 'doctor', payload: Record<string, string>) => request<AuthSession>(`/auth/${role}/register`, { method: 'POST', body: JSON.stringify(payload) }),
  patientProfile: () => request<Record<string, unknown>>('/patients/me'),
  cases: () => request<Array<Record<string, unknown>>>('/patients/me/cases'),
  history: () => request<Record<string, unknown>>('/patients/me/history'),
  documents: () => request<Array<Record<string, unknown>>>('/patients/me/documents'),
  departments: () => request<Array<Record<string, unknown>>>('/departments'),
  doctorDashboard: () => request<{ activeCases: number; reportsForReview: number; completedConsultations: number }>('/doctor/dashboard'),
  doctorCases: () => request<Array<Record<string, unknown>>>('/doctor/cases'),
  doctorCase: (id: string) => request<Record<string, unknown>>(`/doctor/cases/${id}`),
  doctorDocuments: () => request<Array<Record<string, unknown>>>('/doctor/documents'),
  createCase: (complaint: string) => request<Record<string, unknown>>('/cases', { method: 'POST', body: JSON.stringify({ complaint }) }),
  saveSummary: (id: string) => request<Record<string, unknown>>(`/cases/${id}/summary`, { method: 'POST', body: JSON.stringify({}) }),
  saveResponse: (id: string, answer: unknown) => request<Record<string, unknown>>(`/cases/${id}/responses`, { method: 'POST', body: JSON.stringify({ answer }) }),
  assessRisk: (id: string, acknowledged = false) => request<Record<string, unknown>>(`/cases/${id}/risk-assessment`, { method: 'POST', body: JSON.stringify({ acknowledged }) }),
  changeDepartment: (id: string, departmentId: string) => request<Record<string, unknown>>(`/cases/${id}/department`, { method: 'POST', body: JSON.stringify({ departmentId }) }),
  uploadDocument: (file: File, type: string, caseId?: string) => { const body = new FormData(); body.append('file', file); body.append('type', type); if (caseId) body.append('caseId', caseId); return request<Record<string, unknown>>('/documents/upload', { method: 'POST', body }) },
  processDocument: (id: string) => request<Record<string, unknown>>(`/documents/${id}/process`, { method: 'POST' }),
  reviewDocument: (id: string, action: 'VERIFY' | 'REJECT' | 'EDIT', structuredData?: Record<string, unknown>) => request<Record<string, unknown>>(`/documents/${id}/review`, { method: 'POST', body: JSON.stringify({ action, structuredData }) }),
  originalDocumentUrl: async (id: string) => { const response = await fetch(`${API_URL}/documents/${id}/original`, { headers: { Authorization: `Bearer ${localStorage.getItem('carekare.accessToken') ?? ''}` } }); if (!response.ok) throw new Error('Original document is unavailable'); return URL.createObjectURL(await response.blob()) },
  consultation: (payload: Record<string, unknown>) => request<Record<string, unknown>>('/doctor/consultations', { method: 'POST', body: JSON.stringify(payload) }),
  bookAppointment: (payload: Record<string, unknown>) => request<Record<string, unknown>>('/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  joinQueue: (payload: Record<string, unknown>) => request<Record<string, unknown>>('/queues/join', { method: 'POST', body: JSON.stringify(payload) }),
  registerVisit: (payload: Record<string, unknown>) => request<Record<string, unknown>>('/registrations', { method: 'POST', body: JSON.stringify(payload) }),
  appointmentAvailability: () => request<Array<Record<string, unknown>>>('/appointments/availability'),
  appointments: () => request<Array<Record<string, unknown>>>('/appointments'),
}

export function storeSession(session: AuthSession) { localStorage.setItem('carekare.accessToken', session.accessToken); localStorage.setItem('carekare.refreshToken', session.refreshToken); localStorage.setItem('carekare.user', JSON.stringify(session.user)) }
export function clearSession() { localStorage.removeItem('carekare.accessToken'); localStorage.removeItem('carekare.refreshToken'); localStorage.removeItem('carekare.user') }
export function storedUser(): AuthUser | null { const value = localStorage.getItem('carekare.user'); if (!value) return null; try { return JSON.parse(value) as AuthUser } catch { clearSession(); return null } }
