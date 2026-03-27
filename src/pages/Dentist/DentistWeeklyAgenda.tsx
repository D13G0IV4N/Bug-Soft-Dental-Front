import { useMemo } from "react";
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
  const defaultStart = 7;
  const defaultEnd = 20;

  const hours = appointments.map((item) => item.date.getHours());
  const minHour = hours.length ? Math.min(defaultStart, ...hours) : defaultStart;
  const maxHour = hours.length ? Math.max(defaultEnd, ...hours) : defaultEnd;

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
                            <article key={`${appointment.id}-${date.toISOString()}`} className={styles.agendaAppointmentCard}>
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

                              <div className={styles.agendaAppointmentActions}>
                                <button className={styles.btnGhost} onClick={() => onView(appointment)}>
                                  Ver
                                </button>
                                <button className={styles.btnTiny} onClick={() => onEdit(appointment)}>
                                  Editar
                                </button>
                              </div>
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
                    <article key={`${appointment.id}-${date.toISOString()}-mobile`} className={styles.mobileAppointmentCard}>
                      <div>
                        <p className={styles.agendaAppointmentPatient}>
                          {appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`}
                        </p>
                        <p className={styles.agendaAppointmentService}>
                          {appointment.service?.name || appointment.service_name || `Servicio #${appointment.service_id}`}
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
