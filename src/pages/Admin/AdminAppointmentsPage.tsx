import { useEffect, useState } from "react";
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

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function AdminAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Array<{ id?: number; name: string }>>([]);
  const [dentists, setDentists] = useState<Array<{ id?: number; name: string }>>([]);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    dentist_id: "",
    starts_at: "",
    ends_at: "",
    reason: "",
  });

  async function fetchData() {
    try {
      setLoading(true);
      setError("");
      const [appointments, adminPatients, users] = await Promise.all([getAppointments(), getAdminPatients(), getAdminUsers()]);
      setItems(appointments);
      setPatients(adminPatients.map((patient) => ({ id: patient.id, name: patient.name })));
      setDentists(users.filter((user) => user.role === "dentist").map((user) => ({ id: user.id, name: user.name })));
    } catch (e: unknown) {
      setError(toErrorMessage(e, "No se pudo cargar la agenda"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    try {
      setSaving(true);
      await createAppointment({
        patient_id: Number(form.patient_id),
        dentist_id: Number(form.dentist_id),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        reason: form.reason,
      });
      setForm({ patient_id: "", dentist_id: "", starts_at: "", ends_at: "", reason: "" });
      await fetchData();
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
      await fetchData();
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
            <p className={styles.sectionSub}>Asignación rápida de paciente y dentista</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.formSurface}>
            <form className={formStyles.formGrid} onSubmit={onCreate}>
              <label className={formStyles.field}>Paciente
                <select className={formStyles.control} value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
                  <option value="">Selecciona paciente</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
                </select>
              </label>
              <label className={formStyles.field}>Dentista
                <select className={formStyles.control} value={form.dentist_id} onChange={(e) => setForm({ ...form, dentist_id: e.target.value })} required>
                  <option value="">Selecciona dentista</option>
                  {dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.name}</option>)}
                </select>
              </label>
              <label className={formStyles.field}>Inicio
                <input className={formStyles.control} type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required />
              </label>
              <label className={formStyles.field}>Fin
                <input className={formStyles.control} type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} required />
              </label>
              <label className={formStyles.field}>Motivo
                <input className={formStyles.control} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
              </label>
              {formError && <p className={formStyles.error}>{formError}</p>}
              <div className={formStyles.formActions}><button className={styles.btnPrimary} type="submit" disabled={saving}>{saving ? "Creando..." : "Crear cita"}</button></div>
            </form>
          </div>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Citas registradas</h3>
            <p className={styles.sectionSub}>{loading ? "Cargando..." : `${items.length} cita(s)`}</p>
          </div>
        </div>

        <div className={styles.sectionBody}>
          {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando citas...</p></div></div>}
          {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}

          {!loading && !error && (
            <div className={styles.listSurface}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>ID</th><th>Paciente</th><th>Dentista</th><th>Inicio</th><th>Fin</th><th>Motivo</th><th>Estatus</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td><p className={styles.rowTitle}>{item.id}</p></td>
                        <td><p className={styles.rowTitle}>{item.patient?.name || item.patient_name || item.patient_id}</p></td>
                        <td><p className={styles.rowTitle}>{item.dentist?.name || item.dentist_name || item.dentist_id}</p></td>
                        <td><p className={styles.rowSub}>{formatDateTime(item.starts_at)}</p></td>
                        <td><p className={styles.rowSub}>{formatDateTime(item.ends_at || "")}</p></td>
                        <td><p className={styles.rowSub}>{item.reason || item.notes || "-"}</p></td>
                        <td><span className={`${styles.pill} ${item.status === "cancelled" ? styles.pillOff : styles.pillOn}`}>{item.status || "pending"}</span></td>
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
                    ))}
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
