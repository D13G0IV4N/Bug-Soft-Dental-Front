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
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.badge}>{role === "receptionist" ? "Recepción" : "Administración"}</span>
            <h1 className={styles.h1}>{clinicName || "Mi clínica"}</h1>
            <p className={styles.sub}>Panel interno de gestión clínica</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </header>

        <div className={styles.navWrap}>
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
        </div>

        <section className={styles.panel}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
