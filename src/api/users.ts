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

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function normalizeList(res: unknown) {
  const root = asRecord(res);
  const nested = asRecord(root.data);
  return nested.data ?? root.data ?? res ?? [];
}

function normalizeOne(res: unknown) {
  const root = asRecord(res);
  const nested = asRecord(root.data);
  return nested.data ?? root.data ?? res;
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

function mapToClinicUser(user: unknown): ClinicUser {
  const userRecord = asRecord(user);
  const profile = asRecord(userRecord.dentist_profile ?? userRecord.dentistProfile);
  const specialties = [
    ...(Array.isArray(userRecord.specialties) ? userRecord.specialties : []),
    ...(Array.isArray(profile.specialties) ? profile.specialties : []),
  ]
    .map(toSpecialty)
    .filter((item): item is Specialty => Boolean(item));

  const specialtyIds = [
    ...(Array.isArray(userRecord.specialty_ids) ? userRecord.specialty_ids : []),
    ...(Array.isArray(profile.specialty_ids) ? profile.specialty_ids : []),
    ...specialties.map((item) => item.id),
  ]
    .map((value) => Number(value))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

  return {
    id: typeof userRecord.id === "number" ? userRecord.id : Number(userRecord.id) || 0,
    name: typeof userRecord.name === "string" ? userRecord.name : "",
    email: typeof userRecord.email === "string" ? userRecord.email : "",
    phone: typeof userRecord.phone === "string" ? userRecord.phone : "",
    role: typeof userRecord.role === "string" ? userRecord.role : "client",
    status: toStatus(userRecord.status),
    dentistProfile: {
      specialtyIds,
      specialties,
      licenseNumber:
        typeof profile.license_number === "string"
          ? profile.license_number
          : typeof profile.licenseNumber === "string"
            ? profile.licenseNumber
            : typeof userRecord.license_number === "string"
              ? userRecord.license_number
              : null,
      color:
        typeof profile.color === "string"
          ? profile.color
          : typeof userRecord.color === "string"
            ? userRecord.color
            : null,
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
