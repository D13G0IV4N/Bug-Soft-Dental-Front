import axios from "axios";
import { api } from "./axios";
import { toErrorMessage } from "./appointments";

export interface ServiceSpecialty {
  id: number;
  name: string;
  description?: string | null;
  status?: boolean;
}

export interface Service {
  id: number;
  clinic_id?: number;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price?: number | null;
  status: boolean;
  specialty_id: number;
  specialty?: ServiceSpecialty | null;
  created_at?: string;
  updated_at?: string;
}

export interface ServicePayload {
  name: string;
  description?: string | null;
  duration_minutes: number;
  price?: number | null;
  status?: boolean;
  specialty_id: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeList<T>(payload: unknown): T[] {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const list = nested.data ?? source.data ?? payload;
  return Array.isArray(list) ? (list as T[]) : [];
}

function normalizeOne<T>(payload: unknown): T {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  return (nested.data ?? source.data ?? payload) as T;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNullableString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return null;
}

function toStatus(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    return normalized === "1" || normalized === "true" || normalized === "active";
  }
  return true;
}

function mapSpecialty(raw: unknown): ServiceSpecialty | null {
  const source = asRecord(raw);
  const id = toNumber(source.id ?? source.specialty_id);
  const name = typeof source.name === "string"
    ? source.name.trim()
    : typeof source.specialty === "string"
      ? source.specialty.trim()
      : "";

  if (!id && !name) return null;

  return {
    id,
    name,
    description: toNullableString(source.description),
    status: source.status === undefined ? undefined : toStatus(source.status),
  };
}

function mapService(raw: unknown): Service {
  const source = asRecord(raw);
  const specialty = mapSpecialty(source.specialty);
  const specialtyId = toNumber(source.specialty_id ?? specialty?.id);

  return {
    id: toNumber(source.id),
    clinic_id: source.clinic_id === undefined ? undefined : toNumber(source.clinic_id),
    name: typeof source.name === "string" ? source.name.trim() : "",
    description: toNullableString(source.description),
    duration_minutes: toNumber(source.duration_minutes),
    price: source.price === null || source.price === undefined || source.price === ""
      ? null
      : toNumber(source.price),
    status: toStatus(source.status),
    specialty_id: specialtyId,
    specialty,
    created_at: typeof source.created_at === "string" ? source.created_at : undefined,
    updated_at: typeof source.updated_at === "string" ? source.updated_at : undefined,
  };
}

function buildServicePayload(payload: ServicePayload): ServicePayload {
  return {
    name: payload.name.trim(),
    description: payload.description?.trim() ? payload.description.trim() : null,
    duration_minutes: Math.max(1, Math.trunc(payload.duration_minutes)),
    price: payload.price === null || payload.price === undefined || Number.isNaN(Number(payload.price))
      ? null
      : Number(payload.price),
    status: payload.status ?? true,
    specialty_id: Math.trunc(payload.specialty_id),
  };
}

export async function getServices() {
  const { data } = await api.get("/services");
  return normalizeList<unknown>(data).map(mapService).filter((service) => service.id > 0);
}

export async function getDentistServices() {
  try {
    const { data } = await api.get("/services");
    return normalizeList<unknown>(data).map(mapService).filter((service) => service.id > 0);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const { data } = await api.get("/dentist/services");
      return normalizeList<unknown>(data).map(mapService).filter((service) => service.id > 0);
    }

    throw error;
  }
}

export async function getServiceById(serviceId: number | string) {
  const { data } = await api.get(`/services/${serviceId}`);
  return mapService(normalizeOne<unknown>(data));
}

export async function createService(payload: ServicePayload) {
  try {
    const { data } = await api.post("/services", buildServicePayload(payload));
    return mapService(normalizeOne<unknown>(data));
  } catch (error) {
    throw new Error(toErrorMessage(error, "No se pudo crear el servicio"));
  }
}

export async function updateService(serviceId: number | string, payload: Partial<ServicePayload>) {
  const body: Record<string, unknown> = {};

  if (typeof payload.name === "string") body.name = payload.name.trim();
  if (payload.description !== undefined) body.description = payload.description?.trim() ? payload.description.trim() : null;
  if (payload.duration_minutes !== undefined) body.duration_minutes = Math.max(1, Math.trunc(payload.duration_minutes));
  if (payload.price !== undefined) body.price = payload.price === null ? null : Number(payload.price);
  if (typeof payload.status === "boolean") body.status = payload.status;
  if (payload.specialty_id !== undefined) body.specialty_id = Math.trunc(payload.specialty_id);

  try {
    const { data } = await api.patch(`/services/${serviceId}`, body);
    return mapService(normalizeOne<unknown>(data));
  } catch (error) {
    throw new Error(toErrorMessage(error, "No se pudo actualizar el servicio"));
  }
}

export async function deleteService(serviceId: number | string) {
  try {
    const { data } = await api.delete(`/services/${serviceId}`);
    return data;
  } catch (error) {
    throw new Error(toErrorMessage(error, "No se pudo eliminar el servicio"));
  }
}
