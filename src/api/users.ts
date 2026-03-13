import { api } from "./axios";

export type UserRole = "admin" | "receptionist" | "dentist" | "client";

export interface ClinicUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole | string;
  status?: boolean;
  dentistProfile?: {
    specialty?: string | null;
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

function normalizeList(res: any) {
  return res?.data?.data ?? res?.data ?? res ?? [];
}

function normalizeOne(res: any) {
  return res?.data?.data ?? res?.data ?? res;
}

function mapToClinicUser(user: any): ClinicUser {
  const profile = user?.dentist_profile ?? user?.dentistProfile ?? {};

  return {
    id: user?.id,
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: user?.role ?? "client",
    status: typeof user?.status === "boolean" ? user.status : Boolean(user?.status),
    dentistProfile: {
      specialty: profile?.specialty ?? user?.specialty ?? null,
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
