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
  list: (params: Paged & { query?: string; specialty?: string } = {}) =>
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
};

export const appointmentsApi = {
  list: (
    params: Paged & { status?: string; doctorId?: number; patientId?: number; date?: string } = {},
  ) => api.get<Page<Appointment>>(`/appointments${query({ ...params })}`),
  book: (payload: Record<string, unknown>) => api.post<Appointment>('/appointments', payload),
  /** action is one of confirm | check-in | start-consultation | complete | cancel | no-show */
  transition: (id: number, action: string) =>
    api.patch<Appointment>(`/appointments/${id}/${action}`),
};

export const prescriptionsApi = {
  list: (params: Paged & { patientId?: number; doctorId?: number; status?: string } = {}) =>
    api.get<Page<Prescription>>(`/prescriptions${query({ ...params })}`),
  complete: (id: number) => api.patch<Prescription>(`/prescriptions/${id}/complete`),
  cancel: (id: number) => api.patch<Prescription>(`/prescriptions/${id}/cancel`),
};

export const laboratoryApi = {
  list: (params: Paged & { status?: string; priority?: string } = {}) =>
    api.get<Page<LabOrder>>(`/lab-orders${query({ ...params })}`),
  start: (id: number) => api.patch<LabOrder>(`/lab-orders/${id}/start`),
  complete: (id: number, resultSummary: string) =>
    api.patch<LabOrder>(`/lab-orders/${id}/complete`, { resultSummary }),
};

export const pharmacyApi = {
  list: (params: Paged & { query?: string; lowStockOnly?: boolean } = {}) =>
    api.get<Page<Medication>>(`/pharmacy/medications${query({ ...params })}`),
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
