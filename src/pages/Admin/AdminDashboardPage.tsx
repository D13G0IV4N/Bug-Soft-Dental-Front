import { useEffect, useState } from "react";
import { getAdminClinic, updateAdminClinic, type AdminClinic } from "../../api/admin";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

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
      <div className={styles.panelTop}>
        <div>
          <h2 className={styles.panelTitle}>Mi clínica</h2>
          <p className={styles.panelSub}>Información principal visible para el equipo.</p>
        </div>
      </div>

      {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando clínica...</p></div></div>}

      {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}

      {!loading && !error && clinic && (
        <form className={formStyles.formGrid} onSubmit={onSubmit}>
          <label className={formStyles.field}>Nombre<input className={formStyles.control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className={formStyles.field}>Correo<input className={formStyles.control} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className={formStyles.field}>Dirección<input className={formStyles.control} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <div className={formStyles.formActions}>
            <button className={styles.btnSoft} type="button" onClick={fetchClinic} disabled={saving}>Resetear</button>
            <button className={styles.btnPrimary} type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar clínica"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
