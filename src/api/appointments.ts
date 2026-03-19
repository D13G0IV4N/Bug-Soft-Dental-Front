import axios from "axios";
import { api } from "./axios";

export type AppointmentStatus = "pending" | "scheduled" | "confirmed" | "cancelled" | "completed" | string;

interface AppointmentPerson {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
}

export interface Appointment {
  id?: number;
  patient_user_id: number;
  dentist_user_id: number;
  start_at: string;
  end_at?: string;
  reason?: string;
  internal_notes?: string;
  notes?: string;
  status?: AppointmentStatus;
  patient?: AppointmentPerson;
  dentist?: AppointmentPerson;
  patient_name?: string;
  dentist_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAppointmentInput {
  patient_user_id: number;
  dentist_user_id: number;
  start_at: string;
  end_at: string;
  reason?: string;
  internal_notes?: string;
  notes?: string;
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

function normalizeAppointment(raw: unknown): Appointment {
  const source = asRecord(raw);
  const patient = asRecord(source.patient);
  const dentist = asRecord(source.dentist);

  const patientUserId = toNumber(source.patient_user_id ?? source.patient_id ?? patient.id);
  const dentistUserId = toNumber(source.dentist_user_id ?? source.dentist_id ?? dentist.id);
  const internalNotes = toStringValue(source.internal_notes ?? source.notes);

  return {
    id: typeof source.id === "number" ? source.id : undefined,
    patient_user_id: patientUserId,
    dentist_user_id: dentistUserId,
    start_at: toStringValue(source.start_at ?? source.starts_at ?? source.start_time ?? source.start_datetime),
    end_at: toStringValue(source.end_at ?? source.ends_at ?? source.end_time ?? source.end_datetime),
    reason: toStringValue(source.reason),
    internal_notes: internalNotes,
    notes: internalNotes,
    status: toStringValue(source.status) || "scheduled",
    patient: Object.keys(patient).length
      ? {
          id: toNumber(patient.id),
          name: toStringValue(patient.name),
          email: toStringValue(patient.email),
          phone: toStringValue(patient.phone),
        }
      : undefined,
    dentist: Object.keys(dentist).length
      ? {
          id: toNumber(dentist.id),
          name: toStringValue(dentist.name),
          email: toStringValue(dentist.email),
          phone: toStringValue(dentist.phone),
        }
      : undefined,
    patient_name: toStringValue(source.patient_name ?? patient.name),
    dentist_name: toStringValue(source.dentist_name ?? dentist.name),
    created_at: toStringValue(source.created_at),
    updated_at: toStringValue(source.updated_at),
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

export async function getAppointments() {
  const { data } = await api.get("/appointments");
  return normalizeList(data).map(normalizeAppointment);
}

export async function createAppointment(payload: CreateAppointmentInput) {
  const requestBody = {
    patient_user_id: payload.patient_user_id,
    dentist_user_id: payload.dentist_user_id,
    start_at: toApiDateTime(payload.start_at),
    end_at: toApiDateTime(payload.end_at),
    reason: payload.reason?.trim() || undefined,
    internal_notes: payload.internal_notes?.trim() || undefined,
    notes: payload.notes?.trim() || undefined,
  };

  const { data } = await api.post("/appointments", requestBody);
  return normalizeAppointment(normalizeOne<unknown>(data));
}

export async function updateAppointmentStatus(appointmentId: number | string, status: AppointmentStatus) {
  const { data } = await api.patch(`/appointments/${appointmentId}/status`, { status });
  return normalizeAppointment(normalizeOne<unknown>(data));
}
