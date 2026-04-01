import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { getStoredUser, resolveClinicName } from "../../utils/auth";
import styles from "./patient.module.css";

const patientLinks = [
  { to: "/patient", label: "Dashboard", end: true },
  { to: "/patient/appointments", label: "Appointments" },
  { to: "/patient/services", label: "Services" },
  { to: "/patient/book", label: "Book Visit" },
  { to: "/patient/profile", label: "Profile" },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = useMemo(() => getStoredUser(), []);
  const patientName = storedUser?.name?.trim() || "Patient";
  const clinicName = resolveClinicName(storedUser);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const activeLabel =
    patientLinks.find((link) =>
      link.end ? location.pathname === link.to : location.pathname.startsWith(link.to)
    )?.label ?? "Dashboard";

  return (
    <div className={styles.pageShell}>
      <a className={styles.skipLink} href="#patient-main">
        Skip to content
      </a>

      <aside className={styles.sidebar} aria-label="Patient navigation">
        <div className={styles.brandBlock}>
          <p className={styles.brandEyebrow}>Bug&Soft Dental</p>
          <h1 className={styles.brandTitle}>Patient Portal</h1>
          <p className={styles.brandMeta}>{clinicName || "Your trusted dental care space"}</p>
        </div>

        <nav className={styles.sidebarNav}>
          {patientLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button className={styles.logoutButton} type="button" onClick={handleLogout}>
          Log out
        </button>
      </aside>

      <main className={styles.main} id="patient-main">
        <header className={styles.mainTopBar}>
          <div>
            <p className={styles.topBarLabel}>Hello</p>
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
