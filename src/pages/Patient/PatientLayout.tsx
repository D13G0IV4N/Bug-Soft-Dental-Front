import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { getStoredUser, resolveClinicName } from "../../utils/auth";
import styles from "./patient.module.css";

type PatientLink = {
  to: string;
  label: string;
  shortLabel: string;
  end?: boolean;
};

const patientLinks: PatientLink[] = [
  { to: "/patient", label: "Inicio", shortLabel: "IN", end: true },
  { to: "/patient/appointments", label: "Mis citas", shortLabel: "MC" },
  { to: "/patient/services", label: "Servicios", shortLabel: "SV" },
  { to: "/patient/book", label: "Agendar cita", shortLabel: "AG" },
  { to: "/patient/profile", label: "Mi perfil", shortLabel: "MP" },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = useMemo(() => getStoredUser(), []);
  const patientName = storedUser?.name?.trim() || "Paciente";
  const clinicName = resolveClinicName(storedUser);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const activeLabel =
    patientLinks.find((link) =>
      link.end ? location.pathname === link.to : location.pathname.startsWith(link.to)
    )?.label ?? "Inicio";

  return (
    <div className={styles.pageShell}>
      <a className={styles.skipLink} href="#patient-main">
        Ir al contenido
      </a>

      <aside className={styles.sidebar} aria-label="Navegación de paciente">
        <div className={styles.brandBlock}>
          <p className={styles.brandEyebrow}>Bug&Soft Dental</p>
          <h1 className={styles.brandTitle}>Portal de Pacientes</h1>
          <p className={styles.brandMeta}>{clinicName || "Tu espacio de cuidado dental"}</p>
        </div>

        <nav className={styles.sidebarNav}>
          {patientLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()}
            >
              <span className={styles.navIcon}>{link.shortLabel}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className={styles.logoutButton} type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className={styles.main} id="patient-main">
        <header className={styles.mainTopBar}>
          <div>
            <p className={styles.topBarLabel}>Hola</p>
            <p className={styles.topBarName}>{patientName}</p>
          </div>
          <p className={styles.topBarSection}>{activeLabel}</p>
        </header>

        <div className={styles.outletSurface}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
