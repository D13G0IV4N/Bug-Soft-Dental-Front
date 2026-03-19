import axios from "axios";
import { api } from "./axios";

export type AppointmentStatus = "pending" | "scheduled" | "confirmed" | "cancelled" | "canceled" | "completed" | "no_show" | string;

export interface AppointmentPerson {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
}

export interface AppointmentSpecialty {
  id?: number;
  name?: string;
}

export interface AppointmentService {
  id?: number;
  name?: string;
  duration_minutes?: number;
  specialty_id?: number;
  specialty?: AppointmentSpecialty;
}

export interface Appointment {
  id?: number;
  patient_user_id: number;
  dentist_user_id: number;
  service_id: number;
  start_at: string;
  end_at?: string;
  reason?: string;
  internal_notes?: string;
  notes?: string;
  status?: AppointmentStatus;
  patient?: AppointmentPerson;
  dentist?: AppointmentPerson;
  service?: AppointmentService;
  patient_name?: string;
  dentist_name?: string;
  service_name?: string;
  specialty_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentPayload {
  patient_user_id: number;
  dentist_user_id: number;
  service_id: number;
  start_at: string;
  reason?: string;
  internal_notes?: string;
  notes?: string;
}

export interface AvailableDentist extends AppointmentPerson {
  specialty_ids?: number[];
  specialties?: AppointmentSpecialty[];
}

export interface AvailableDentistsParams {
  service_id: number;
  start_at: string;
  exclude_appointment_id?: number;
}

function normalizeOne<T>(payload: unknown): T {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  return (nested.data ?? source.data ?? payload) as T;
}

function normalizeList(payload: unknown): unknown[] {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const list = nested.data ?? source.data ?? payload;
  return Array.isArray(list) ? list : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  }
  return 0;
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toApiDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

function normalizePerson(raw: unknown): AppointmentPerson | undefined {
  const source = asRecord(raw);

  if (!Object.keys(source).length) return undefined;

  return {
    id: toNumber(source.id),
    name: toStringValue(source.name),
    email: toStringValue(source.email),
    phone: toStringValue(source.phone),
  };
}

function normalizeSpecialty(raw: unknown): AppointmentSpecialty | undefined {
  const source = asRecord(raw);
  const id = toNumber(source.id ?? source.specialty_id);
  const name = toStringValue(source.name ?? source.specialty);

  if (!id && !name) return undefined;

  return { id: id || undefined, name };
}

function normalizeService(raw: unknown): AppointmentService | undefined {
  const source = asRecord(raw);
  const specialty = normalizeSpecialty(source.specialty);
  const id = toNumber(source.id ?? source.service_id);
  const name = toStringValue(source.name ?? source.service_name);

  if (!id && !name && !specialty) return undefined;

  return {
    id: id || undefined,
    name,
    duration_minutes: source.duration_minutes === undefined ? undefined : toNumber(source.duration_minutes),
    specialty_id: source.specialty_id === undefined ? specialty?.id : toNumber(source.specialty_id),
    specialty,
  };
}

function normalizeAppointment(raw: unknown): Appointment {
  const source = asRecord(raw);
  const patient = normalizePerson(source.patient);
  const dentist = normalizePerson(source.dentist);
  const service = normalizeService(source.service);

  const patientUserId = toNumber(source.patient_user_id ?? source.patient_id ?? patient?.id);
  const dentistUserId = toNumber(source.dentist_user_id ?? source.dentist_id ?? dentist?.id);
  const serviceId = toNumber(source.service_id ?? source.serviceId ?? service?.id);
  const internalNotes = toStringValue(source.internal_notes ?? source.notes);
  const specialty = normalizeSpecialty(source.specialty ?? service?.specialty);

  return {
    id: typeof source.id === "number" ? source.id : undefined,
    patient_user_id: patientUserId,
    dentist_user_id: dentistUserId,
    service_id: serviceId,
    start_at: toStringValue(source.start_at ?? source.starts_at ?? source.start_time ?? source.start_datetime),
    end_at: toStringValue(source.end_at ?? source.ends_at ?? source.end_time ?? source.end_datetime),
    reason: toStringValue(source.reason),
    internal_notes: internalNotes,
    notes: internalNotes,
    status: toStringValue(source.status) || "scheduled",
    patient,
    dentist,
    service: service
      ? {
          ...service,
          specialty: specialty ?? service.specialty,
        }
      : undefined,
    patient_name: toStringValue(source.patient_name ?? patient?.name),
    dentist_name: toStringValue(source.dentist_name ?? dentist?.name),
    service_name: toStringValue(source.service_name ?? service?.name),
    specialty_name: toStringValue(source.specialty_name ?? specialty?.name ?? service?.specialty?.name),
    created_at: toStringValue(source.created_at),
    updated_at: toStringValue(source.updated_at),
  };
}

function normalizeAvailableDentist(raw: unknown): AvailableDentist {
  const source = asRecord(raw);
  const specialties = [
    ...(Array.isArray(source.specialties) ? source.specialties : []),
    ...(Array.isArray(asRecord(source.dentist_profile).specialties) ? (asRecord(source.dentist_profile).specialties as unknown[]) : []),
  ]
    .map(normalizeSpecialty)
    .filter((item): item is AppointmentSpecialty => Boolean(item));

  const specialtyIds = [
    ...(Array.isArray(source.specialty_ids) ? source.specialty_ids : []),
    ...(Array.isArray(asRecord(source.dentist_profile).specialty_ids) ? (asRecord(source.dentist_profile).specialty_ids as unknown[]) : []),
    ...specialties.map((item) => item.id),
  ]
    .map((value) => toNumber(value))
    .filter((value, index, array) => value > 0 && array.indexOf(value) === index);

  return {
    ...normalizePerson(raw),
    specialty_ids: specialtyIds,
    specialties,
  };
}

export function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = asRecord(error.response?.data);
    const errors = asRecord(responseData.errors);

