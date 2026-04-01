import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { getStoredUser, resolveClinicName } from "../../utils/auth";
import styles from "./patient.module.css";

const patientLinks = [{ to: "/patient", label: "Inicio", end: true }];

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

      <header className={styles.chromeHeader}>
        <div>
          <p className={styles.chromeEyebrow}>Portal del Paciente</p>
          <p className={styles.chromeTitle}>Hola, {patientName}</p>
          <p className={styles.chromeMeta}>{clinicName || "Tu espacio personal de atención"}</p>
        </div>

        <div className={styles.chromeActions}>
          <nav className={styles.pillNav} aria-label="Navegación del portal">
            {patientLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `${styles.pillNavItem} ${isActive ? styles.pillNavItemActive : ""}`.trim()
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className={styles.main} id="patient-main">
        <Outlet />
      </main>
    </div>
  );
}
