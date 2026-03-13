import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../Dentists/dentists.module.css";
import adminStyles from "../Admin/admin.module.css";

import {
  createAdminPatient,
  createSuperClinicPatient,
  deleteAdminPatient,
  deleteSuperClinicPatient,
  getAdminPatientById,
  getAdminPatients,
  getSuperClinicPatientById,
  getSuperClinicPatients,
  type Patient,
  updateAdminPatient,
  updateSuperClinicPatient,
} from "../../api/patients";
import PatientFormModal from "./PatientFormModal";
import PatientDetailsModal from "./PatientDetailsModal";

function emptyPatient(): Patient {
  return {
    name: "",
    email: "",
    password: "",
    phone: "",
    status: true,
    profile: {
      birth_date: "",
      gender: "",
      address: "",
      allergies: "",
      notes: "",
    },
  };
}

function formatDate(date?: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("es-MX");
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const { clinicId } = useParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const isClinicContext = Boolean(clinicId);
  const isAdminContext = !isClinicContext;

  const subtitle = useMemo(
    () => (isClinicContext ? `Clínica #${clinicId}` : "Gestión administrativa de pacientes"),
    [isClinicContext, clinicId]
  );

  function getErrorMessage(error: unknown, fallback: string) {
    if (typeof error === "object" && error !== null) {
      const maybeResponse = (error as { response?: { data?: { message?: string } } }).response;
      const message = maybeResponse?.data?.message;
      if (message) return message;

      const directMessage = (error as { message?: string }).message;
      if (directMessage) return directMessage;
    }

    return fallback;
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  async function fetchPatients() {
    try {
      setLoading(true);
      setError("");
      const list = isClinicContext && clinicId ? await getSuperClinicPatients(clinicId) : await getAdminPatients();
      setPatients(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      console.error("Patients error:", error);
      setError(getErrorMessage(error, "No se pudieron cargar los pacientes"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPatients();
  }, [clinicId]);

  async function handleCreate(patient: Patient) {
    setModalLoading(true);
    try {
      if (isClinicContext && clinicId) {
        await createSuperClinicPatient(clinicId, patient);
      } else {
        await createAdminPatient(patient);
      }
      await fetchPatients();
    } finally {
      setModalLoading(false);
    }
  }

  async function handleEdit(patient: Patient) {
    if (!selectedPatient?.id) return;
    setModalLoading(true);

    try {
      if (isClinicContext && clinicId) {
        await updateSuperClinicPatient(clinicId, selectedPatient.id, {
          ...patient,
          password: patient.password?.trim() ? patient.password : undefined,
        });
      } else {
        await updateAdminPatient(selectedPatient.id, {
          ...patient,
          password: patient.password?.trim() ? patient.password : undefined,
        });
      }
      await fetchPatients();
      setSelectedPatient(null);
    } finally {
      setModalLoading(false);
    }
  }

  async function openDetails(patient: Patient) {
    if (!patient.id) return;

    try {
      setModalLoading(true);
      const detailed = isClinicContext && clinicId
        ? await getSuperClinicPatientById(clinicId, patient.id)
        : await getAdminPatientById(patient.id);
      setSelectedPatient(detailed);
      setShowDetails(true);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "No se pudo cargar el detalle del paciente"));
    } finally {
      setModalLoading(false);
    }
  }

  async function openEdit(patient: Patient) {
    if (!patient.id) return;

    try {
      setModalLoading(true);
      const detailed = isClinicContext && clinicId
        ? await getSuperClinicPatientById(clinicId, patient.id)
        : await getAdminPatientById(patient.id);
      setSelectedPatient({ ...detailed, password: "" });
      setShowEdit(true);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "No se pudo cargar el paciente"));
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDelete(patient: Patient) {
    if (!patient.id) return;
    const confirmed = window.confirm(
      `¿Eliminar a ${patient.name || "este paciente"}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      if (isClinicContext && clinicId) {
        await deleteSuperClinicPatient(clinicId, patient.id);
      } else {
        await deleteAdminPatient(patient.id);
      }
      await fetchPatients();
    } catch (error: unknown) {
      alert(getErrorMessage(error, "No se pudo eliminar el paciente"));
    }
  }

  return (
    <div className={`${styles.page} ${isAdminContext ? adminStyles.adminPatientsRoot : ""}`.trim()}>
      <div className={`${styles.wrap} ${isAdminContext ? adminStyles.adminPatientsWrap : ""}`.trim()}>
        <div className={`${styles.header} ${isAdminContext ? adminStyles.adminPatientsHeader : ""}`.trim()}>
          <div>
            <h1 className={`${styles.h1} ${isAdminContext ? adminStyles.adminPatientsTitle : ""}`.trim()}>Pacientes</h1>
            <p className={`${styles.sub} ${isAdminContext ? adminStyles.adminPatientsSub : ""}`.trim()}>{subtitle}</p>
          </div>

          <div className={styles.actions}>
            {isClinicContext ? (
              <button className={styles.btnGhost} onClick={() => navigate(`/clinics/${clinicId}`)}>
                ← Volver a clínica
              </button>
            ) : (
              <button className={styles.btnGhost} onClick={() => navigate("/admin")}>Ver clínica</button>
            )}

            <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
              + Crear paciente
            </button>
            {isClinicContext && (
              <button className={styles.btnGhost} onClick={handleLogout} disabled={loading || modalLoading}>
                Cerrar sesión
              </button>
            )}
          </div>
        </div>

        <div className={`${styles.panel} ${isAdminContext ? adminStyles.adminPatientsPanel : ""}`.trim()}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Listado</div>
            <div className={styles.count}>{loading ? "Cargando..." : `${patients.length} paciente(s)`}</div>
          </div>

          {loading && (
            <div className={`${styles.skeletonRow} ${isAdminContext ? `${adminStyles.adminPatientsBody} ${adminStyles.adminPatientsSkeleton}` : ""}`.trim()}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          )}

          {!loading && error && (
            <div className={`${styles.empty} ${isAdminContext ? adminStyles.adminPatientsBody : ""}`.trim()}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>No se pudo cargar</p>
                <p className={styles.emptyText}>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && patients.length === 0 && (
            <div className={`${styles.empty} ${isAdminContext ? adminStyles.adminPatientsBody : ""}`.trim()}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Aún no hay pacientes</p>
                <p className={styles.emptyText}>Crea uno con el botón de arriba.</p>
              </div>
            </div>
          )}

          {!loading && !error && patients.length > 0 && (
            <div className={`${styles.tableWrap} ${isAdminContext ? adminStyles.adminPatientsBody : ""}`.trim()}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Estatus</th>
                    <th>Nacimiento</th>
                    <th>Género</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.name || "-"}</td>
                      <td>{patient.email || "-"}</td>
                      <td>{patient.phone || "-"}</td>
                      <td>{patient.status === false ? "Inactivo" : "Activo"}</td>
                      <td>{formatDate(patient.profile.birth_date)}</td>
                      <td>{patient.profile.gender || "-"}</td>
                      <td>
                        <div className={styles.tableActions}>
                          <button className={styles.btnGhost} onClick={() => openDetails(patient)} disabled={modalLoading}>
                            Ver
                          </button>
                          <button className={styles.btnPrimary} onClick={() => openEdit(patient)} disabled={modalLoading}>
                            Editar
                          </button>
                          <button className={styles.btnDanger} onClick={() => handleDelete(patient)} disabled={modalLoading}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <PatientFormModal
          title="Crear paciente"
          submitLabel="Crear"
          loadingLabel="Creando..."
          initialPatient={emptyPatient()}
          requirePassword
          loading={modalLoading}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {showEdit && selectedPatient && (
        <PatientFormModal
          title="Editar paciente"
          submitLabel="Guardar cambios"
          loadingLabel="Guardando..."
          initialPatient={selectedPatient}
          requirePassword={false}
          loading={modalLoading}
          onClose={() => {
            setShowEdit(false);
            setSelectedPatient(null);
          }}
          onSubmit={handleEdit}
        />
      )}

      {showDetails && selectedPatient && (
        <PatientDetailsModal
          patient={selectedPatient}
          onClose={() => {
            setShowDetails(false);
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
}
