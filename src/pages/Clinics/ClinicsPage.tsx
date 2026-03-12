import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./clinics.module.css";

import { getSuperClinics } from "../../api/clinics";
import CreateClinicModal from "./CreateClinicModal";
import EditClinicModal from "./EditClinicModal";

type ClinicCard = {
  id: number;
  name?: string;
  nombre?: string;
  address?: string;
  direccion?: string;
  phone?: string;
  email?: string;
  status?: boolean;
  created_at?: string;
};

export default function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<ClinicCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicCard | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  function handleEditClinic(clinic: ClinicCard) {
    setSelectedClinic(clinic);
    setShowEditModal(true);
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  async function fetchClinics() {
    try {
      setLoading(true);
      setError("");

      const data: any = await getSuperClinics();
      const list = Array.isArray(data) ? data : [];
      setClinics(list);
    } catch (e: any) {
      console.error("Clinics error:", e?.response?.data || e);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "No se pudieron cargar las clínicas"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClinics();
  }, []);

  const activeCount = useMemo(
    () => clinics.filter((clinic) => clinic.status !== false).length,
    [clinics]
  );

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.h1}>Super Admin · Clínicas</h1>
            <p className={styles.sub}>
              Gestiona clínicas, revisa su operación y entra al detalle para administrar usuarios.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={() => setShowCreateModal(true)}
              disabled={loading}
            >
              + Crear clínica
            </button>

            <button className={styles.btnGhost} onClick={fetchClinics} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </button>

            <button className={styles.btnGhost} onClick={handleLogout} disabled={loading}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <article className={styles.statCard}>
            <p>Total clínicas</p>
            <strong>{loading ? "-" : clinics.length}</strong>
          </article>
          <article className={styles.statCard}>
            <p>Clínicas activas</p>
            <strong>{loading ? "-" : activeCount}</strong>
          </article>
          <article className={styles.statCard}>
            <p>Clínicas inactivas</p>
            <strong>{loading ? "-" : clinics.length - activeCount}</strong>
          </article>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Listado de clínicas</div>
            <div className={styles.count}>
              {loading ? "Cargando..." : `${clinics.length} clínica(s)`}
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

          {!loading && !error && clinics.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Aún no hay clínicas</p>
                <p className={styles.emptyText}>
                  Crea una clínica usando el flujo actual para registrar clínica + administrador.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && clinics.length > 0 && (
            <div className={styles.grid}>
              {clinics.map((clinic) => {
                const clinicName = clinic.name || clinic.nombre || `Clínica #${clinic.id}`;
                const clinicAddress = clinic.address || clinic.direccion || "Sin dirección";

                return (
                  <article key={clinic.id} className={styles.card}>
                    <div className={styles.cardTopRow}>
                      <h3 className={styles.cardTitle}>{clinicName}</h3>
                      <span className={clinic.status === false ? styles.statusOff : styles.statusOn}>
                        {clinic.status === false ? "Inactiva" : "Activa"}
                      </span>
                    </div>

                    <p className={styles.cardText}>{clinicAddress}</p>
                    <p className={styles.metaText}>{clinic.email || "Sin correo"}</p>
                    <p className={styles.metaText}>{clinic.phone || "Sin teléfono"}</p>

                    <div className={styles.cardActions}>
                      <button
                        className={styles.cardBtn}
                        onClick={() => navigate(`/clinics/${clinic.id}`)}
                        disabled={loading}
                      >
                        Abrir panel
                      </button>
                      <button
                        className={styles.btnGhost}
                        onClick={() => handleEditClinic(clinic)}
                        disabled={loading}
                      >
                        Editar clínica
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateClinicModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchClinics}
        />
      )}

      {showEditModal && selectedClinic && (
        <EditClinicModal
          clinic={selectedClinic}
          onClose={() => setShowEditModal(false)}
          onUpdated={fetchClinics}
        />
      )}
    </div>
  );
}
