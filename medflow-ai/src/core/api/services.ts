/** One function per backend route the UI uses, grouped by module. */
import { api, query, type Page } from './client';
import type {
  Appointment,
  AuthSession,
  ChatMessage,
  DailyActivity,
  DashboardSummary,
  Doctor,
  Hospital,
  LabOrder,
  Medication,
  ModuleEntitlement,
  Notification,
  Patient,
  PatientAccount,
  PatientMedicalHistory,
  PatientReport,
  Prescription,
  PrescriptionItem,
  Role,
  Setting,
  UserAccount,
} from './types';
import type {
  PatientRegistrationProfile,
  UpdatePatientRegistrationProfile,
} from '../../modules/settings/types/patientRegistrationProfile';

export interface Paged {
  page?: number;
  size?: number;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthSession>('/auth/login', { email, password }),
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    hospitalName?: string;
  }) => api.post<AuthSession>('/auth/register', payload),
  forgotPassword: (email: string) => api.post<void>('/auth/forgot-password', { email }),
  me: () => api.get<UserAccount>('/auth/me'),
};

export const hospitalApi = {
  profile: () => api.get<Hospital>('/hospital'),
  modules: () => api.get<ModuleEntitlement[]>('/hospital/modules'),
};

export const analyticsApi = {
  dashboard: () => api.get<DashboardSummary>('/analytics/dashboard'),
  activity: (days = 7) => api.get<DailyActivity[]>(`/analytics/activity${query({ days })}`),
};

export const doctorsApi = {
  list: (params: Paged & { query?: string; specialty?: string; status?: string } = {}) =>
    api.get<Page<Doctor>>(`/doctors${query({ ...params })}`),
  get: (id: number) => api.get<Doctor>(`/doctors/${id}`),
  create: (payload: Record<string, unknown>) => api.post<Doctor>('/doctors', payload),
};

export const patientsApi = {
  list: (params: Paged & { query?: string; status?: string } = {}) =>
    api.get<Page<Patient>>(`/patients${query({ ...params })}`),
  get: (id: number | string) => api.get<Patient>(`/patients/${id}`),
  create: (payload: Record<string, unknown>) => api.post<Patient>('/patients', payload),
  medicalHistory: (id: number | string) =>
    api.get<PatientMedicalHistory[]>(`/patients/${id}/medical-history`),
  accounts: (id: number | string) => api.get<PatientAccount[]>(`/patients/${id}/accounts`),
  reports: (id: number | string) => api.get<PatientReport[]>(`/patients/${id}/reports`),
  update: (id: number | string, payload: Record<string, unknown>) =>
    api.put<Patient>(`/patients/${id}`, payload),
};

export const appointmentsApi = {
  list: (
    params: Paged & { status?: string; doctorId?: number; patientId?: number; date?: string } = {},
  ) => api.get<Page<Appointment>>(`/appointments${query({ ...params })}`),
  get: (id: number) => api.get<Appointment>(`/appointments/${id}`),
  book: (payload: Record<string, unknown>) => api.post<Appointment>('/appointments', payload),
  /** action is one of confirm | check-in | start-consultation | complete | cancel | no-show */
  transition: (id: number, action: string) =>
    api.patch<Appointment>(`/appointments/${id}/${action}`),
};

export interface CreatePrescriptionPayload {
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  diagnosis?: string;
  digitallySigned?: boolean;
  medicines: PrescriptionItem[];
}

export interface UpdatePrescriptionPayload {
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  diagnosis?: string;
  digitallySigned?: boolean;
  medicines: PrescriptionItem[];
}

export const prescriptionsApi = {
  list: (params: Paged & { patientId?: number; doctorId?: number; status?: string } = {}) =>
    api.get<Page<Prescription>>(`/prescriptions${query({ ...params })}`),
  get: (id: number) => api.get<Prescription>(`/prescriptions/${id}`),
  create: (data: CreatePrescriptionPayload) => api.post<Prescription>('/prescriptions', data),
  update: (id: number, data: UpdatePrescriptionPayload) =>
    api.put<Prescription>(`/prescriptions/${id}`, data),
  delete: (id: number) => api.delete<void>(`/prescriptions/${id}`),
  complete: (id: number) => api.patch<Prescription>(`/prescriptions/${id}/complete`),
  cancel: (id: number) => api.patch<Prescription>(`/prescriptions/${id}/cancel`),
};

