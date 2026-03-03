import { api } from "./axios";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  token_type: string; // "Bearer"
  user: any; // luego lo tipamos bien
};

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post("/auth/login", payload);
  return data; // token, token_type y user
}

export async function me() {
  return api.get("/auth/me");
}

export async function logout() {
  return api.post("/auth/logout");
}