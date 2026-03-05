import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import styles from "./dentists.module.css";

import { getDentistsByClinic, type Dentist } from "../../api/dentists";

import CreateDentistModal from "./CreateDentistModal";
import EditDentistModal from "./EditDentistModal";
import DentistDetailsModal from "./DentistDetailsModal";

export default function DentistsPage() {
  const navigate = useNavigate();
  const { clinicId } = useParams();

  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<Dentist | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<Dentist | null>(null);

  async function fetchDentists() {
    if (!clinicId) return;

    try {
      setLoading(true);
      setError("");

      const list = await getDentistsByClinic(clinicId);
      setDentists(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error("Dentists error:", e?.response?.data || e);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "No se pudieron cargar los dentistas"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDentists();
  }, [clinicId]);

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

            <button className={styles.btnGhost} onClick={fetchDentists}>
              Actualizar
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
                    {d.specialty ? `Especialidad: ${d.specialty}` : "Sin especialidad"}
                    <br />
                    {d.licenseNumber ? `Licencia: ${d.licenseNumber}` : "Sin licencia"}
                  </p>

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

      {/* Modal crear */}
      {showCreate && clinicId && (
        <CreateDentistModal
          clinicId={clinicId}
          onClose={() => setShowCreate(false)}
          onCreated={fetchDentists}
        />
      )}

      {/* Modal editar */}
      {showEdit && selected && clinicId && (
        <EditDentistModal
          clinicId={clinicId}
          dentist={selected}
          onClose={() => setShowEdit(false)}
          onUpdated={fetchDentists}
        />
      )}

      {/* ✅ Modal detalles */}
      {showDetails && details && clinicId && (
        <DentistDetailsModal
          clinicId={clinicId}
          dentist={details}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}