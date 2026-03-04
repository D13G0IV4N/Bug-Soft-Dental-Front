import { useNavigate, useParams } from "react-router-dom";
import styles from "../Dentists/dentists.module.css";

export default function PatientsPage() {
  const navigate = useNavigate();
  const { clinicId } = useParams();

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.h1}>Pacientes</h1>
            <p className={styles.sub}>Clínica #{clinicId ?? "-"}</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={() => navigate("/clinics")}>
              ← Volver a clínicas
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.empty}>
            <div className={styles.emptyBox}>
              <p className={styles.emptyTitle}>Próximamente</p>
              <p className={styles.emptyText}>Próximamente, depende del backend.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
