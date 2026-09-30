export const APP_CONFIG = {
  name: 'MedFlow AI',
  tagline: 'The clinical operating system for modern care teams',
  version: '0.1.0-foundation',
} as const;

export const ROUTES = {
  landing: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  dashboard: '/dashboard',
  doctors: '/doctors',
  patients: '/patients',
  appointments: '/appointments',
  prescriptions: '/prescriptions',
  laboratory: '/laboratory',
  pharmacy: '/pharmacy',
  reports: '/reports',
  notifications: '/notifications',
  ai: '/ai',
  users: '/users',
  settings: '/settings',
  patientProfile: '/patients/:patientId',
  patientDetail: (id: string | number) => `/patients/${id}`,
} as const;
