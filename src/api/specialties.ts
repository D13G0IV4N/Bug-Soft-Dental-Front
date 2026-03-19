import { api } from "./axios";

export interface Specialty {
  id: number;
  name: string;
  description?: string | null;
  status: boolean;
}

export interface SpecialtyPayload {
  name: string;
  description?: string | null;
  status?: boolean;
}

function normalizeList<T>(payload: unknown): T[] {
  const source = payload as { data?: unknown };
  const nested = source?.data as { data?: unknown } | undefined;
  const list = nested?.data ?? source?.data ?? payload;
  return Array.isArray(list) ? (list as T[]) : [];
}

function normalizeOne<T>(payload: unknown): T {
  const source = payload as { data?: unknown };
  const nested = source?.data as { data?: unknown } | undefined;
  return (nested?.data ?? source?.data ?? payload) as T;
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

function mapSpecialty(raw: unknown): Specialty {
  const specialty = raw as Record<string, unknown>;

  return {
    id: Number(specialty.id ?? 0),
    name: String(specialty.name ?? specialty.specialty ?? "").trim(),
    description:
      typeof specialty.description === "string" || specialty.description === null
        ? specialty.description
        : null,
    status: toStatus(specialty.status),
  };
}

function buildSpecialtyPayload(payload: SpecialtyPayload) {
  return {
    name: payload.name.trim(),
    description: payload.description?.trim() ? payload.description.trim() : null,
    status: payload.status ?? true,
  };
}

export async function getSpecialties(options?: { includeInactive?: boolean }) {
  const { data } = await api.get("/specialties");
  const specialties = normalizeList<unknown>(data)
    .map(mapSpecialty)
    .filter((specialty) => specialty.id > 0 && specialty.name);

  if (options?.includeInactive) {
    return specialties;
  }

  return specialties.filter((specialty) => specialty.status !== false);
}

export async function createSpecialty(payload: SpecialtyPayload) {
  const { data } = await api.post("/specialties", buildSpecialtyPayload(payload));
  return mapSpecialty(normalizeOne<unknown>(data));
}

export async function updateSpecialty(specialtyId: number | string, payload: Partial<SpecialtyPayload>) {
  const body: Record<string, unknown> = {};

  if (typeof payload.name === "string") {
    body.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    body.description = payload.description?.trim() ? payload.description.trim() : null;
  }

  if (typeof payload.status === "boolean") {
    body.status = payload.status;
  }

  const { data } = await api.patch(`/specialties/${specialtyId}`, body);
  return mapSpecialty(normalizeOne<unknown>(data));
}

export async function deleteSpecialty(specialtyId: number | string) {
  const { data } = await api.delete(`/specialties/${specialtyId}`);
  return data;
}
