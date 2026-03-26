export type AppRole = "super_admin" | "admin" | "receptionist" | "dentist" | "client" | string;

export interface StoredUser {
  id?: number;
  name?: string;
  email?: string;
  role?: AppRole;
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
  if (role === "receptionist") return "/admin/appointments";
  if (role === "dentist") return "/dentist";
  return "/login";
}
