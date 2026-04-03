import { api } from "./axios";
import type { Specialty } from "./specialties";

export interface AdminClinic {
  id?: number;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminClinicUser {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: boolean;
  password?: string;
  specialtyIds?: number[];
  specialties?: Specialty[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function normalizeOne<T>(payload: unknown): T {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  return (nested.data ?? source.data ?? payload) as T;
}

function normalizeList<T>(payload: unknown): T[] {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const list = nested.data ?? source.data ?? payload;
  return Array.isArray(list) ? (list as T[]) : [];
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

function mapUser(raw: unknown): AdminClinicUser {
  const user = asRecord(raw);
  const profile = asRecord(user.dentist_profile ?? user.dentistProfile);
  const specialties = [
    ...(Array.isArray(user.specialties) ? user.specialties : []),
    ...(Array.isArray(profile.specialties) ? profile.specialties : []),
    ...(Array.isArray(user.dentist_specialties) ? user.dentist_specialties : []),
  ]
    .map(toSpecialty)
    .filter((item): item is Specialty => Boolean(item));

  const specialtyIds = [
    ...(Array.isArray(user.specialty_ids) ? user.specialty_ids : []),
    ...(Array.isArray(profile.specialty_ids) ? profile.specialty_ids : []),
    ...specialties.map((item) => item.id),
  ]
    .map((value) => Number(value))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

  return {
    id: typeof user.id === "number" ? user.id : Number(user.id) || undefined,
    name: typeof user.name === "string" ? user.name : "",
    email: typeof user.email === "string" ? user.email : "",
    phone: typeof user.phone === "string" ? user.phone : "",
    role: typeof user.role === "string" ? user.role : "receptionist",
    status: toStatus(user.status),
    specialtyIds,
    specialties,
  };
}

export async function getAdminClinic() {
  const { data } = await api.get("/admin/clinic");
  return normalizeOne<AdminClinic>(data);
}

export async function updateAdminClinic(payload: Partial<AdminClinic>, partial = true) {
  const method = partial ? "patch" : "put";
  const { data } = await api.request({
    url: "/admin/clinic",
    method,
    data: payload,
  });
  return normalizeOne<AdminClinic>(data);
}

export async function getAdminUsers() {
  const { data } = await api.get("/admin/users");
  return normalizeList<AdminClinicUser>(data).map(mapUser);
}

export async function getAdminDentists() {
  const users = await getAdminUsers();
  return users.filter((user) => user.role === "dentist");
}

export async function getAdminUserById(userId: number | string) {
  const { data } = await api.get(`/admin/users/${userId}`);
  return mapUser(normalizeOne<AdminClinicUser>(data));
}

export async function createAdminUser(payload: AdminClinicUser) {
  const { data } = await api.post("/admin/users", {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    role: payload.role,
    status: payload.status === false ? 0 : 1,
    specialty_ids: payload.specialtyIds ?? [],
  });
  return normalizeOne<AdminClinicUser>(data);
}

export async function updateAdminUser(userId: number | string, payload: Partial<AdminClinicUser>) {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
  };

  if (payload.password) body.password = payload.password;
  if (typeof payload.status === "boolean") body.status = payload.status ? 1 : 0;
  if (payload.specialtyIds) body.specialty_ids = payload.specialtyIds;

  const { data } = await api.patch(`/admin/users/${userId}`, body);
  return normalizeOne<AdminClinicUser>(data);
}

export async function deleteAdminUser(userId: number | string) {
  const { data } = await api.delete(`/admin/users/${userId}`);
  return data;
}

export async function getReceptionists() {
  const { data } = await api.get("/admin/receptionists");
  return normalizeList<AdminClinicUser>(data).map((item) => mapUser({ ...item, role: "receptionist" }));
}

export async function getReceptionistById(id: number | string) {
  const { data } = await api.get(`/admin/receptionists/${id}`);
  return mapUser({ ...normalizeOne<AdminClinicUser>(data), role: "receptionist" });
}

export async function createReceptionist(payload: Omit<AdminClinicUser, "role">) {
  const { data } = await api.post("/admin/receptionists", {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    status: payload.status === false ? 0 : 1,
  });
  return normalizeOne<AdminClinicUser>(data);
}

export async function updateReceptionist(id: number | string, payload: Partial<AdminClinicUser>) {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
  };

  if (payload.password) body.password = payload.password;
  if (typeof payload.status === "boolean") body.status = payload.status ? 1 : 0;

  const { data } = await api.patch(`/admin/receptionists/${id}`, body);
  return normalizeOne<AdminClinicUser>(data);
}

export async function deleteReceptionist(id: number | string) {
  const { data } = await api.delete(`/admin/receptionists/${id}`);
  return data;
}
