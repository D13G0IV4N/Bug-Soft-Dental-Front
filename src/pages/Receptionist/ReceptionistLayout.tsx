import { NavLink, Outlet, useNavigate } from "react-router-dom";
import dentistStyles from "../Dentist/dentist.module.css";

const receptionistLinks = [
  { to: "/receptionist/appointments", label: "Citas" },
  { to: "/receptionist/patients", label: "Pacientes" },
];

export default function ReceptionistLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  return (
    <div className={dentistStyles.page}>
      <aside className={dentistStyles.sidebar}>
        <section className={dentistStyles.brand}>
          <span className={dentistStyles.badge}>workspace receptionist</span>
          <h1 className={dentistStyles.title}>Panel de recepción</h1>
          <p className={dentistStyles.subtitle}>Agenda, pacientes y cambios de estado en una sola operación diaria.</p>
        </section>

        <nav className={dentistStyles.nav} aria-label="Navegación de recepcionista">
          {receptionistLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `${dentistStyles.navItem} ${isActive ? dentistStyles.navActive : ""}`.trim()}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button className={dentistStyles.btnGhost} onClick={handleLogout}>Cerrar sesión</button>
      </aside>

      <main className={dentistStyles.main}>
        <header className={dentistStyles.topBar}>
          <p className={dentistStyles.topHeading}>Operación diaria de recepción</p>
          <p className={dentistStyles.topMeta}>Rutas backend activas para receptionist: appointments y admin/patients.</p>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
