import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./admin.module.css";

const superAdminLinks = [
  { to: "/clinics", label: "Clínicas", end: false },
  { to: "/specialties", label: "Especialidades" },
  { to: "/services", label: "Servicios" },
];

export default function SuperAdminLayout() {
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
            <span className={styles.badge}>Super Admin</span>
            <h1 className={styles.clinicName}>Red de clínicas</h1>
            <p className={styles.sub}>Operación global y catálogos compartidos</p>
          </div>

          <nav className={styles.nav} aria-label="Secciones super admin">
            {superAdminLinks.map((link) => (
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
            <strong>Gestión global de la plataforma</strong>
            <span className={styles.topMeta}>Catálogos y clínicas del ecosistema dental</span>
          </div>
          <section className={styles.viewFrame}>
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
