import { api } from "./axios";

export type Clinic = {
  id: number;
  name: string;
  address?: string;
  phone?: string;
};

export async function getPublicClinics() {
  const { data } = await api.get("/public/clinics");
  return data; // luego lo tipamos según la respuesta real
}