import { api } from "./axios";
import axios from "axios";

export type PatientStatus = boolean | number | string | null | undefined;

export interface PatientProfile {
  birth_date?: string | null;
  gender?: string | null;
  address?: string | null;
  allergies?: string | null;
  notes?: string | null;
}

export interface Patient {
  id?: number;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  status?: boolean;
  profile: PatientProfile;
}

function normalizeListPayload(payload: unknown): unknown[] {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const list = nested.data ?? source.data ?? payload ?? [];
  return Array.isArray(list) ? list : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizePatient(raw: unknown): Patient {
  const source = asRecord(raw);
  const profile = asRecord(source.patient_profile ?? source.patientProfile ?? source.profile);
  const status = source.status;

  return {
    id: typeof source.id === "number" ? source.id : undefined,
    name: typeof source.name === "string" ? source.name : "",
    email: typeof source.email === "string" ? source.email : "",
    phone: typeof source.phone === "string" ? source.phone : "",
    status: toBooleanStatus(status as PatientStatus),
    profile: {
      birth_date: typeof profile.birth_date === "string"
        ? profile.birth_date
        : typeof profile.birthDate === "string"
          ? profile.birthDate
          : null,
      gender: typeof profile.gender === "string" ? profile.gender : null,
      address: typeof profile.address === "string" ? profile.address : null,
      allergies: typeof profile.allergies === "string" ? profile.allergies : null,
      notes: typeof profile.notes === "string" ? profile.notes : null,
    },
  };
}

function toBooleanStatus(status: PatientStatus): boolean {
  if (typeof status === "boolean") return status;
  if (typeof status === "number") return status === 1;
  if (typeof status === "string") {
    const lower = status.toLowerCase().trim();
    return lower === "1" || lower === "true" || lower === "active" || lower === "activo";
  }
  return true;
}

function buildPatientPayload(patient: Partial<Patient>, isCreate: boolean) {
  const payload: Record<string, unknown> = {
    name: patient.name,
    email: patient.email,
    phone: patient.phone,
    profile: {
      birth_date: patient.profile?.birth_date ?? null,
      gender: patient.profile?.gender ?? null,
      address: patient.profile?.address ?? null,
      allergies: patient.profile?.allergies ?? null,
      notes: patient.profile?.notes ?? null,
    },
  };

  if (typeof patient.status === "boolean") {
    payload.status = patient.status ? 1 : 0;
  }

  if (patient.password) {
    payload.password = patient.password;
  } else if (isCreate) {
    payload.password = "";
  }

  if (!isCreate) {
    if (patient.name === undefined) delete payload.name;
    if (patient.email === undefined) delete payload.email;
    if (patient.phone === undefined) delete payload.phone;
    if (patient.profile === undefined) delete payload.profile;
  }

  return payload;
}

function clinicBase(clinicId: number | string) {
  return `/super/clinics/${clinicId}/patients`;
}

const adminBase = "/admin/patients";

export async function getSuperClinicPatients(clinicId: number | string) {
  const { data } = await api.get(clinicBase(clinicId));
  return normalizeListPayload(data).map(normalizePatient);
}

export async function createSuperClinicPatient(clinicId: number | string, patient: Patient) {
  const payload = buildPatientPayload(patient, true);
  const { data } = await api.post(clinicBase(clinicId), payload);
  return normalizePatient(data?.data ?? data);
}

export async function getSuperClinicPatientById(clinicId: number | string, patientId: number | string) {
  const { data } = await api.get(`${clinicBase(clinicId)}/${patientId}`);
  return normalizePatient(data?.data ?? data);
}

export async function updateSuperClinicPatient(
  clinicId: number | string,
  patientId: number | string,
  patient: Partial<Patient>
) {
  const payload = buildPatientPayload(patient, false);
  const { data } = await api.patch(`${clinicBase(clinicId)}/${patientId}`, payload);
  return normalizePatient(data?.data ?? data);
}

export async function deleteSuperClinicPatient(clinicId: number | string, patientId: number | string) {
  const { data } = await api.delete(`${clinicBase(clinicId)}/${patientId}`);
  return data;
}

export async function getAdminPatients() {
  const { data } = await api.get(adminBase);
  return normalizeListPayload(data).map(normalizePatient);
}

export async function getDentistPatients() {
  try {
    const { data } = await api.get("/dentist/patients");
    return normalizeListPayload(data).map(normalizePatient);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const { data } = await api.get("/patients");
      return normalizeListPayload(data).map(normalizePatient);
    }
    throw error;
  }
}

export async function createAdminPatient(patient: Patient) {
  const payload = buildPatientPayload(patient, true);
  const { data } = await api.post(adminBase, payload);
  return normalizePatient(data?.data ?? data);
}

export async function getAdminPatientById(patientId: number | string) {
  const { data } = await api.get(`${adminBase}/${patientId}`);
  return normalizePatient(data?.data ?? data);
}

export async function updateAdminPatient(patientId: number | string, patient: Partial<Patient>) {
  const payload = buildPatientPayload(patient, false);
  const { data } = await api.patch(`${adminBase}/${patientId}`, payload);
  return normalizePatient(data?.data ?? data);
}

export async function deleteAdminPatient(patientId: number | string) {
  const { data } = await api.delete(`${adminBase}/${patientId}`);
  return data;
}
