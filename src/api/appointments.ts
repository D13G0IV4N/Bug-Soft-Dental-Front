import axios from "axios";
import { api } from "./axios";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed" | string;

interface AppointmentPerson {
  id?: number;
  name?: string;
}

export interface Appointment {
  id?: number;
  patient_id: number;
  dentist_id: number;
  starts_at: string;
  ends_at?: string;
  reason?: string;
  status?: AppointmentStatus;
  notes?: string;
  patient?: AppointmentPerson;
  dentist?: AppointmentPerson;
  patient_name?: string;
  dentist_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAppointmentInput {
  patient_id: number;
  dentist_id: number;
  starts_at: string;
  ends_at: string;
  reason: string;
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

  const patientId = toNumber(source.patient_id ?? patient.id);
  const dentistId = toNumber(source.dentist_id ?? dentist.id);

  return {
    id: typeof source.id === "number" ? source.id : undefined,
    patient_id: patientId,
    dentist_id: dentistId,
    starts_at: toStringValue(source.starts_at ?? source.start_at ?? source.start_time ?? source.start_datetime),
    ends_at: toStringValue(source.ends_at ?? source.end_at ?? source.end_time ?? source.end_datetime),
    reason: toStringValue(source.reason),
    status: toStringValue(source.status) || "pending",
    notes: toStringValue(source.notes),
    patient: Object.keys(patient).length ? { id: toNumber(patient.id), name: toStringValue(patient.name) } : undefined,
    dentist: Object.keys(dentist).length ? { id: toNumber(dentist.id), name: toStringValue(dentist.name) } : undefined,
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
  const { data } = await api.get("/admin/appointments");
  return normalizeList(data).map(normalizeAppointment);
}

export async function createAppointment(payload: CreateAppointmentInput) {
  const requestBody = {
    patient_id: payload.patient_id,
    dentist_id: payload.dentist_id,
    starts_at: toApiDateTime(payload.starts_at),
    ends_at: toApiDateTime(payload.ends_at),
    reason: payload.reason,
  };

  const { data } = await api.post("/admin/appointments", requestBody);
  return normalizeAppointment(normalizeOne<unknown>(data));
}

export async function updateAppointmentStatus(appointmentId: number | string, status: AppointmentStatus) {
  const { data } = await api.patch(`/admin/appointments/${appointmentId}/status`, { status });
  return normalizeAppointment(normalizeOne<unknown>(data));
}
