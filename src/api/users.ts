import { api } from "./axios";
import type { Specialty } from "./specialties";

export type UserRole = "admin" | "receptionist" | "dentist" | "client";

export interface ClinicUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole | string;
  status?: boolean;
  dentistProfile?: {
    specialtyIds: number[];
    specialties: Specialty[];
    licenseNumber?: string | null;
    color?: string | null;
  };
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  status?: boolean;
}

export interface UpdateClinicUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: UserRole | string;
  status?: boolean;
}

function normalizeList(res: unknown) {
  return res?.data?.data ?? res?.data ?? res ?? [];
}

function normalizeOne(res: unknown) {
  return res?.data?.data ?? res?.data ?? res;
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

function mapToClinicUser(user: unknown): ClinicUser {
  const profile = user?.dentist_profile ?? user?.dentistProfile ?? {};
  const specialties = [
    ...(Array.isArray(user?.specialties) ? user.specialties : []),
    ...(Array.isArray(profile?.specialties) ? profile.specialties : []),
  ]
    .map(toSpecialty)
    .filter((item): item is Specialty => Boolean(item));

  const specialtyIds = [
    ...(Array.isArray(user?.specialty_ids) ? user.specialty_ids : []),
    ...(Array.isArray(profile?.specialty_ids) ? profile.specialty_ids : []),
    ...specialties.map((item) => item.id),
  ]
    .map((value) => Number(value))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

  return {
    id: user?.id,
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: user?.role ?? "client",
    status: toStatus(user?.status),
    dentistProfile: {
      specialtyIds,
      specialties,
      licenseNumber:
        profile?.license_number ?? profile?.licenseNumber ?? user?.license_number ?? null,
      color: profile?.color ?? user?.color ?? null,
    },
  };
}

const clinicUsersBase = (clinicId: number | string) => `/super/clinics/${clinicId}/users`;

export async function getUsers() {
  const { data } = await api.get("/admin/users");
  return data;
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post("/admin/users", payload);
  return data;
}

export async function getClinicUsers(clinicId: number | string) {
  const { data } = await api.get(clinicUsersBase(clinicId));
  const list = normalizeList(data);
  return (Array.isArray(list) ? list : []).map(mapToClinicUser);
}

export async function createClinicUser(clinicId: number | string, payload: CreateUserPayload) {
  const body = {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    role: payload.role,
    status: payload.status === false ? 0 : 1,
  };

  const { data } = await api.post(clinicUsersBase(clinicId), body);
  return normalizeOne(data);
}

export async function updateClinicUser(
  clinicId: number | string,
  userId: number | string,
  payload: UpdateClinicUserPayload
) {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
  };

  if (payload.password) {
    body.password = payload.password;
  }

  if (typeof payload.status === "boolean") {
    body.status = payload.status ? 1 : 0;
  }

  const { data } = await api.patch(`${clinicUsersBase(clinicId)}/${userId}`, body);
  return normalizeOne(data);
}

export async function deleteClinicUser(clinicId: number | string, userId: number | string) {
  const { data } = await api.delete(`${clinicUsersBase(clinicId)}/${userId}`);
  return data;
}
