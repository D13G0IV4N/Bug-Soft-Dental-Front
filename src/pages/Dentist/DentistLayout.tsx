import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./dentist.module.css";

const dentistLinks = [
  { to: "/dentist", label: "Mi agenda", end: true },
  { to: "/dentist/appointments", label: "Citas clínicas" },
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
      <aside className={styles.sidebar}>
        <section className={styles.brand}>
          <span className={styles.badge}>workspace dentist</span>
          <h1 className={styles.title}>Panel clínico</h1>
          <p className={styles.subtitle}>Diseñado para revisar agenda, resolver cambios y cerrar citas con rapidez.</p>
        </section>

        <nav className={styles.nav} aria-label="Navegación de dentista">
          {dentistLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ""}`.trim()}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button className={styles.btnGhost} onClick={handleLogout}>Cerrar sesión</button>
      </aside>

      <main className={styles.main}>
        <header className={styles.topBar}>
          <p className={styles.topHeading}>Operación diaria odontológica</p>
          <p className={styles.topMeta}>Vista personal de citas y actualización de estado clínico.</p>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
