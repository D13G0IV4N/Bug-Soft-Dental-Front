import type { AvailableDentist, Appointment } from "../../api/appointments";
import type { Service } from "../../api/services";
import formStyles from "../../styles/formSystem.module.css";
import styles from "./admin.module.css";
import AppointmentForm, { type AppointmentFormState } from "./AppointmentForm";

interface Props {
  appointment: Appointment;
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
  onChange: (field: keyof AppointmentFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export default function EditAppointmentModal({
  appointment,
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
  onChange,
  onClose,
  onSubmit,
}: Props) {
  return (
    <div className={formStyles.modalOverlay} onClick={() => !saving && onClose()}>
      <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
        <div className={formStyles.modalHeader}>
          <div>
            <h3 className={formStyles.modalTitle}>Editar cita #{appointment.id}</h3>
            <p className={formStyles.modalText}>
              Actualiza paciente, servicio, horario y dentista desde un modal sin alterar el formulario principal.
            </p>
          </div>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </div>

        <div className={formStyles.modalBody}>
          <AppointmentForm
            form={form}
            patients={patients}
            services={services}
            availableDentists={availableDentists}
            selectedService={selectedService}
            canSearchDentists={canSearchDentists}
            loadingPatients={loadingPatients}
            loadingServices={loadingServices}
            loadingDentists={loadingDentists}
            patientsError={patientsError}
            servicesError={servicesError}
            dentistsError={dentistsError}
            formError={formError}
            saving={saving}
            mode="edit"
            onChange={onChange}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
