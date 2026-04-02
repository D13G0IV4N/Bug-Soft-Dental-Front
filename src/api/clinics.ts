import { api } from "./axios";

// Tipo de clínica que coincide con los campos aceptados por la API
export interface Clinic {
  id?: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PublicClinic = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

// Datos del administrador que se crea junto con la clínica
export interface ClinicAdmin {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

function normalizeData(response: any) {
  return response?.data?.data ?? response?.data ?? response;
}

export function extractPublicClinics(response: any): PublicClinic[] {
  const payload = normalizeData(response);
  const rows = Array.isArray(payload) ? payload : [];

  const clean = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  return rows
    .map((clinic): PublicClinic | null => {
      if (clinic?.status === false) return null;

      const id = clinic?.id;
      const name = clean(clinic?.name);
      const email = clean(clinic?.email);
      const phone = clean(clinic?.phone);
      const address = clean(clinic?.address);

      if (id === undefined || id === null || !name) return null;

      return {
        id: String(id),
        name,
        email,
        phone,
        address,
      };
    })
    .filter((clinic): clinic is PublicClinic => clinic !== null);
}

export async function getPublicClinics() {
  const { data } = await api.get("/public/clinics");
  return data;
}

export async function getSuperClinics() {
  const { data } = await api.get("/super/clinics");
  return normalizeData(data);
}

export async function getSuperClinicById(id: number | string) {
  const { data } = await api.get(`/super/clinics/${id}`);
  return normalizeData(data);
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
