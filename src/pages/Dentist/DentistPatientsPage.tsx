import { useEffect, useMemo, useState } from "react";
import { getDentistAppointments, toErrorMessage, type Appointment } from "../../api/appointments";
import { getDentistPatients, type Patient } from "../../api/patients";
import DentistPatientDetailsModal from "./DentistPatientDetailsModal";
import styles from "./dentist.module.css";

function formatDate(date?: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("es-MX");
}

function getAge(date?: string | null) {
  if (!date) return "-";
  const birthDate = new Date(date);
  if (Number.isNaN(birthDate.getTime())) return "-";

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const birthdayReached =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!birthdayReached) years -= 1;
  return years >= 0 ? String(years) : "-";
}

export default function DentistPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError("");

        const [patientList, appointmentList] = await Promise.all([
          getDentistPatients(),
          getDentistAppointments().catch(() => []),
        ]);

        setPatients(Array.isArray(patientList) ? patientList : []);
        setAppointments(Array.isArray(appointmentList) ? appointmentList : []);
      } catch (requestError: unknown) {
        setPatients([]);
        setAppointments([]);
        setError(toErrorMessage(requestError, "No se pudieron cargar los pacientes del odontólogo"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredPatients = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return patients;

    return patients.filter((patient) => {
      const values = [patient.name, patient.email, patient.phone, patient.profile.gender]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase());

      return values.some((value) => value.includes(needle));
    });
  }, [patients, search]);

  const selectedPatientAppointments = useMemo(() => {
    if (!selectedPatient?.id) return [];

    return appointments
      .filter((appointment) => appointment.patient_user_id === selectedPatient.id)
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
      .slice(0, 5);
  }, [appointments, selectedPatient]);

  return (
    <section className={styles.surface}>
      <div className={styles.workspaceHero}>
        <div>
          <p className={styles.workspaceTag}>Dental Flow · Pacientes</p>
          <h2 className={styles.heroTitle}>Pacientes</h2>
          <p className={styles.heroSub}>Listado de pacientes vinculados a tu sesión de odontólogo autenticado.</p>
        </div>
      </div>

      <div className={styles.controlsShell}>
        <div className={styles.controlsHeader}>
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre, correo, teléfono o género"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar paciente"
          />
        </div>
      </div>

      {loading && <div className={styles.emptyState}>Cargando pacientes...</div>}
      {!loading && error && <div className={styles.emptyState}>{error}</div>}

      {!loading && !error && filteredPatients.length === 0 && (
        <div className={styles.emptyState}>No hay pacientes para mostrar en tu contexto actual.</div>
      )}

      {!loading && !error && filteredPatients.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre completo</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Género</th>
                <th>Edad</th>
                <th>Estatus</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id ?? `${patient.email}-${patient.name}`}>
                  <td>
                    <p className={styles.rowMain}>{patient.name || "-"}</p>
                    <p className={styles.rowMeta}>Registro: {formatDate(patient.created_at)}</p>
                  </td>
                  <td>{patient.phone || "-"}</td>
                  <td>{patient.email || "-"}</td>
                  <td>{patient.profile.gender || "-"}</td>
                  <td>{getAge(patient.profile.birth_date)}</td>
                  <td>
                    <span className={`${styles.statusPill} ${patient.status === false ? styles.statusCanceled : styles.statusConfirmed}`}>
                      {patient.status === false ? "Inactivo" : "Activo"}
                    </span>
                  </td>
                  <td>
                    <button type="button" className={styles.btnGhost} onClick={() => setSelectedPatient(patient)}>
                      Ver datos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPatient && (
        <DentistPatientDetailsModal
          patient={selectedPatient}
          recentAppointments={selectedPatientAppointments}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </section>
  );
}
