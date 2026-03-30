export type AppRole = "super_admin" | "admin" | "receptionist" | "dentist" | "client" | string;

export interface StoredUser {
  id?: number;
  name?: string;
  email?: string;
  role?: AppRole;
  clinic_name?: string;
  clinicName?: string;
  clinic?: {
    name?: string;
    nombre?: string;
  };
  dentist_profile?: {
    clinic_name?: string;
    clinic?: {
      name?: string;
      nombre?: string;
    };
  };
  dentistProfile?: {
    clinic_name?: string;
    clinicName?: string;
    clinic?: {
      name?: string;
      nombre?: string;
    };
  };
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : null;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveClinicName(source: unknown): string {
  const record = asRecord(source);
  if (!record) return "";

  const dentistProfile = asRecord(record.dentist_profile) ?? asRecord(record.dentistProfile);
  const clinic = asRecord(record.clinic);
  const profile = asRecord(record.profile);
  const tenant = asRecord(record.tenant);
  const nestedUser = asRecord(record.user);

  const candidates: unknown[] = [
    record.clinic_name,
    record.clinicName,
    clinic?.name,
    clinic?.nombre,
    tenant?.name,
    tenant?.nombre,
    profile?.clinic_name,
    asRecord(profile?.clinic)?.name,
    asRecord(profile?.clinic)?.nombre,
    dentistProfile?.clinic_name,
    dentistProfile?.clinicName,
    asRecord(dentistProfile?.clinic)?.name,
    asRecord(dentistProfile?.clinic)?.nombre,
  ];

  for (const value of candidates) {
    const text = toText(value);
    if (text) return text;
  }

  return nestedUser ? resolveClinicName(nestedUser) : "";
}

export function getStoredUser(): StoredUser | null {
  const userRaw = localStorage.getItem("user");
  if (!userRaw) return null;

  try {
    const user = JSON.parse(userRaw) as StoredUser;
    return typeof user === "object" && user !== null ? user : null;
  } catch {
    return null;
  }
}

export function getStoredRole(): AppRole | null {
  return getStoredUser()?.role ?? null;
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem("authToken"));
}

export function getPostLoginRoute(role: AppRole | null): string {
  if (role === "super_admin") return "/clinics";
  if (role === "admin") return "/admin";
  if (role === "receptionist") return "/receptionist";
  if (role === "dentist") return "/dentist";
  return "/login";
}
