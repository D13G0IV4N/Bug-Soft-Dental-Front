import { api } from "./axios";

export interface Dentist {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  status?: boolean;
}

const BASE = (clinicId: string | number) => `/super/clinics/${clinicId}/dentists`;

export async function getDentistsByClinic(clinicId: string | number) {
  const { data } = await api.get(BASE(clinicId));
  return data;
}

export async function createDentist(
  clinicId: string | number,
  dentist: Dentist
) {
  const { data } = await api.post(BASE(clinicId), dentist);
  return data;
}

export async function updateDentist(
  clinicId: string | number,
  dentistId: string | number,
  dentist: Partial<Dentist>
) {
  const { data } = await api.put(`${BASE(clinicId)}/${dentistId}`, dentist);
  return data;
}

export async function deleteDentist(clinicId: string | number, dentistId: string | number) {
  const { data } = await api.delete(`${BASE(clinicId)}/${dentistId}`);
  return data;
}
