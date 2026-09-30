export type PatientRegistrationFieldState = 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';

export interface PatientRegistrationField {
  fieldKey: string;
  fieldLabel: string;
  fieldGroup: string;
  currentState: PatientRegistrationFieldState | null;
  fieldOrder: number;
}

export interface PatientRegistrationProfile {
  hospitalId: number;
  profileName: string;
  version: number;
  fields: PatientRegistrationField[];
  supportedFields: PatientRegistrationField[];
  appliedAt?: string;
  appliedBy?: number;
}

export interface UpdatePatientRegistrationProfile {
  version: number;
  fields: { fieldKey: string; state: PatientRegistrationFieldState }[];
}
