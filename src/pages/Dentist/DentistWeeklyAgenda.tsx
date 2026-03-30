import { useMemo, type CSSProperties, type KeyboardEvent } from "react";
import type { Appointment } from "../../api/appointments";
import { formatTime, parseAppointmentDateTime } from "./dateUtils";
import styles from "./dentist.module.css";

type WeeklyAgendaProps = {
  appointments: Appointment[];
  onView: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
};

type DayColumn = {
  key: string;
  shortLabel: string;
  fullLabel: string;
  date: Date;
};

type AgendaItem = {
  appointment: Appointment;
  date: Date;
  timeKey: string;
  minutesOffset: number;
};

const DAY_NAMES_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function startOfWeek(currentDate: Date) {
  const date = new Date(currentDate);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildDayColumns(weekStart: Date): DayColumn[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      shortLabel: DAY_NAMES_SHORT[index],
      fullLabel: DAY_NAMES_FULL[index],
      date,
    };
  });
}

function toTimeKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

function buildTimeSlots(appointments: AgendaItem[]) {
  const defaultStart = 8;
  const defaultEnd = 18;
  const absoluteStart = 6;
  const absoluteEnd = 21;

  const hours = appointments.map((item) => item.date.getHours());
  const minHour = hours.length
    ? Math.max(absoluteStart, Math.min(...hours) - 1)
    : defaultStart;
  const maxHour = hours.length
    ? Math.min(absoluteEnd, Math.max(...hours) + 1)
    : defaultEnd;

  return Array.from({ length: maxHour - minHour + 1 }, (_, index) => {
    const hour = minHour + index;
    return `${String(hour).padStart(2, "0")}:00`;
  });
}

function statusLabel(status?: string) {
  if (!status) return "Programada";
  return status.replace("_", " ");
}

function statusClass(status?: string) {
  const key = (status ?? "scheduled").toLowerCase();
  if (key === "completed") return styles.statusCompleted;
  if (key === "confirmed") return styles.statusConfirmed;
  if (key === "pending") return styles.statusPending;
  if (key === "no_show") return styles.statusNoShow;
  if (key === "cancelled") return styles.statusCancelled;
  if (key === "canceled") return styles.statusCanceled;
  return styles.statusScheduled;
}

function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, onView: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onView();
  }
}

function normalizeHexColor(color: string) {
  const value = color.trim();
  const shortHexMatch = value.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  const longHexMatch = value.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  return longHexMatch ? `#${longHexMatch[1].toUpperCase()}` : "";
}

function toRgb(hex: string) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return { red, green, blue };
}

function resolveDentistColor(appointment: Appointment) {
  const candidate = appointment.dentist_color || appointment.dentist?.color;
  if (!candidate) return "";
  if (typeof CSS !== "undefined" && CSS.supports("color", candidate.trim())) {
    return candidate.trim();
  }
  return "";
}

function buildDentistAccentStyle(appointment: Appointment): CSSProperties | undefined {
  const color = resolveDentistColor(appointment);
  if (!color) return undefined;

  const rgb = toRgb(color);
  const softColor = rgb ? `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 0.13)` : "rgba(11, 117, 152, 0.1)";
  const borderColor = rgb ? `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 0.45)` : "rgba(11, 117, 152, 0.35)";

  return {
    "--dentist-accent": color,
    "--dentist-accent-soft": softColor,
    "--dentist-accent-border": borderColor,
  } as CSSProperties;
}

