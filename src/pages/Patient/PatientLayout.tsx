import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { getStoredUser, resolveClinicName } from "../../utils/auth";
import styles from "./patient.module.css";

const patientLinks = [
  { to: "/patient", label: "Inicio", end: true },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);
  const patientName = storedUser?.name?.trim() || "Paciente";
  const clinicName = resolveClinicName(storedUser);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.pageShell}>
      <a className={styles.skipLink} href="#patient-main">
        Saltar al contenido
      </a>

      <aside className={styles.sidebar}>
        <section className={styles.brandCard}>
          <p className={styles.brandEyebrow}>Portal de Paciente</p>
          <p className={styles.brandTitle}>Tu espacio dental</p>
          <p className={styles.brandBody}>
            Revisa tu próxima visita, sigue tus confirmaciones y entra rápido a tus acciones más frecuentes.
          </p>

          <div className={styles.patientBadge}>
            <span className={styles.patientBadgeLabel}>Cuenta activa</span>
            <strong className={styles.patientBadgeName}>{patientName}</strong>
            <span className={styles.patientBadgeMeta}>
              {clinicName || "Acceso personal autenticado"}
            </span>
          </div>
        </section>

        <nav className={styles.nav} aria-label="Navegación del portal">
          {patientLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <section className={styles.sidebarNote}>
          <p className={styles.sidebarNoteTitle}>Siguiente etapa</p>
          <p className={styles.sidebarNoteBody}>
            Este acceso ya queda preparado para conectar más adelante la vista de citas, servicios y reserva.
          </p>
        </section>

        <button className={styles.logoutButton} type="button" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </aside>

      <main className={styles.main} id="patient-main">
        <header className={styles.topBar}>
          <div>
            <p className={styles.topBarEyebrow}>Paciente autenticado</p>
            <p className={styles.topBarTitle}>Bienvenido, {patientName}</p>
          </div>

          <div className={styles.topBarMeta}>
            <span className={styles.topBarChip}>Vista inicial</span>
            <span className={styles.topBarChipMuted}>
              {clinicName || "Experiencia centrada en tu atención"}
            </span>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
