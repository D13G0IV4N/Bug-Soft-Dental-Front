import { api } from "./axios";

export interface Specialty {
  id: number;
  name: string;
  description?: string | null;
  status?: boolean;
}

function normalizeList<T>(payload: unknown): T[] {
  const source = payload as { data?: unknown };
  const nested = source?.data as { data?: unknown } | undefined;
  const list = nested?.data ?? source?.data ?? payload;
  return Array.isArray(list) ? (list as T[]) : [];
}

function toStatus(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    return normalized === "1" || normalized === "true" || normalized === "active";
  }
  return true;
}

function mapSpecialty(raw: unknown): Specialty {
  return {
    id: Number(raw?.id ?? 0),
    name: raw?.name ?? raw?.specialty ?? "",
    description: raw?.description ?? null,
    status: toStatus(raw?.status),
  };
}

export async function getSpecialties() {
  const { data } = await api.get("/specialties");
  return normalizeList<unknown>(data)
    .map(mapSpecialty)
    .filter((specialty) => specialty.id > 0 && specialty.name)
    .filter((specialty) => specialty.status !== false);
}
