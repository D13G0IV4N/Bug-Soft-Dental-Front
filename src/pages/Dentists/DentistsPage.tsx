import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import styles from "./dentists.module.css";

import { getDentistsByClinic, type Dentist } from "../../api/dentists";
import { getSpecialties, type Specialty } from "../../api/specialties";

import CreateDentistModal from "./CreateDentistModal";
import EditDentistModal from "./EditDentistModal";
import DentistDetailsModal from "./DentistDetailsModal";

function formatSpecialties(dentist: Dentist, specialtiesCatalog: Specialty[]) {
  const names = dentist.specialties.length > 0
    ? dentist.specialties.map((specialty) => specialty.name)
    : dentist.specialtyIds
        .map((specialtyId) => specialtiesCatalog.find((specialty) => specialty.id === specialtyId)?.name)
        .filter((name): name is string => Boolean(name));

  return names.length > 0 ? Array.from(new Set(names)).join(", ") : "Sin especialidad";
}

type ErrorLike = { message?: string; response?: { data?: { message?: string } } };

function getErrorMessage(error: unknown, fallback: string): string {
  const err = (error && typeof error === "object" ? error : {}) as ErrorLike;
  return err.response?.data?.message || err.message || fallback;
}


export default function DentistsPage() {
  const navigate = useNavigate();
  const { clinicId } = useParams();

  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [specialtiesCatalog, setSpecialtiesCatalog] = useState<Specialty[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<Dentist | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<Dentist | null>(null);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const fetchDentists = useCallback(async () => {
    if (!clinicId) return;

    try {
      setLoading(true);
      setError("");

      const list = await getDentistsByClinic(clinicId);
      setDentists(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      console.error("Dentists error:", ((e && typeof e === "object" ? e : {}) as ErrorLike).response?.data || e);
      setError(getErrorMessage(e, "No se pudieron cargar los dentistas"));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    let active = true;

    async function loadSpecialties() {
      try {
        const catalog = await getSpecialties();
        if (active) setSpecialtiesCatalog(catalog);
      } catch (e) {
        console.error("Specialties catalog error:", e);
      }
    }

    fetchDentists();
    loadSpecialties();

    return () => {
      active = false;
    };
  }, [fetchDentists]);

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.h1}>Dentistas</h1>
            <p className={styles.sub}>Clínica #{clinicId}</p>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.btnGhost}
              onClick={() => navigate("/clinics")}
            >
              ← Volver a clínicas
            </button>

            <button
              className={styles.btnPrimary}
              onClick={() => setShowCreate(true)}
            >
              + Crear dentista
            </button>

            <button className={styles.btnGhost} onClick={handleLogout} disabled={loading}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Listado</div>
            <div className={styles.count}>
              {loading ? "Cargando..." : `${dentists.length} dentista(s)`}
            </div>
          </div>

          {loading && (
            <div className={styles.skeletonRow}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          )}

          {!loading && error && (
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>No se pudo cargar</p>
                <p className={styles.emptyText}>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && dentists.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Aún no hay dentistas</p>
                <p className={styles.emptyText}>
                  Crea uno con el botón de arriba.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && dentists.length > 0 && (
            <div className={styles.grid}>
              {dentists.map((d) => (
                <div key={d.id} className={styles.card}>
                  <h3 className={styles.cardTitle}>
                    {d.name || `Dentista #${d.id}`}
                  </h3>

                  <p className={styles.cardText}>
                    {d.email ? `Correo: ${d.email}` : "Sin correo"}
                    <br />
                    {d.phone ? `Tel: ${d.phone}` : "Sin teléfono"}
                    <br />
                    {`Especialidades: ${formatSpecialties(d, specialtiesCatalog)}`}
                    <br />
                    {d.licenseNumber ? `Licencia: ${d.licenseNumber}` : "Sin licencia"}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#5f7387", fontSize: 13 }}>Color:</span>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        border: "1px solid rgba(47,134,230,0.35)",
                        background: d.color || "#2f86e6",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: "#5f7387", fontSize: 12 }}>
                      {d.color || "#2f86e6"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button
                      className={styles.btnPrimary}
                      style={{ flex: 1, height: 40, borderRadius: 12 }}
                      onClick={() => {
                        setSelected(d);
                        setShowEdit(true);
                      }}
                    >
                      Editar
                    </button>

                    <button
                      className={styles.btnGhost}
                      style={{ height: 40, borderRadius: 12 }}
                      onClick={() => {
                        setDetails(d);
                        setShowDetails(true);
                      }}
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && clinicId && (
        <CreateDentistModal
          clinicId={clinicId}
          onClose={() => setShowCreate(false)}
          onCreated={fetchDentists}
        />
      )}

      {showEdit && selected && clinicId && (
        <EditDentistModal
          clinicId={clinicId}
          dentist={selected}
          onClose={() => setShowEdit(false)}
          onUpdated={fetchDentists}
        />
      )}

      {showDetails && details && clinicId && (
        <DentistDetailsModal
          clinicId={clinicId}
          dentist={{ ...details, specialties: details.specialties.length > 0 ? details.specialties : specialtiesCatalog.filter((specialty) => details.specialtyIds.includes(specialty.id)) }}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}