    const detailedErrors = Object.values(errors)
      .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
      .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");

    if (detailedErrors.length) {
      return detailedErrors.join("\n");
    }

    if (typeof responseData.message === "string" && responseData.message.trim() !== "") {
      return responseData.message;
    }

    if (error.message) return error.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
}

function buildAppointmentPayload(payload: AppointmentPayload) {
  return {
    patient_user_id: payload.patient_user_id,
    dentist_user_id: payload.dentist_user_id,
    service_id: payload.service_id,
    start_at: toApiDateTime(payload.start_at),
    reason: payload.reason?.trim() || undefined,
    internal_notes: payload.internal_notes?.trim() || undefined,
    notes: payload.notes?.trim() || undefined,
  };
}

export async function getAppointments() {
  const { data } = await api.get("/appointments");
  return normalizeList(data).map(normalizeAppointment);
}

export async function createAppointment(payload: AppointmentPayload) {
  const { data } = await api.post("/appointments", buildAppointmentPayload(payload));
  return normalizeAppointment(normalizeOne<unknown>(data));
}

export async function updateAppointment(appointmentId: number | string, payload: Partial<AppointmentPayload>) {
  const body: Record<string, unknown> = {};

  if (payload.patient_user_id !== undefined) body.patient_user_id = payload.patient_user_id;
  if (payload.dentist_user_id !== undefined) body.dentist_user_id = payload.dentist_user_id;
  if (payload.service_id !== undefined) body.service_id = payload.service_id;
  if (payload.start_at !== undefined) body.start_at = toApiDateTime(payload.start_at);
  if (payload.reason !== undefined) body.reason = payload.reason?.trim() || null;
  if (payload.internal_notes !== undefined) body.internal_notes = payload.internal_notes?.trim() || null;
  if (payload.notes !== undefined) body.notes = payload.notes?.trim() || null;

  const { data } = await api.patch(`/appointments/${appointmentId}`, body);
  return normalizeAppointment(normalizeOne<unknown>(data));
}

export async function getAvailableDentists(params: AvailableDentistsParams) {
  const { data } = await api.get("/appointments/available-dentists", {
    params: {
      service_id: params.service_id,
      start_at: toApiDateTime(params.start_at),
      exclude_appointment_id: params.exclude_appointment_id,
    },
  });

  return normalizeList(data).map(normalizeAvailableDentist).filter((dentist) => dentist.id);
}

export async function updateAppointmentStatus(appointmentId: number | string, status: AppointmentStatus) {
  const { data } = await api.patch(`/appointments/${appointmentId}/status`, { status });
  return normalizeAppointment(normalizeOne<unknown>(data));
}
