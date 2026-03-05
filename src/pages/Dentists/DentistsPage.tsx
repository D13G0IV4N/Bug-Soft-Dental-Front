import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./dentists.module.css";

import { getDentistsByClinic } from "../../api/dentists";
import type { Dentist } from "../../api/dentists";
import CreateDentistModal from "./CreateDentistModal";
import EditDentistModal from "./EditDentistModal";

export default function DentistsPage() {
  const navigate = useNavigate();
  const { clinicId } = useParams();

  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  async function fetchDentists() {
    if (!clinicId) {
      setError("No se encontró el ID de clínica.");
      setDentists([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data: any = await getDentistsByClinic(clinicId);
      const list = data?.data?.data ?? data?.data ?? data ?? [];
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
            <p className={styles.sub}>Clínica #{clinicId ?? "-"}</p>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.btnGhost}
              onClick={() => navigate("/clinics")}
              disabled={loading}
            >
              ← Volver a clínicas
            </button>
            <button
              className={styles.btnPrimary}
              onClick={() => setShowCreateModal(true)}
              disabled={loading || !clinicId}
            >
              + Crear dentista
            </button>
            <button className={styles.btnGhost} onClick={fetchDentists} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
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
                  Crea el primer dentista con el botón de arriba.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && dentists.length > 0 && (
            <div className={styles.grid}>
              {dentists.map((dentist, index) => (
                <div
                  key={dentist.id ?? `${dentist.name}-${index}`}
                  className={styles.card}
                >
                  <h3 className={styles.cardTitle}>{dentist.name}</h3>
                  <p className={styles.cardText}>
                    Especialidad: {dentist.specialty || "Sin especialidad"}
                  </p>
                  <p className={styles.cardText}>Correo: {dentist.email || "Sin correo"}</p>
                  <p className={styles.cardText}>Teléfono: {dentist.phone || "Sin teléfono"}</p>
                  <button
                    className={styles.cardBtn}
                    onClick={() => setSelectedDentist(dentist)}
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && clinicId && (
        <CreateDentistModal
          clinicId={clinicId}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchDentists}
        />
      )}

      {selectedDentist && clinicId && (
        <EditDentistModal
          clinicId={clinicId}
          dentist={selectedDentist}
          onClose={() => setSelectedDentist(null)}
          onUpdated={fetchDentists}
        />
      )}
    </div>
  );
}
