import { api } from "./axios";

export interface PatientClinic {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PatientClinicService {
  id: number;
  name: string;
  description?: string | null;
  specialty?: string | null;
  specialty_id?: number;
  duration_minutes?: number | null;
  price?: number | null;
  status?: boolean;
}

export interface PatientClinicDentist {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string | null;
  dentist_profile?: {
    specialties?: Array<{ id?: number; name?: string }>;
    specialty?: string | null;
    license_number?: string | null;
    color?: string | null;
  };
}

export interface PatientClinicDetails {
  clinic: PatientClinic;
  services: PatientClinicService[];
  dentists: PatientClinicDentist[];
}

function normalizeList(payload: unknown): unknown[] {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const list = nested.data ?? source.data ?? payload;
  return Array.isArray(list) ? list : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeOne(payload: unknown): Record<string, unknown> {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const deep = asRecord(nested.data);
  return asRecord(deep.id || deep.clinic || deep.services || deep.dentists ? deep : nested.data ?? source.data ?? payload);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toNullableNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  return toNumber(value);
}

function toStatus(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "active";
  }
  return undefined;
}

function mapService(raw: unknown): PatientClinicService | null {
  const source = asRecord(raw);
  const id = toNumber(source.id);
  const name = toText(source.name);

  if (!id || !name) return null;

  const specialtyRecord = asRecord(source.specialty);
  const specialtyName =
    toText(source.specialty_name) ||
    toText(source.specialty) ||
    toText(specialtyRecord.name) ||
    undefined;

  return {
    id,
    name,
    description: toText(source.description) || null,
    specialty: specialtyName ?? null,
    specialty_id: toNumber(source.specialty_id),
    duration_minutes: toNullableNumber(source.duration_minutes),
    price: toNullableNumber(source.price),
    status: toStatus(source.status),
  };
}

function mapDentist(raw: unknown): PatientClinicDentist | null {
  const source = asRecord(raw);
  const id = toNumber(source.id);
  const name = toText(source.name);
  if (id === undefined || id <= 0 || !name) return null;

  const profile = asRecord(source.dentist_profile ?? source.dentistProfile);
  const specialtiesFromProfile = Array.isArray(profile.specialties)
    ? profile.specialties
        .map((item) => {
          const row = asRecord(item);
          const specialtyName = toText(row.name);
          if (!specialtyName) return null;
          const specialtyId = toNumber(row.id);
          return specialtyId === undefined ? { name: specialtyName } : { id: specialtyId, name: specialtyName };
        })
        .filter((item): item is { id?: number; name: string } => Boolean(item))
    : undefined;

  return {
    id,
    name,
    email: toText(source.email) || undefined,
    phone: toText(source.phone) || undefined,
    specialty: toText(source.specialty) || toText(profile.specialty) || null,
    dentist_profile: {
      specialties: specialtiesFromProfile,
      specialty: toText(profile.specialty) || null,
      license_number: toText(profile.license_number ?? profile.licenseNumber) || null,
      color: toText(profile.color) || null,
    },
  };
}

export async function getPatientClinicDetails() {
  const { data } = await api.get("/pacient/clinic");
  const payload = normalizeOne(data);

  const clinicRecord = asRecord(payload.clinic);
  const servicesRaw = Array.isArray(payload.services) ? payload.services : [];
  const dentistsRaw = Array.isArray(payload.dentists) ? payload.dentists : [];

  return {
    clinic: {
      id: toNumber(clinicRecord.id),
      name: toText(clinicRecord.name) || "Clínica dental",
      email: toText(clinicRecord.email) || undefined,
      phone: toText(clinicRecord.phone) || undefined,
      address: toText(clinicRecord.address) || undefined,
    },
    services: servicesRaw.map(mapService).filter((service): service is PatientClinicService => Boolean(service)),
    dentists: dentistsRaw.map(mapDentist).filter((dentist): dentist is PatientClinicDentist => Boolean(dentist)),
  } satisfies PatientClinicDetails;
}

export async function getPatientServiceDentists(serviceId: number | string) {
  const { data } = await api.get(`/pacient/services/${serviceId}/dentists`);
  return normalizeList(data).map(mapDentist).filter((dentist): dentist is PatientClinicDentist => Boolean(dentist));
}
