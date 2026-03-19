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

function normalizeList(res: unknown) {
  return res?.data?.data ?? res?.data ?? res ?? [];
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
  if (!source || typeof source !== "object") return null;

  const id = Number(source.id ?? source.specialty_id ?? 0);
  const name = source.name ?? source.specialty ?? source.title ?? "";

  if (!id || !name) return null;

  return {
    id,
    name,
    description: source.description ?? null,
    status: toStatus(source.status),
  };
}

function extractSpecialties(user: unknown): Specialty[] {
  const profile = user?.dentist_profile ?? user?.dentistProfile ?? {};
  const candidates = [
    ...(Array.isArray(user?.specialties) ? user.specialties : []),
    ...(Array.isArray(profile?.specialties) ? profile.specialties : []),
    ...(Array.isArray(user?.dentist_specialties) ? user.dentist_specialties : []),
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
  const profile = user?.dentist_profile ?? user?.dentistProfile ?? {};
  const nestedIds = [
    ...(Array.isArray(user?.specialty_ids) ? user.specialty_ids : []),
    ...(Array.isArray(profile?.specialty_ids) ? profile.specialty_ids : []),
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  const ids = nestedIds.length > 0 ? nestedIds : specialties.map((item) => item.id);
  return Array.from(new Set(ids));
}

function mapToDentist(u: unknown): Dentist {
  const profile = u?.dentist_profile ?? u?.dentistProfile ?? {};
  const specialties = extractSpecialties(u);

  return {
    id: u?.id,
    name: u?.name ?? "",
    email: u?.email ?? "",
    phone: u?.phone ?? "",
    role: u?.role,
    status: toStatus(u?.status),
    specialtyIds: extractSpecialtyIds(u, specialties),
    specialties,
    licenseNumber: profile?.license_number ?? profile?.licenseNumber ?? u?.license_number ?? null,
    color: profile?.color ?? u?.color ?? null,
  };
}

function buildDentistPayload(dentist: Partial<Dentist>, includePassword = false) {
  const payload: Record<string, unknown> = {
    name: dentist.name,
    email: dentist.email,
    phone: dentist.phone,
    role: "dentist",
    license_number: dentist.licenseNumber ?? null,
    color: dentist.color ?? null,
    specialty_ids: dentist.specialtyIds ?? [],
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
  return arr.filter((u) => u?.role === "dentist").map(mapToDentist);
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
