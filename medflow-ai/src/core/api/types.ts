/** Response shapes returned by the MedFlow AI backend (`/api/v1`). */

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type AppointmentStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface UserAccount {
  id: number;
  hospitalId: number;
  userUid: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string;
  profilePhotoUrl?: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  status: AccountStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: UserAccount;
  permissions: string[];
}

export interface Hospital {
  id: number;
  hospitalCode: string;
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  timezone: string;
  status: AccountStatus;
}

export interface ModuleEntitlement {
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  phase: number;
  description?: string;
  status: string;
  accessible: boolean;
}

export interface DashboardSummary {
  revenueMonthToDate: number;
  totalPatients: number;
  doctorsOnStaff: number;
  appointmentsToday: number;
  prescriptionsIssued: number;
  labReportsCompleted: number;
  activeCases: number;
  unreadNotifications: number;
}

export interface DailyActivity {
  date: string;
  visits: number;
}

export interface Doctor {
  id: number;
  hospitalId?: number;
  userId?: number;
  doctorCode: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialty: string;
  qualification?: string;
  registrationNumber: string;
  yearsOfExperience: number;
  consultationFee: number;
  digitalSignatureUrl?: string;
  bio?: string;
  status: AccountStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Patient {
  id: number;
  patientCode: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  age?: number;
  bloodGroup?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  preferredLanguage?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  insuranceProvider?: string;
  memberId?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  allergies?: string;
  consentStatus?: string;
  referringPhysician?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianMobile?: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt?: string;
}

export type MappingRelation =
  | 'SELF'
  | 'PARENT'
  | 'GUARDIAN'
  | 'SPOUSE'
  | 'CHILD'
  | 'CARETAKER'
  | 'OTHER';

export interface PatientMedicalHistory {
  id: number;
  patientId: number;
  conditionName: string;
  notes?: string;
  recordedByDoctorId?: number;
  recordedAt: string;
}

export interface PatientAccount {
  id: number;
  userId: number;
  userFullName?: string;
  userEmail?: string;
  relation: MappingRelation;
  primaryContact: boolean;
  createdAt: string;
}

export interface PatientReport {
  id: number;
  patientId: number;
  reportType: string;
  fileUrl: string;
  uploadedByUserId?: number;
  uploadedAt: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  doctorSpecialty?: string;
  appointmentMode: 'ONLINE' | 'WALK_IN';
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  queueNumber?: number;
  reason?: string;
  notes?: string;
  consultationFee: number;
}

export interface PrescriptionItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
  instructions?: string;
}

export interface Prescription {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentId?: number;
  diagnosis?: string;
  medicines: PrescriptionItem[];
  digitallySigned: boolean;
  signedAt?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
}

export interface LabOrder {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  testName: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  resultSummary?: string;
  orderedAt: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface Medication {
  id: number;
  name: string;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  lowStock: boolean;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: number;
  category: 'APPOINTMENT' | 'LABORATORY' | 'PHARMACY' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  permissions: string[];
}
