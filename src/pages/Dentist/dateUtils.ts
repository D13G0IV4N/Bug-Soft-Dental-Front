function pad(value: number) {
  return String(value).padStart(2, "0");
}

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getDateTimeParts(value?: string): DateTimeParts | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: 0,
      minute: 0,
      second: 0,
    };
  }

  const dateTimeMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/
  );
  if (!dateTimeMatch) return null;

  const [, year, month, day, hour, minute, second] = dateTimeMatch;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? "0"),
  };
}

export function parseAppointmentDateTime(value?: string): Date | null {
  const parts = getDateTimeParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
}

export function formatDate(value?: string) {
  const parts = getDateTimeParts(value);
  if (!parts) return "-";
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}

export function formatTime(value?: string) {
  const parts = getDateTimeParts(value);
  if (!parts) return "-";
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatDateTime(value?: string) {
  const parts = getDateTimeParts(value);
  if (!parts) return "-";
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function toDateTimeLocal(value?: string) {
  const parts = getDateTimeParts(value);
  if (!parts) return "";
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function isSameLocalDay(date: Date, comparison: Date) {
  return (
    date.getFullYear() === comparison.getFullYear() &&
    date.getMonth() === comparison.getMonth() &&
    date.getDate() === comparison.getDate()
  );
}
