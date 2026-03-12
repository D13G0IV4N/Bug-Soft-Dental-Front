import { api } from "./axios";

export interface Appointment {
  id?: number;
  patient_id: number;
  dentist_id: number;
  starts_at: string;
  ends_at?: string;
  status?: string;
  notes?: string;
  patient_name?: string;
  dentist_name?: string;
}

function normalizeOne<T>(payload: unknown): T {
  const source = payload as { data?: unknown };
  const nested = source?.data as { data?: unknown } | undefined;
  return (nested?.data ?? source?.data ?? payload) as T;
}

function normalizeList<T>(payload: unknown): T[] {
  const source = payload as { data?: unknown };
  const nested = source?.data as { data?: unknown } | undefined;
  const list = nested?.data ?? source?.data ?? payload;
  return Array.isArray(list) ? (list as T[]) : [];
}

export async function getAppointments() {
  const { data } = await api.get("/appointments");
  return normalizeList<Appointment>(data);
}

export async function createAppointment(payload: Appointment) {
  const { data } = await api.post("/appointments", payload);
  return normalizeOne<Appointment>(data);
}

export async function updateAppointmentStatus(appointmentId: number | string, status: string) {
  const { data } = await api.patch(`/appointments/${appointmentId}/status`, { status });
  return normalizeOne<Appointment>(data);
}
