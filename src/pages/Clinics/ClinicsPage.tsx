import { useEffect, useState } from "react";
import styles from "./clinics.module.css";
import { getPublicClinics } from "../../api/clinics";

type Clinic = {
  id: number;
  name?: string;
  nombre?: string;
  address?: string;
  direccion?: string;
};

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const data: any = await getPublicClinics();
        console.log("Clinics response:", data);

        const list = data?.data?.data ?? data?.data ?? data ?? [];
        setClinics(Array.isArray(list) ? list : []);
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
    })();
  }, []);

  const count = clinics.length;

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.h1}>Clínicas</h1>
            <p className={styles.sub}>
              Aquí verás el listado de clínicas disponibles.
            </p>
          </div>

          {/* ✅ ESTE BOTÓN SIEMPRE SALE */}
          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={() => alert("Aquí va el modal/form de Crear Clínica")}
            >
              + Crear clínica
            </button>

            <button
              className={styles.btnGhost}
              onClick={() => window.location.reload()}
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Listado</div>
            <div className={styles.count}>
              {loading ? "Cargando..." : `${count} clínica(s)`}
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className={styles.skeletonRow}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>No se pudo cargar</p>
                <p className={styles.emptyText}>{error}</p>
                <p className={styles.emptyText}>
                  Abre consola (F12) para ver el detalle.
                </p>
              </div>
            </div>
          )}

          {/* EMPTY */}
          {!loading && !error && clinics.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Aún no hay clínicas</p>
                <p className={styles.emptyText}>
                  Cuando existan, aparecerán aquí en tarjetas. Por ahora puedes
                  crear una clínica con el botón de arriba.
                </p>
              </div>
            </div>
          )}

          {/* DATA */}
          {!loading && !error && clinics.length > 0 && (
            <div className={styles.grid}>
              {clinics.map((c) => (
                <div key={c.id} className={styles.card}>
                  <h3 className={styles.cardTitle}>
                    {c.name || c.nombre || `Clínica #${c.id}`}
                  </h3>
                  <p className={styles.cardText}>
                    {c.address || c.direccion || "Sin dirección"}
                  </p>
                  <button
                    className={styles.cardBtn}
                    onClick={() => alert(`Abrir clínica ${c.id}`)}
                  >
                    Ver clínica
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}