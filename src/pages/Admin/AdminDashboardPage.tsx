import { useEffect, useState } from "react";
import styles from "../Dentists/dentists.module.css";
import { getAdminClinic, updateAdminClinic, type AdminClinic } from "../../api/admin";

export default function AdminDashboardPage() {
  const [clinic, setClinic] = useState<AdminClinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  async function fetchClinic() {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminClinic();
      setClinic(data);
      setForm({
        name: data?.name ?? "",
        email: data?.email ?? "",
        phone: data?.phone ?? "",
        address: data?.address ?? "",
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo cargar la clínica";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClinic();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      await updateAdminClinic(form, true);
      await fetchClinic();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo actualizar la clínica";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando clínica...</p></div></div>}

      {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}

      {!loading && !error && clinic && (
        <>
          <div className={styles.detailGrid}>
            <div className={styles.card}><p className={styles.cardText}>Nombre</p><h3 className={styles.cardTitle}>{clinic.name || "-"}</h3></div>
            <div className={styles.card}><p className={styles.cardText}>Correo</p><h3 className={styles.cardTitle}>{clinic.email || "-"}</h3></div>
            <div className={styles.card}><p className={styles.cardText}>Teléfono</p><h3 className={styles.cardTitle}>{clinic.phone || "-"}</h3></div>
            <div className={styles.card}><p className={styles.cardText}>Dirección</p><h3 className={styles.cardTitle}>{clinic.address || "-"}</h3></div>
          </div>

          <form className={styles.grid} onSubmit={onSubmit}>
            <label className={styles.card}>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className={styles.card}>Correo<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label className={styles.card}>Teléfono<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className={styles.card}>Dirección<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <div className={styles.actions}>
              <button className={styles.btnGhost} type="button" onClick={fetchClinic} disabled={saving}>Resetear</button>
              <button className={styles.btnPrimary} type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar clínica"}</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
