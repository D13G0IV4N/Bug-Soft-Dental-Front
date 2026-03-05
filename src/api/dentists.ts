import { api } from "./axios";

export interface Dentist {
  id?: number;
  name: string;
  email: string;
  password?: string; // requerido para crear
  phone?: string;
  status?: boolean; // UI boolean
  role?: "dentist";

  // extras
  specialty?: string | null;
  licenseNumber?: string | null;
  color?: string | null;
}

/**
 * Backend: dentistas = users dentro de clínica
 * GET/POST  /super/clinics/:clinicId/users
 * PATCH/DEL /super/clinics/:clinicId/users/:userId
 */
const BASE = (clinicId: number | string) => `/super/clinics/${clinicId}/users`;

function normalizeList(res: any) {
  return res?.data?.data ?? res?.data ?? res ?? [];
}

// Convierte respuesta del backend a nuestro Dentist
function mapToDentist(u: any): Dentist {
  const profile = u?.dentist_profile ?? u?.dentistProfile ?? {};
  return {
    id: u?.id,
    name: u?.name,
    email: u?.email,
    phone: u?.phone,
    role: u?.role,
    status: typeof u?.status === "boolean" ? u.status : !!u?.status,
    specialty: profile?.specialty ?? u?.specialty ?? null,
    licenseNumber: profile?.license_number ?? profile?.licenseNumber ?? u?.license_number ?? null,
    color: profile?.color ?? u?.color ?? null,
  };
}

/** LISTAR dentistas de la clínica */
export async function getDentistsByClinic(clinicId: number | string) {
  const { data } = await api.get(BASE(clinicId), {
    params: { role: "dentist" }, // si el back lo soporta
  });

  const list = normalizeList(data);
  const arr = Array.isArray(list) ? list : [];

  // por si el backend manda todos los users, filtramos
  const dentists = arr.filter((u) => u?.role === "dentist").map(mapToDentist);
  return dentists;
}

/** CREAR dentista */
export async function createDentist(clinicId: number | string, dentist: Dentist) {
  const payload: any = {
    name: dentist.name,
    email: dentist.email,
    password: dentist.password, // requerido
    role: "dentist",
    phone: dentist.phone,
    status: dentist.status ? 1 : 0,

    // por si el backend lo acepta directo:
    specialty: dentist.specialty ?? null,
    license_number: dentist.licenseNumber ?? null,
    color: dentist.color ?? null,

    // por si lo espera como perfil:
    dentist_profile: {
      specialty: dentist.specialty ?? null,
      license_number: dentist.licenseNumber ?? null,
      color: dentist.color ?? null,
    },
  };

  const { data } = await api.post(BASE(clinicId), payload);
  return data;
}

/** ACTUALIZAR dentista (PATCH, no PUT) */
export async function updateDentist(
  clinicId: number | string,
  userId: number | string,
  dentist: Partial<Dentist>
) {
  const payload: any = {
    name: dentist.name,
    email: dentist.email,
    phone: dentist.phone,
  };

  if (typeof dentist.status === "boolean") {
    payload.status = dentist.status ? 1 : 0;
  }

  // opcional
  if (dentist.password) payload.password = dentist.password;

  // extras
  if (dentist.specialty !== undefined) payload.specialty = dentist.specialty;
  if (dentist.licenseNumber !== undefined) payload.license_number = dentist.licenseNumber;
  if (dentist.color !== undefined) payload.color = dentist.color;

  payload.dentist_profile = {
    specialty: dentist.specialty ?? null,
    license_number: dentist.licenseNumber ?? null,
    color: dentist.color ?? null,
  };

  const { data } = await api.patch(`${BASE(clinicId)}/${userId}`, payload);
  return data;
}

/** ELIMINAR dentista */
export async function deleteDentist(clinicId: number | string, userId: number | string) {
  const { data } = await api.delete(`${BASE(clinicId)}/${userId}`);
  return data;
}
