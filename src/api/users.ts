import { api } from "./axios";

export type UserRole = "admin" | "receptionist" | "dentist" | "client";

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  status?: boolean;
}

export async function getUsers() {
  const { data } = await api.get("/admin/users");
  return data;
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post("/admin/users", payload);
  return data;
}