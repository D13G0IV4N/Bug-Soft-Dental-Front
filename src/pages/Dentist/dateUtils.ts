function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseAppointmentDateTime(value?: string): Date | null {
  if (!value || typeof value !== "string") return null;

  const normalized = value.trim().replace(" ", "T");

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const localLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localLike) {
    const [, year, month, day, hour, minute, second] = localLike;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? "0"),
      0
    );
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value?: string) {
  const parsed = parseAppointmentDateTime(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString();
}

export function formatTime(value?: string) {
  const parsed = parseAppointmentDateTime(value);
  if (!parsed) return "-";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value?: string) {
  const parsed = parseAppointmentDateTime(value);
  if (!parsed) return "-";
  return parsed.toLocaleString();
}

export function toDateTimeLocal(value?: string) {
  const parsed = parseAppointmentDateTime(value);
  if (!parsed) return "";
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function isSameLocalDay(date: Date, comparison: Date) {
  return (
    date.getFullYear() === comparison.getFullYear() &&
    date.getMonth() === comparison.getMonth() &&
    date.getDate() === comparison.getDate()
  );
}
