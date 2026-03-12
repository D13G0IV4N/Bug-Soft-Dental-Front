import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "../Dentists/dentists.module.css";
import { getStoredRole } from "../../utils/auth";

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
  const links = role === "receptionist"
    ? adminLinks.filter((item) => item.to === "/admin/patients" || item.to === "/admin/appointments")
    : adminLinks;

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.h1}>{role === "receptionist" ? "Recepción" : "Admin · Clínica"}</h1>
            <p className={styles.sub}>Panel interno de gestión clínica</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.tableActions}>
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => isActive ? styles.btnPrimary : styles.btnGhost}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
