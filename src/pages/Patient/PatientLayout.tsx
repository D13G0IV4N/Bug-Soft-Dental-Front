import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, resolveClinicName } from "../../utils/auth";
import styles from "./patient.module.css";

type PatientLink = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

function IconWrapper({ children }: { children: ReactNode }) {
  return (
    <span className={styles.navIcon} aria-hidden="true">
      {children}
    </span>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4.5 10.7 12 4l7.5 6.7v8.4a1 1 0 0 1-1 1H14v-5.2h-4v5.2H5.5a1 1 0 0 1-1-1v-8.4Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 3.8v4M16 3.8v4M4 10.3h16" />
      <path d="M8.5 14h3M8.5 17h6.5" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3.5c3.7 0 6.8 3 6.8 6.8 0 5.2-5.2 9.6-6.8 9.6-1.7 0-6.8-4.4-6.8-9.6 0-3.8 3-6.8 6.8-6.8Z" />
      <path d="M9.2 10.8h5.6M12 8v5.6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4.2" width="16" height="15.6" rx="2.2" />
      <path d="M8 8.5h8M8 12h8M8 15.5h4.6" />
      <path d="M18.7 18.8 20 20.1M15.3 17a2.6 2.6 0 1 0 0 .1Z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8.4" r="3.1" />
      <path d="M5.2 19a6.8 6.8 0 0 1 13.6 0" />
    </svg>
  );
}

const patientLinks: PatientLink[] = [
  { to: "/patient", label: "Inicio", icon: <IconWrapper><HomeIcon /></IconWrapper>, end: true },
  { to: "/patient/appointments", label: "Mis citas", icon: <IconWrapper><CalendarIcon /></IconWrapper> },
  { to: "/patient/services", label: "Detalles clínica", icon: <IconWrapper><ServicesIcon /></IconWrapper> },
  { to: "/patient/book", label: "Agendar cita", icon: <IconWrapper><BookIcon /></IconWrapper> },
  { to: "/patient/profile", label: "Mi perfil", icon: <IconWrapper><ProfileIcon /></IconWrapper> },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = useMemo(() => getStoredUser(), []);
  const clinicName = resolveClinicName(storedUser);
  const fullName = storedUser?.name?.trim() || "Paciente";
  const firstName = storedUser?.name?.trim()?.split(/\s+/)[0] || "Paciente";
  const patientInitial = fullName.charAt(0).toUpperCase();
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNavOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isNavOpen]);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

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

        <nav id="patient-sidebar-nav" className={styles.sidebarNav}>
          {patientLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setIsNavOpen(false)}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className={styles.logoutButton} type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>


      <button
        type="button"
        className={`${styles.mobileNavBackdrop} ${isNavOpen ? styles.mobileNavBackdropOpen : ""}`.trim()}
        aria-label="Cerrar menú de navegación"
        onClick={() => setIsNavOpen(false)}
      />

      <section
        id="patient-mobile-nav"
        className={`${styles.mobileNavSheet} ${isNavOpen ? styles.mobileNavSheetOpen : ""}`.trim()}
        aria-label="Menú móvil de paciente"
      >
        <div className={styles.mobileSheetHeader}>
          <div className={styles.mobileSheetProfile}>
            <span className={styles.mobileSheetAvatar} aria-hidden="true">
              {patientInitial}
            </span>
            <div className={styles.mobileSheetProfileCopy}>
              <p>{fullName}</p>
              <small>{clinicName || "Portal de pacientes"}</small>
            </div>
          </div>
          <button
            type="button"
            className={styles.mobileSheetMenuButton}
            aria-label="Cerrar menú de navegación"
            onClick={() => setIsNavOpen(false)}
          >
            <span className={styles.mobileMenuButtonLines} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        <p className={styles.mobileSheetSectionLabel}>Navegación</p>
        <nav className={styles.mobileSheetNav}>
          {patientLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setIsNavOpen(false)}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.mobileSheetFooter}>
          <button className={styles.mobileSheetLogoutChip} type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </section>

      <main className={styles.main} id="patient-main">
        <header className={styles.mobileTopBar}>
          <button
            type="button"
            className={styles.mobileTopBarMenu}
            aria-expanded={isNavOpen}
            aria-controls="patient-mobile-nav"
            aria-label={isNavOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            onClick={() => setIsNavOpen((current) => !current)}
          >
            <span className={styles.mobileMenuButtonLines} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <div className={styles.mobileTopBarCopy}>
            <p>{`Hola, ${firstName}`}</p>
            <small>{clinicName || "Portal de pacientes"}</small>
          </div>
        </header>

        <div className={styles.outletSurface}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
