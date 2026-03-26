import { Link } from "react-router-dom";
import styles from "../Dentist/dentist.module.css";

export default function ReceptionistDashboardPage() {
  return (
    <section className={styles.surface}>
      <div className={styles.workspaceHero}>
        <div>
          <p className={styles.workspaceTag}>Front Desk · Dashboard</p>
          <h2 className={styles.heroTitle}>Módulo de recepcionista</h2>
          <p className={styles.heroSub}>Gestiona citas y pacientes con endpoints permitidos para tu rol.</p>
        </div>
      </div>

      <div className={styles.controls}>
        <Link to="/receptionist/appointments" className={styles.btn}>Ir a citas</Link>
        <Link to="/receptionist/patients" className={styles.btnGhost}>Ir a pacientes</Link>
      </div>

      <div className={styles.emptyState}>
        Nota: services no está habilitado para receptionist. Se usa selección por ID de servicio con sugerencias desde citas existentes.
      </div>
    </section>
  );
}
