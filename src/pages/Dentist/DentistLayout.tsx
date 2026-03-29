import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { me } from "../../api/auth";
import { getStoredUser } from "../../utils/auth";
import styles from "./dentist.module.css";

const dentistLinks = [{ to: "/dentist/appointments", label: "Mi agenda" }];

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveClinicNameFromCandidate(candidate: unknown): string {
  const record = asRecord(candidate);
  if (!record) return "";

  const directPaths: unknown[] = [
    record.clinic_name,
    asRecord(record.clinic)?.name,
    asRecord(record.clinic)?.nombre,
    asRecord(record.tenant)?.name,
    asRecord(record.tenant)?.nombre,
    asRecord(record.profile)?.clinic_name,
    asRecord(asRecord(record.profile)?.clinic)?.name,
    asRecord(asRecord(record.profile)?.clinic)?.nombre,
    asRecord(record.dentist)?.clinic_name,
    asRecord(asRecord(record.dentist)?.clinic)?.name,
    asRecord(asRecord(record.dentist)?.clinic)?.nombre,
  ];

  for (const pathValue of directPaths) {
    const name = readString(pathValue);
    if (name) return name;
  }

  return "";
}

export default function DentistLayout() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);
  const [clinicName, setClinicName] = useState(() => resolveClinicNameFromCandidate(storedUser));

  useEffect(() => {
    if (clinicName) return;

    async function loadClinicName() {
      try {
        const response = await me();
        const payload = response?.data?.data ?? response?.data;
        const resolved = resolveClinicNameFromCandidate(payload);
        if (resolved) setClinicName(resolved);
      } catch {
        setClinicName("");
      }
    }

    void loadClinicName();
  }, [clinicName]);

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
          <h1 className={styles.title}>{clinicName || "Clínica dental"}</h1>
          <p className={styles.subtitle}>Diseñado para revisar agenda, resolver cambios y cerrar citas con rapidez.</p>
        </section>

        <nav className={styles.nav} aria-label="Navegación de dentista">
          {dentistLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
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
