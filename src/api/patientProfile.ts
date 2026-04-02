import { api } from "./axios";
import { me } from "./auth";

export interface PatientProfileData {
  id?: number;
  nombre: string;
  telefono: string;
  correo: string;
  clinica: string;
  rol: string;
}

export interface UpdatePatientProfilePayload {
  nombre: string;
  telefono: string;
  correo?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeOne(payload: unknown): Record<string, unknown> {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const deep = asRecord(nested.data);
  return asRecord(deep.id ? deep : nested.data ?? source.data ?? payload);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveRole(rawRole: unknown): string {
  const normalized = toText(rawRole).toLowerCase();
  if (normalized === "pacient" || normalized === "client") return "Paciente";
  if (normalized === "admin") return "Administrador";
  if (normalized === "dentist") return "Odontólogo";
  if (normalized === "receptionist") return "Recepción";
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Paciente";
}

function resolveClinicName(record: Record<string, unknown>): string {
  const profile = asRecord(record.profile);
  const clinic = asRecord(record.clinic);

  return (
    toText(record.clinic_name) ||
    toText(record.clinicName) ||
    toText(profile.clinic_name) ||
    toText(asRecord(profile.clinic).name) ||
    toText(clinic.name) ||
    "Clínica dental"
  );
}

function normalizePatientProfile(record: Record<string, unknown>): PatientProfileData {
  return {
    id: typeof record.id === "number" ? record.id : undefined,
    nombre: toText(record.name),
    telefono: toText(record.phone),
    correo: toText(record.email),
    clinica: resolveClinicName(record),
    rol: resolveRole(record.role),
  };
}

export async function getPatientProfile() {
  try {
    const { data } = await api.get("/pacient/profile");
    return normalizePatientProfile(normalizeOne(data));
  } catch {
    const response = await me();
    return normalizePatientProfile(normalizeOne(response.data));
  }
}

export async function updatePatientProfile(payload: UpdatePatientProfilePayload) {
  const body: Record<string, unknown> = {
    name: payload.nombre.trim(),
    phone: payload.telefono.trim(),
  };

  if (payload.correo !== undefined) {
    body.email = payload.correo.trim();
  }

  try {
    const { data } = await api.patch("/pacient/profile", body);
    return normalizePatientProfile(normalizeOne(data));
  } catch {
    const { data } = await api.patch("/auth/me", body);
    return normalizePatientProfile(normalizeOne(data));
  }
}

export async function changePatientPassword(payload: ChangePasswordPayload) {
  try {
    await api.patch("/pacient/profile/password", payload);
    return;
  } catch {
    await api.post("/auth/change-password", payload);
  }
}
