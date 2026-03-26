import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "../Admin/admin.module.css";

const dentistLinks = [
  { to: "/dentist", label: "Dashboard", end: true },
  { to: "/dentist/appointments", label: "Mis citas" },
];

export default function DentistLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brandBlock}>
            <span className={styles.badge}>Dentista</span>
            <h1 className={styles.clinicName}>Panel clínico</h1>
            <p className={styles.sub}>Gestión personal de agenda</p>
          </div>

          <nav className={styles.nav} aria-label="Secciones dentista">
            {dentistLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.navTabActive : ""}`.trim()}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.sidebarFoot}>
            <button className={styles.btnGhost} onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.topBar}>
            <strong>Operación odontológica</strong>
            <span className={styles.topMeta}>Agenda y seguimiento de citas</span>
          </div>
          <section className={styles.viewFrame}>
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
