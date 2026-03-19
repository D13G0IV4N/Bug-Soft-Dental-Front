import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppointment,
  getAppointments,
  toErrorMessage,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../api/appointments";
import { getAdminPatients } from "../../api/patients";
import { getAdminUsers } from "../../api/admin";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

const APPOINTMENT_STATUS_ACTIONS: AppointmentStatus[] = ["confirmed", "completed", "cancelled"];
const SERVICE_OPTIONS = [
  "Initial consultation",
  "Dental cleaning",
  "Tooth extraction",
  "Braces / Orthodontics",
  "Whitening",
  "Filling",
  "Root canal",
  "General check-up",
  "Other",
] as const;

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function inferServiceSelection(reason: string) {
  const normalizedReason = reason.trim().toLowerCase();
  const matched = SERVICE_OPTIONS.find((service) => service.toLowerCase() === normalizedReason);

  if (matched && matched !== "Other") {
    return { service: matched, customService: "" };
  }

  return {
    service: normalizedReason ? "Other" : "Initial consultation",
    customService: matched === "Other" ? "" : reason,
  };
}

export default function AdminAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Array<{ id?: number; name: string }>>([]);
  const [dentists, setDentists] = useState<Array<{ id?: number; name: string }>>([]);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    patient_user_id: "",
    dentist_user_id: "",
    start_at: "",
    end_at: "",
    service: "Initial consultation",
    customService: "",
    internal_notes: "",
  });

  const appointmentReason = useMemo(() => {
    if (form.service === "Other") {
      return form.customService.trim();
    }

    return form.service;
  }, [form.customService, form.service]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoadingAppointments(true);
      const appointments = await getAppointments();
      setItems(appointments);
      setError("");
    } catch (e: unknown) {
      setItems([]);
      setError(toErrorMessage(e, "No se pudo cargar la agenda"));
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const fetchReferences = useCallback(async () => {
    try {
      setLoadingReferences(true);
      const [adminPatients, users] = await Promise.all([getAdminPatients(), getAdminUsers()]);
      setPatients(adminPatients.map((patient) => ({ id: patient.id, name: patient.name })));
      setDentists(users.filter((user) => user.role === "dentist").map((user) => ({ id: user.id, name: user.name })));
    } catch (e: unknown) {
      setFormError(toErrorMessage(e, "No se pudieron cargar pacientes o dentistas"));
    } finally {
      setLoadingReferences(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    await Promise.allSettled([fetchAppointments(), fetchReferences()]);
  }, [fetchAppointments, fetchReferences]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (form.service === "Other" && !form.customService.trim()) {
      setFormError('Especifica el servicio cuando selecciones "Other".');
      return;
    }

    try {
      setSaving(true);
      await createAppointment({
        patient_user_id: Number(form.patient_user_id),
        dentist_user_id: Number(form.dentist_user_id),
        start_at: form.start_at,
        end_at: form.end_at,
        reason: appointmentReason,
        internal_notes: form.internal_notes,
      });
      setForm({
        patient_user_id: "",
        dentist_user_id: "",
        start_at: "",
        end_at: "",
        service: "Initial consultation",
        customService: "",
        internal_notes: "",
      });
      await fetchAppointments();
    } catch (e: unknown) {
      setFormError(toErrorMessage(e, "No se pudo crear la cita"));
    } finally {
      setSaving(false);
    }
  }

  async function onStatusChange(item: Appointment, status: AppointmentStatus) {
    if (!item.id) return;

    try {
      await updateAppointmentStatus(item.id, status);
      await fetchAppointments();
    } catch (e: unknown) {
      setError(toErrorMessage(e, "No se pudo actualizar el estatus de la cita"));
    }
  }

  return (
    <div className={styles.viewStack}>
      <div className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>Agenda clínica</h2>
          <p className={styles.heroSub}>Programa citas y resuelve cambios de estado desde un solo espacio.</p>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Nueva cita</h3>
            <p className={styles.sectionSub}>Asignación rápida de paciente, dentista y servicio.</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.formSurface}>
            <form className={formStyles.formGrid} onSubmit={onCreate}>
              <label className={formStyles.field}>Paciente
                <select className={formStyles.control} value={form.patient_user_id} onChange={(e) => setForm({ ...form, patient_user_id: e.target.value })} required>
                  <option value="">Selecciona paciente</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
                </select>
              </label>
              <label className={formStyles.field}>Dentista
                <select className={formStyles.control} value={form.dentist_user_id} onChange={(e) => setForm({ ...form, dentist_user_id: e.target.value })} required>
                  <option value="">Selecciona dentista</option>
                  {dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.name}</option>)}
                </select>
              </label>
              <label className={formStyles.field}>Inicio
                <input className={formStyles.control} type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} required />
              </label>
              <label className={formStyles.field}>Fin
                <input className={formStyles.control} type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} required />
              </label>
              <label className={formStyles.field}>Servicio
                <select className={formStyles.control} value={form.service} onChange={(e) => {
                  const service = e.target.value;
                  setForm({ ...form, service, customService: service === "Other" ? form.customService : "" });
                }} required>
                  {SERVICE_OPTIONS.map((service) => <option key={service} value={service}>{service}</option>)}
                </select>
              </label>
              {form.service === "Other" && (
                <label className={formStyles.field}>Especificar servicio
                  <input className={formStyles.control} value={form.customService} onChange={(e) => setForm({ ...form, customService: e.target.value })} placeholder="Describe el servicio" required />
                </label>
              )}
              <label className={formStyles.field}>Notas internas
                <input className={formStyles.control} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} placeholder="Opcional" />
              </label>
              {loadingReferences && <p className={formStyles.helper}>Cargando pacientes y dentistas...</p>}
              {formError && <p className={formStyles.error}>{formError}</p>}
              <div className={formStyles.formActions}><button className={styles.btnPrimary} type="submit" disabled={saving || loadingReferences}>{saving ? "Creando..." : "Crear cita"}</button></div>
            </form>
          </div>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Citas registradas</h3>
            <p className={styles.sectionSub}>{loadingAppointments ? "Cargando..." : `${items.length} cita(s)`}</p>
          </div>
        </div>

        <div className={styles.sectionBody}>
          {loadingAppointments && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando citas...</p></div></div>}
          {!loadingAppointments && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}

          {!loadingAppointments && !error && (
            <div className={styles.listSurface}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>ID</th><th>Paciente</th><th>Dentista</th><th>Inicio</th><th>Fin</th><th>Servicio / motivo</th><th>Estatus</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {items.map((item) => {
                      const inferredService = inferServiceSelection(item.reason || "");

                      return (
                        <tr key={item.id}>
                          <td><p className={styles.rowTitle}>{item.id}</p></td>
                          <td><p className={styles.rowTitle}>{item.patient?.name || item.patient_name || item.patient_user_id}</p></td>
                          <td><p className={styles.rowTitle}>{item.dentist?.name || item.dentist_name || item.dentist_user_id}</p></td>
                          <td><p className={styles.rowSub}>{formatDateTime(item.start_at)}</p></td>
                          <td><p className={styles.rowSub}>{formatDateTime(item.end_at || "")}</p></td>
                          <td>
                            <p className={styles.rowTitle}>{inferredService.service === "Other" ? inferredService.customService || "Other" : inferredService.service || "-"}</p>
                            {item.internal_notes && <p className={styles.rowSub}>{item.internal_notes}</p>}
                          </td>
                          <td><span className={`${styles.pill} ${item.status === "cancelled" ? styles.pillOff : styles.pillOn}`}>{item.status || "scheduled"}</span></td>
                          <td>
                            <div className={styles.tableActions}>
                              {APPOINTMENT_STATUS_ACTIONS.map((status) => (
                                <button
                                  key={status}
                                  className={status === "cancelled" ? styles.btnDanger : styles.btnGhost}
                                  onClick={() => onStatusChange(item, status)}
                                  disabled={item.status === status}
                                >
                                  {status === "confirmed" ? "Confirmar" : status === "completed" ? "Completar" : "Cancelar"}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