export const laboratoryApi = {
  list: (params: Paged & { query?: string; status?: string; priority?: string; patientId?: number } = {}) =>
    api.get<Page<LabOrder>>(`/lab-orders${query({ ...params })}`),
  get: (id: number) => api.get<LabOrder>(`/lab-orders/${id}`),
  create: (data: {
    patientId: number;
    doctorId: number;
    testName: string;
    priority: 'ROUTINE' | 'URGENT' | 'STAT';
  }) => api.post<LabOrder>('/lab-orders', data),
  update: (
    id: number,
    data: {
      testName: string;
      priority: 'ROUTINE' | 'URGENT' | 'STAT';
      doctorId?: number;
      resultSummary?: string;
    },
  ) => api.put<LabOrder>(`/lab-orders/${id}`, data),
  delete: (id: number) => api.delete<void>(`/lab-orders/${id}`),
  start: (id: number) => api.patch<LabOrder>(`/lab-orders/${id}/start`),
  complete: (id: number, resultSummary: string) =>
    api.patch<LabOrder>(`/lab-orders/${id}/complete`, { resultSummary }),
  cancel: (id: number) => api.patch<LabOrder>(`/lab-orders/${id}/cancel`),
};

export interface CreateMedicationPayload {
  name: string;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  expiryDate?: string;
}

export interface UpdateMedicationPayload {
  name: string;
  category: string;
  unitPrice: number;
  reorderLevel: number;
  expiryDate?: string;
}

export const pharmacyApi = {
  list: (
    params: Paged & {
      query?: string;
      category?: string;
      stockStatus?: string;
      lowStockOnly?: boolean;
    } = {},
  ) => api.get<Page<Medication>>(`/pharmacy/medications${query({ ...params })}`),
  get: (id: number) => api.get<Medication>(`/pharmacy/medications/${id}`),
  categories: () => api.get<string[]>('/pharmacy/medications/categories'),
  create: (data: CreateMedicationPayload) => api.post<Medication>('/pharmacy/medications', data),
  update: (id: number, data: UpdateMedicationPayload) =>
    api.put<Medication>(`/pharmacy/medications/${id}`, data),
  delete: (id: number) => api.delete<void>(`/pharmacy/medications/${id}`),
  adjustStock: (id: number, delta: number) =>
    api.patch<Medication>(`/pharmacy/medications/${id}/stock`, { delta }),
};

export const notificationsApi = {
  list: (params: Paged & { unreadOnly?: boolean } = {}) =>
    api.get<Page<Notification>>(`/notifications${query({ ...params })}`),
  unreadCount: () => api.get<{ unread: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),
};

export const usersApi = {
  list: (params: Paged & { query?: string; roleCode?: string } = {}) =>
    api.get<Page<UserAccount>>(`/users${query({ ...params })}`),
  changeStatus: (id: number, status: string) =>
    api.patch<UserAccount>(`/users/${id}/status`, { status }),
  changeRole: (id: number, roleCode: string) =>
    api.patch<UserAccount>(`/users/${id}/role`, { roleCode }),
};

export const accessApi = {
  roles: () => api.get<Role[]>('/access/roles'),
};

export const settingsApi = {
  list: () => api.get<Setting[]>('/settings'),
  save: (key: string, value: string) => api.put<Setting>(`/settings/${key}`, { value }),
  patientRegistrationProfile: () =>
    api.get<PatientRegistrationProfile>('/settings/patient-registration-profile'),
  updatePatientRegistrationProfile: (payload: UpdatePatientRegistrationProfile) =>
    api.put<PatientRegistrationProfile>('/settings/patient-registration-profile', payload),
  applyPatientRegistrationTemplate: (template: 'basic' | 'comprehensive') =>
    api.post<PatientRegistrationProfile>(
      `/settings/patient-registration-profile/templates/${template}`,
    ),
};

export const assistantApi = {
  send: (content: string, conversationId?: string) =>
    api.post<ChatMessage>('/assistant/messages', { content, conversationId }),
  history: (params: Paged & { conversationId?: string } = {}) =>
    api.get<Page<ChatMessage>>(`/assistant/messages${query({ ...params })}`),
};