export default function DentistWeeklyAgenda({ appointments, onView, onEdit }: WeeklyAgendaProps) {
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekDays = useMemo(() => buildDayColumns(weekStart), [weekStart]);

  const weekAppointments = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);

    return appointments
      .map((appointment) => {
        const date = parseAppointmentDateTime(appointment.start_at);
        if (!date) return null;
        if (date < weekStart || date >= weekEnd) return null;
        return {
          appointment,
          date,
          timeKey: toTimeKey(date),
          minutesOffset: date.getMinutes(),
        } satisfies AgendaItem;
      })
      .filter((item): item is AgendaItem => Boolean(item));
  }, [appointments, weekStart]);

  const timeSlots = useMemo(() => buildTimeSlots(weekAppointments), [weekAppointments]);

  const cellMap = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();

    for (const item of weekAppointments) {
      const dayKey = `${item.date.getFullYear()}-${item.date.getMonth()}-${item.date.getDate()}`;
      const key = `${dayKey}-${item.timeKey}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }

    map.forEach((list) => list.sort((a, b) => a.minutesOffset - b.minutesOffset));

    return map;
  }, [weekAppointments]);

  return (
    <section className={styles.weekAgendaCard}>
      <header className={styles.weekAgendaHeader}>
        <div>
          <p className={styles.weekAgendaTag}>Vista principal</p>
          <h3 className={styles.weekAgendaTitle}>Agenda semanal clínica</h3>
        </div>
        <p className={styles.weekAgendaMeta}>
          {weekStart.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} -{" "}
          {addDays(weekStart, 6).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </header>

      <div className={styles.weekAgendaDesktopWrap}>
        <div className={styles.weekAgendaDesktop}>
          <div className={styles.agendaGrid}>
            <div className={`${styles.agendaCell} ${styles.agendaCorner}`} />
            {weekDays.map((day) => {
              const isToday = isSameDay(day.date, new Date());
              return (
                <div key={day.key} className={`${styles.agendaCell} ${styles.agendaDayHeader}`.trim()}>
                  <p className={styles.agendaDayName}>{day.shortLabel}</p>
                  <p className={`${styles.agendaDayDate} ${isToday ? styles.agendaDayDateToday : ""}`.trim()}>
                    {day.date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                  </p>
                </div>
              );
            })}

            {timeSlots.map((time) => (
              <div key={time} className={styles.agendaRowGroup}>
                <div key={`${time}-time`} className={`${styles.agendaCell} ${styles.agendaTimeCell}`}>
                  {time}
                </div>

                {weekDays.map((day) => {
                  const key = `${day.key}-${time}`;
                  const appointmentsAtTime = cellMap.get(key) ?? [];

                  return (
                    <div key={key} className={`${styles.agendaCell} ${styles.agendaDataCell}`}>
                      {appointmentsAtTime.length > 0 ? (
                        <div className={styles.agendaStack}>
                          {appointmentsAtTime.map(({ appointment, date }) => (
                            <article
                              key={`${appointment.id}-${date.toISOString()}`}
                              className={`${styles.agendaAppointmentCard} ${styles.agendaAppointmentDentistAccent} ${statusClass(appointment.status)}`.trim()}
                              style={buildDentistAccentStyle(appointment)}
                              role="button"
                              tabIndex={0}
                              onClick={() => onView(appointment)}
                              onKeyDown={(event) => handleCardKeyDown(event, () => onView(appointment))}
                            >
                              <div className={styles.agendaAppointmentHead}>
                                <p className={styles.agendaAppointmentTime}>{formatTime(appointment.start_at)}</p>
                                <span className={`${styles.statusPill} ${statusClass(appointment.status)}`.trim()}>
                                  {statusLabel(appointment.status)}
                                </span>
                              </div>
                              <p className={styles.agendaAppointmentPatient}>
                                {appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`}
                              </p>
                              <p className={styles.agendaAppointmentService}>
                                {appointment.service?.name || appointment.service_name || `Servicio #${appointment.service_id}`}
                              </p>
                              <p className={styles.agendaAppointmentDentist}>
                                <span className={styles.agendaDentistDot} />
                                {appointment.dentist?.name || appointment.dentist_name || `Dentista #${appointment.dentist_user_id}`}
                              </p>
                              <button
                                type="button"
                                className={styles.agendaEditAction}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEdit(appointment);
                                }}
                              >
                                Editar
                              </button>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.agendaSlotEmpty} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.weekAgendaMobile}>
        {weekDays.map((day) => {
          const appointmentsOfDay = weekAppointments
            .filter((item) => isSameDay(item.date, day.date))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

          return (
            <section key={day.key} className={styles.mobileDayCard}>
              <header className={styles.mobileDayHeader}>
                <p>{day.fullLabel}</p>
                <span>{day.date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>
              </header>

              {appointmentsOfDay.length === 0 ? (
                <p className={styles.mobileDayEmpty}>Sin citas</p>
              ) : (
                <div className={styles.mobileDayAppointments}>
                  {appointmentsOfDay.map(({ appointment, date }) => (
                    <article
                      key={`${appointment.id}-${date.toISOString()}-mobile`}
                      className={`${styles.mobileAppointmentCard} ${styles.agendaAppointmentDentistAccent}`.trim()}
                      style={buildDentistAccentStyle(appointment)}
                    >
                      <div>
                        <p className={styles.agendaAppointmentPatient}>
                          {appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`}
                        </p>
                        <p className={styles.agendaAppointmentService}>
                          {appointment.service?.name || appointment.service_name || `Servicio #${appointment.service_id}`}
                        </p>
                        <p className={styles.agendaAppointmentDentist}>
                          <span className={styles.agendaDentistDot} />
                          {appointment.dentist?.name || appointment.dentist_name || `Dentista #${appointment.dentist_user_id}`}
                        </p>
                      </div>

                      <div className={styles.mobileAppointmentMeta}>
                        <span>{formatTime(appointment.start_at)}</span>
                        <span className={`${styles.statusPill} ${statusClass(appointment.status)}`.trim()}>{statusLabel(appointment.status)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
