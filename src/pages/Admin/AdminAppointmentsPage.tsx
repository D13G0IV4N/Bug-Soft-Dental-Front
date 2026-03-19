import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppointment,
  getAppointments,
  getAvailableDentists,
  toErrorMessage,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
  type AvailableDentist,
} from "../../api/appointments";
import { getAdminPatients } from "../../api/patients";
import { getServices, type Service } from "../../api/services";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

const APPOINTMENT_STATUS_ACTIONS: AppointmentStatus[] = ["confirmed", "completed", "cancelled"];

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatDuration(minutes?: number) {
  if (!minutes || minutes <= 0) return "Duración no disponible";
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} h ${remainingMinutes} min`;
  }
  return `${minutes} min`;
}

export default function AdminAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Array<{ id?: number; name: string }>>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableDentists, setAvailableDentists] = useState<AvailableDentist[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingDentists, setLoadingDentists] = useState(false);
  const [saving, setSaving] = useState(false);

  const [appointmentsError, setAppointmentsError] = useState("");
  const [patientsError, setPatientsError] = useState("");
  const [servicesError, setServicesError] = useState("");
  const [dentistsError, setDentistsError] = useState("");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    patient_user_id: "",
    service_id: "",
    start_at: "",
    dentist_user_id: "",
    reason: "",
    internal_notes: "",
  });

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === form.service_id),
    [form.service_id, services]
  );

  const canSearchDentists = Boolean(form.service_id && form.start_at);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoadingAppointments(true);
      const appointments = await getAppointments();
      setItems(appointments);
      setAppointmentsError("");
    } catch (error: unknown) {
      setItems([]);
      setAppointmentsError(toErrorMessage(error, "No se pudo cargar la agenda"));
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const adminPatients = await getAdminPatients();
      setPatients(adminPatients.map((patient) => ({ id: patient.id, name: patient.name })));
      setPatientsError("");
    } catch (error: unknown) {
      setPatients([]);
      setPatientsError(toErrorMessage(error, "No se pudieron cargar los pacientes"));
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const catalog = await getServices();
      setServices(catalog.filter((service) => service.status !== false));
      setServicesError("");
    } catch (error: unknown) {
      setServices([]);
      setServicesError(toErrorMessage(error, "No se pudieron cargar los servicios"));
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
    void fetchPatients();
    void fetchServices();
  }, [fetchAppointments, fetchPatients, fetchServices]);

  useEffect(() => {
    if (!canSearchDentists) {
      setAvailableDentists([]);
      setDentistsError("");
      setLoadingDentists(false);
      setForm((current) => (current.dentist_user_id ? { ...current, dentist_user_id: "" } : current));
      return;
    }

    let active = true;

    async function fetchDentists() {
      try {
        setLoadingDentists(true);
        const dentists = await getAvailableDentists({
          service_id: Number(form.service_id),
          start_at: form.start_at,
        });

        if (!active) return;

        setAvailableDentists(dentists);
        setDentistsError("");
        setForm((current) => {
          const stillAvailable = dentists.some((dentist) => String(dentist.id) === current.dentist_user_id);
          return stillAvailable ? current : { ...current, dentist_user_id: "" };
        });
      } catch (error: unknown) {
        if (!active) return;
        setAvailableDentists([]);
        setDentistsError(toErrorMessage(error, "No se pudieron cargar los dentistas disponibles"));
        setForm((current) => (current.dentist_user_id ? { ...current, dentist_user_id: "" } : current));
      } finally {
        if (active) {
          setLoadingDentists(false);
        }
      }
    }

    void fetchDentists();

    return () => {
      active = false;
    };
  }, [canSearchDentists, form.service_id, form.start_at]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!form.patient_user_id || !form.service_id || !form.start_at || !form.dentist_user_id) {
      setFormError("Completa paciente, servicio, horario y dentista antes de crear la cita.");
      return;
    }

    try {
      setSaving(true);
      await createAppointment({
        patient_user_id: Number(form.patient_user_id),
        service_id: Number(form.service_id),
        start_at: form.start_at,
        dentist_user_id: Number(form.dentist_user_id),
        reason: form.reason.trim() || undefined,
        internal_notes: form.internal_notes.trim() || undefined,
      });
      setForm({
        patient_user_id: "",
        service_id: "",
        start_at: "",
        dentist_user_id: "",
        reason: "",
        internal_notes: "",
      });
      setAvailableDentists([]);
      setDentistsError("");
      await fetchAppointments();
    } catch (error: unknown) {
      setFormError(toErrorMessage(error, "No se pudo crear la cita"));
    } finally {
      setSaving(false);
    }
  }

  async function onStatusChange(item: Appointment, status: AppointmentStatus) {
    if (!item.id) return;

    try {
      await updateAppointmentStatus(item.id, status);
      await fetchAppointments();
    } catch (error: unknown) {
      setAppointmentsError(toErrorMessage(error, "No se pudo actualizar el estatus de la cita"));
    }
  }

  return (
    <div className={styles.viewStack}>
      <div className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>Agenda clínica</h2>
          <p className={styles.heroSub}>Programa citas con el flujo actual del backend: paciente, servicio, horario y dentista disponible.</p>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Nueva cita</h3>
            <p className={styles.sectionSub}>Selecciona el servicio primero para consultar únicamente dentistas compatibles y libres.</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.formSurface}>
            <form className={formStyles.formGrid} onSubmit={onCreate}>
              <label className={formStyles.field}>
                Paciente
                <select
                  className={formStyles.control}
                  value={form.patient_user_id}
                  onChange={(e) => setForm((current) => ({ ...current, patient_user_id: e.target.value }))}
                  required
                >
                  <option value="">Selecciona paciente</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
                </select>
              </label>

              <label className={formStyles.field}>
                Servicio
                <select
                  className={formStyles.control}
                  value={form.service_id}
                  onChange={(e) => setForm((current) => ({ ...current, service_id: e.target.value }))}
                  required
                >
                  <option value="">Selecciona servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}{service.specialty?.name ? ` · ${service.specialty.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className={formStyles.field}>
                Inicio
                <input
                  className={formStyles.control}
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm((current) => ({ ...current, start_at: e.target.value }))}
                  required
                />
              </label>

              <label className={formStyles.field}>
                Dentista disponible
                <select
                  className={formStyles.control}
                  value={form.dentist_user_id}
                  onChange={(e) => setForm((current) => ({ ...current, dentist_user_id: e.target.value }))}
                  disabled={!canSearchDentists || loadingDentists || availableDentists.length === 0}
                  required
                >
                  <option value="">
                    {!canSearchDentists
                      ? "Selecciona servicio y horario"
                      : loadingDentists
                        ? "Consultando disponibilidad..."
                        : availableDentists.length === 0
                          ? "Sin dentistas disponibles"
                          : "Selecciona dentista"}
                  </option>
                  {availableDentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.name}</option>)}
                </select>
              </label>

              <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
                Motivo
                <input
                  className={formStyles.control}
                  value={form.reason}
                  onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
                  placeholder="Opcional"
                />
              </label>

              <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
                Notas internas
                <textarea
                  className={formStyles.control}
                  value={form.internal_notes}
                  onChange={(e) => setForm((current) => ({ ...current, internal_notes: e.target.value }))}
                  placeholder="Opcional"
                />
              </label>

              {selectedService && (
                <p className={formStyles.helper}>
                  {selectedService.name} · {selectedService.specialty?.name || "Sin especialidad"} · {formatDuration(selectedService.duration_minutes)}.
                  El backend calculará automáticamente la hora de fin.
                </p>
              )}

              {loadingPatients && <p className={formStyles.helper}>Cargando pacientes...</p>}
              {patientsError && <p className={formStyles.error}>{patientsError}</p>}
              {loadingServices && <p className={formStyles.helper}>Cargando servicios...</p>}
              {servicesError && <p className={formStyles.error}>{servicesError}</p>}
              {dentistsError && <p className={formStyles.error}>{dentistsError}</p>}
              {!loadingDentists && canSearchDentists && !dentistsError && availableDentists.length === 0 && (
                <p className={formStyles.helper}>No hay dentistas disponibles para el servicio y hora seleccionados.</p>
              )}
              {formError && <p className={formStyles.error}>{formError}</p>}

              <div className={formStyles.formActions}>
                <button
                  className={styles.btnPrimary}
                  type="submit"
                  disabled={saving || loadingPatients || loadingServices || !canSearchDentists || availableDentists.length === 0}
                >
                  {saving ? "Creando..." : "Crear cita"}
                </button>
              </div>
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
          {!loadingAppointments && appointmentsError && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{appointmentsError}</p></div></div>}

          {!loadingAppointments && !appointmentsError && (
            <div className={styles.listSurface}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Paciente</th>
                      <th>Dentista</th>
                      <th>Servicio</th>
                      <th>Especialidad</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Estatus</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td><p className={styles.rowTitle}>{item.id}</p></td>
                        <td><p className={styles.rowTitle}>{item.patient?.name || item.patient_name || item.patient_user_id}</p></td>
                        <td><p className={styles.rowTitle}>{item.dentist?.name || item.dentist_name || item.dentist_user_id}</p></td>
                        <td>
                          <p className={styles.rowTitle}>{item.service?.name || item.service_name || `#${item.service_id}`}</p>
                          {item.reason && <p className={styles.rowSub}>Motivo: {item.reason}</p>}
                          {item.internal_notes && <p className={styles.rowSub}>Notas: {item.internal_notes}</p>}
                        </td>
                        <td><p className={styles.rowSub}>{item.service?.specialty?.name || item.specialty_name || "-"}</p></td>
                        <td><p className={styles.rowSub}>{formatDateTime(item.start_at)}</p></td>
                        <td><p className={styles.rowSub}>{formatDateTime(item.end_at || "")}</p></td>
                        <td><span className={`${styles.pill} ${item.status === "cancelled" || item.status === "canceled" ? styles.pillOff : styles.pillOn}`}>{item.status || "scheduled"}</span></td>
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
