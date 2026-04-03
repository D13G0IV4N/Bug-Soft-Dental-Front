import { api } from "./axios";
import type { Specialty } from "./specialties";

export interface Dentist {
  id?: number;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  status?: boolean;
  role?: "dentist";
  specialtyIds: number[];
  specialties: Specialty[];
  licenseNumber?: string | null;
  color?: string | null;
}

const BASE = (clinicId: number | string) => `/super/clinics/${clinicId}/users`;
type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function normalizeList(res: unknown) {
  const root = asRecord(res);
  const nested = asRecord(root.data);
  return nested.data ?? root.data ?? res ?? [];
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

function toSpecialty(source: unknown): Specialty | null {
  const specialty = asRecord(source);

  const id = Number(specialty.id ?? specialty.specialty_id ?? 0);
  const name = specialty.name ?? specialty.specialty ?? specialty.title ?? "";

  if (!id || typeof name !== "string" || !name) return null;

  return {
    id,
    name,
    description: typeof specialty.description === "string" ? specialty.description : null,
    status: toStatus(specialty.status),
  };
}

function extractSpecialties(user: unknown): Specialty[] {
  const userRecord = asRecord(user);
  const profile = asRecord(userRecord.dentist_profile ?? userRecord.dentistProfile);
  const candidates = [
    ...(Array.isArray(userRecord.specialties) ? userRecord.specialties : []),
    ...(Array.isArray(profile.specialties) ? profile.specialties : []),
    ...(Array.isArray(userRecord.dentist_specialties) ? userRecord.dentist_specialties : []),
  ];

  const mapped = candidates.map(toSpecialty).filter((item): item is Specialty => Boolean(item));
  const seen = new Set<number>();

  return mapped.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function extractSpecialtyIds(user: unknown, specialties: Specialty[]): number[] {
  const userRecord = asRecord(user);
  const profile = asRecord(userRecord.dentist_profile ?? userRecord.dentistProfile);
  const nestedIds = [
    ...(Array.isArray(userRecord.specialty_ids) ? userRecord.specialty_ids : []),
    ...(Array.isArray(profile.specialty_ids) ? profile.specialty_ids : []),
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  const ids = nestedIds.length > 0 ? nestedIds : specialties.map((item) => item.id);
  return Array.from(new Set(ids));
}

function mapToDentist(u: unknown): Dentist {
  const user = asRecord(u);
  const profile = asRecord(user.dentist_profile ?? user.dentistProfile);
  const specialties = extractSpecialties(u);

  return {
    id: typeof user.id === "number" ? user.id : Number(user.id) || undefined,
    name: typeof user.name === "string" ? user.name : "",
    email: typeof user.email === "string" ? user.email : "",
    phone: typeof user.phone === "string" ? user.phone : "",
    role: user.role === "dentist" ? "dentist" : undefined,
    status: toStatus(user.status),
    specialtyIds: extractSpecialtyIds(u, specialties),
    specialties,
    licenseNumber:
      typeof profile.license_number === "string"
        ? profile.license_number
        : typeof profile.licenseNumber === "string"
          ? profile.licenseNumber
          : typeof user.license_number === "string"
            ? user.license_number
            : null,
    color:
      typeof profile.color === "string"
        ? profile.color
        : typeof user.color === "string"
          ? user.color
          : null,
  };
}

function buildDentistPayload(dentist: Partial<Dentist>, includePassword = false) {
  const specialtyIds = Array.from(
    new Set((dentist.specialtyIds ?? []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))
  );

  const payload: Record<string, unknown> = {
    name: dentist.name,
    email: dentist.email,
    phone: dentist.phone,
    role: "dentist",
    license_number: dentist.licenseNumber ?? null,
    color: dentist.color ?? null,
    specialty_ids: specialtyIds,
    dentist_profile: {
      license_number: dentist.licenseNumber ?? null,
      color: dentist.color ?? null,
    },
  };

  if (typeof dentist.status === "boolean") {
    payload.status = dentist.status ? 1 : 0;
  }

  if (includePassword && dentist.password) {
    payload.password = dentist.password;
  }

  return payload;
}

export async function getDentistsByClinic(clinicId: number | string) {
  const { data } = await api.get(BASE(clinicId), {
    params: { role: "dentist" },
  });

  const list = normalizeList(data);
  const arr = Array.isArray(list) ? list : [];
  return arr.filter((u) => asRecord(u).role === "dentist").map(mapToDentist);
}

export async function createDentist(clinicId: number | string, dentist: Dentist) {
  const { data } = await api.post(BASE(clinicId), buildDentistPayload(dentist, true));
  return data;
}

export async function updateDentist(
  clinicId: number | string,
  userId: number | string,
  dentist: Partial<Dentist>
) {
  const { data } = await api.patch(`${BASE(clinicId)}/${userId}`, buildDentistPayload(dentist));
  return data;
}

export async function deleteDentist(clinicId: number | string, userId: number | string) {
  const { data } = await api.delete(`${BASE(clinicId)}/${userId}`);
  return data;
}
