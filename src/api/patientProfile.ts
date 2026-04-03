import { api } from "./axios";
import { me } from "./auth";

export interface PatientProfileData {
  id?: number;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
  alergias: string;
  notas: string;
  clinica: string;
  rol: string;
}

export interface UpdatePatientProfilePayload {
  nombre: string;
  telefono: string;
  direccion: string;
  alergias: string;
  notas: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

type ExportResult =
  | {
      kind: "pdf";
      blob: Blob;
      filename: string;
    }
  | {
      kind: "json";
      data: unknown;
    };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeOne(payload: unknown): Record<string, unknown> {
  const source = asRecord(payload);
  const nested = asRecord(source.data);
  const deep = asRecord(nested.data);
  return asRecord(deep.id ? deep : nested.data ?? source.data ?? payload);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function decodeFilename(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getFilenameFromDisposition(disposition: string | undefined) {
  if (!disposition) return "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeFilename(utf8Match[1].replace(/["']/g, ""));

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1].trim();
  return "";
}

function toBlobFromBase64(base64: string, mimeType: string) {
  const normalized = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function resolveRole(rawRole: unknown): string {
  const normalized = toText(rawRole).toLowerCase();
  if (normalized === "pacient" || normalized === "client") return "Paciente";
  if (normalized === "admin") return "Administrador";
  if (normalized === "dentist") return "Odontólogo";
  if (normalized === "receptionist") return "Recepción";
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Paciente";
}

function resolveClinicName(record: Record<string, unknown>): string {
  const profile = asRecord(record.profile);
  const clinic = asRecord(record.clinic);

  return (
    toText(record.clinic_name) ||
    toText(record.clinicName) ||
    toText(profile.clinic_name) ||
    toText(asRecord(profile.clinic).name) ||
    toText(clinic.name) ||
    "Clínica dental"
  );
}

function normalizePatientProfile(record: Record<string, unknown>): PatientProfileData {
  const profile = asRecord(record.profile);

  return {
    id: typeof record.id === "number" ? record.id : undefined,
    nombre: toText(record.name),
    telefono: toText(record.phone),
    correo: toText(record.email),
    direccion: toText(profile.address),
    alergias: toText(profile.allergies),
    notas: toText(profile.notes),
    clinica: resolveClinicName(record),
    rol: resolveRole(record.role),
  };
}

export async function getPatientProfile() {
  try {
    const { data } = await api.get("/pacient/profile");
    return normalizePatientProfile(normalizeOne(data));
  } catch {
    const response = await me();
    return normalizePatientProfile(normalizeOne(response.data));
  }
}

async function patchPatientMe(payload: Record<string, unknown>) {
  const { data } = await api.patch("/auth/me", payload);
  return normalizeOne(data);
}

export async function updatePatientProfile(payload: UpdatePatientProfilePayload) {
  const body = {
    name: payload.nombre.trim(),
    phone: payload.telefono.trim(),
    profile: {
      address: payload.direccion.trim(),
      allergies: payload.alergias.trim(),
      notes: payload.notas.trim(),
    },
  };

  return normalizePatientProfile(await patchPatientMe(body));
}

export async function updatePatientPassword(payload: ChangePasswordPayload) {
  const body = {
    current_password: payload.current_password,
    password: payload.password,
    password_confirmation: payload.password_confirmation,
  };

  await patchPatientMe(body);
}

async function tryPatientAppointmentSummaryExport(path: string): Promise<ExportResult> {
  const response = await api.get(path, {
    responseType: "blob",
    headers: {
      Accept: "application/pdf, application/json",
    },
  });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename = getFilenameFromDisposition(disposition) || `resumen-citas-${new Date().toISOString().slice(0, 10)}.pdf`;
  const contentType = toText(response.headers["content-type"]).toLowerCase();

  if (contentType.includes("application/pdf") || response.data.type === "application/pdf") {
    return { kind: "pdf", blob: response.data, filename };
  }

  const text = await response.data.text();
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const pdfBase64 = toText(parsed.pdf_base64 ?? parsed.file_base64 ?? parsed.base64_pdf ?? parsed.pdf);

  if (pdfBase64) {
    return {
      kind: "pdf",
      blob: toBlobFromBase64(pdfBase64, "application/pdf"),
      filename,
    };
  }

  return {
    kind: "json",
    data: parsed,
  };
}

export async function exportPatientAppointmentSummary() {
  const candidatePaths = ["/pacient/appointments/export", "/pacient/appointments/history/export"];
  let lastError: unknown;

  for (const path of candidatePaths) {
    try {
      return await tryPatientAppointmentSummaryExport(path);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
