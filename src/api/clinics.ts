import { api } from "./axios";

// Tipo de clínica que coincide con los campos aceptados por la API
export interface Clinic {
  id?: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: boolean;
}

// Datos del administrador que se crea junto con la clínica
export interface ClinicAdmin {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export async function getPublicClinics() {
  const { data } = await api.get("/public/clinics");
  return data;
}

export async function getSuperClinics() {
  const { data } = await api.get("/super/clinics");
  return data;
}

export async function createClinic(payload: { clinic: Clinic; admin: ClinicAdmin }) {
  const { data } = await api.post("/super/clinics", payload);
  return data;
}

export async function updateClinic(id: number, clinic: Partial<Clinic>) {
  const { data } = await api.put(`/super/clinics/${id}`, clinic);
  return data;
}

export async function deleteClinic(id: number) {
  const { data } = await api.delete(`/super/clinics/${id}`);
  return data;
}
