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

function mapUser(raw: unknown): AdminClinicUser {
  const profile = raw?.dentist_profile ?? raw?.dentistProfile ?? {};
  const specialties = [
    ...(Array.isArray(raw?.specialties) ? raw.specialties : []),
    ...(Array.isArray(profile?.specialties) ? profile.specialties : []),
    ...(Array.isArray(raw?.dentist_specialties) ? raw.dentist_specialties : []),
  ]
    .map(toSpecialty)
    .filter((item): item is Specialty => Boolean(item));

  const specialtyIds = [
    ...(Array.isArray(raw?.specialty_ids) ? raw.specialty_ids : []),
    ...(Array.isArray(profile?.specialty_ids) ? profile.specialty_ids : []),
    ...specialties.map((item) => item.id),
  ]
    .map((value) => Number(value))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

  return {
    id: raw.id,
    name: raw.name ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    role: raw.role ?? "receptionist",
    status: toStatus(raw.status),
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
