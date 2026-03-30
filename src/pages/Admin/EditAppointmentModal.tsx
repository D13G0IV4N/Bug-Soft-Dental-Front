import type { AvailableDentist, Appointment } from "../../api/appointments";
import type { Service } from "../../api/services";
import AppointmentForm, { type AppointmentFormState } from "./AppointmentForm";
import AppModal from "../../components/ui/AppModal";

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
    <AppModal
      open
      size="wide"
      eyebrow="Agenda administrativa"
      title={`Editar cita #${appointment.id}`}
      subtitle="Actualiza paciente, servicio, horario y dentista sin alterar el formulario principal."
      onClose={onClose}
      closeDisabled={saving}
      disableClose={saving}
    >
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
    </AppModal>
  );
}
