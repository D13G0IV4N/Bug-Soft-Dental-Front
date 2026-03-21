import type { AvailableDentist } from "../../api/appointments";
import type { Service } from "../../api/services";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

export type AppointmentFormState = {
  patient_user_id: string;
  service_id: string;
  start_at: string;
  dentist_user_id: string;
  reason: string;
  internal_notes: string;
};

interface AppointmentFormProps {
  form: AppointmentFormState;
  patients: Array<{ id?: number; name: string }>;
  services: Service[];
  availableDentists: AvailableDentist[];
  selectedService?: Service;
  canSearchDentists: boolean;
  loadingPatients: boolean;
  loadingServices: boolean;
  loadingDentists: boolean;
  patientsError: string;
  servicesError: string;
  dentistsError: string;
  formError: string;
  saving: boolean;
  mode: "create" | "edit";
  onChange: (field: keyof AppointmentFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
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

export default function AppointmentForm({
  form,
  patients,
  services,
  availableDentists,
  selectedService,
  canSearchDentists,
  loadingPatients,
  loadingServices,
  loadingDentists,
  patientsError,
  servicesError,
  dentistsError,
  formError,
  saving,
  mode,
  onChange,
  onSubmit,
  onCancel,
}: AppointmentFormProps) {
  const isEditing = mode === "edit";

  return (
    <form className={formStyles.formGrid} onSubmit={onSubmit}>
      <label className={formStyles.field}>
        Paciente
        <select
          className={formStyles.control}
          value={form.patient_user_id}
          onChange={(event) => onChange("patient_user_id", event.target.value)}
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
          onChange={(event) => onChange("service_id", event.target.value)}
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
          onChange={(event) => onChange("start_at", event.target.value)}
          required
        />
      </label>

      <label className={formStyles.field}>
        Dentista disponible
        <select
          className={formStyles.control}
          value={form.dentist_user_id}
          onChange={(event) => onChange("dentist_user_id", event.target.value)}
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
          onChange={(event) => onChange("reason", event.target.value)}
          placeholder="Opcional"
        />
      </label>

      <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
        Notas internas
        <textarea
          className={formStyles.control}
          value={form.internal_notes}
          onChange={(event) => onChange("internal_notes", event.target.value)}
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
        <p className={formStyles.helper}>
          {isEditing
            ? "No hay dentistas disponibles para el servicio y hora seleccionados al excluir la cita actual."
            : "No hay dentistas disponibles para el servicio y hora seleccionados."}
        </p>
      )}
      {formError && <p className={formStyles.error}>{formError}</p>}

      <div className={formStyles.formActions}>
        {onCancel && (
          <button className={styles.btnGhost} type="button" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
        <button
          className={styles.btnPrimary}
          type="submit"
          disabled={saving || loadingPatients || loadingServices || !canSearchDentists || availableDentists.length === 0}
        >
          {saving ? (isEditing ? "Guardando..." : "Creando...") : (isEditing ? "Guardar cambios" : "Crear cita")}
        </button>
      </div>
    </form>
  );
}
