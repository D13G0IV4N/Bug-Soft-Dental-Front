import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getStoredRole } from "../../utils/auth";
import { getAdminClinic } from "../../api/admin";
import styles from "./admin.module.css";

const adminLinks = [
  { to: "/admin", label: "Mi clínica", end: true },
  { to: "/admin/users", label: "Usuarios" },
  { to: "/admin/receptionists", label: "Recepcionistas" },
  { to: "/admin/patients", label: "Pacientes" },
  { to: "/admin/appointments", label: "Citas" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const role = getStoredRole();
  const [clinicName, setClinicName] = useState("");

  const links = role === "receptionist"
    ? adminLinks.filter((item) => item.to === "/admin/patients" || item.to === "/admin/appointments")
    : adminLinks;

  useEffect(() => {
    async function loadClinic() {
      try {
        const clinic = await getAdminClinic();
        setClinicName(clinic?.name?.trim() ?? "");
      } catch {
        setClinicName("");
      }
    }

    loadClinic();
  }, []);

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
            <span className={styles.badge}>{role === "receptionist" ? "Recepción" : "Administración"}</span>
            <h1 className={styles.clinicName}>{clinicName || "Mi clínica"}</h1>
            <p className={styles.sub}>Panel operativo dental</p>
          </div>

          <nav className={styles.nav} aria-label="Secciones admin">
            {links.map((link) => (
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
            <strong>Gestión clínica interna</strong>
            <span className={styles.topMeta}>Diseño administrativo unificado</span>
          </div>
          <section className={styles.viewFrame}>
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
