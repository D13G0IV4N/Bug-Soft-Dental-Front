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
      setForm({ name: data?.name ?? "", email: data?.email ?? "", phone: data?.phone ?? "", address: data?.address ?? "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la clínica");
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
      alert(e instanceof Error ? e.message : "No se pudo actualizar la clínica");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.viewStack}>
      <div className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>Mi clínica</h2>
          <p className={styles.heroSub}>Define los datos institucionales visibles para todo el equipo.</p>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Información general</h3>
            <p className={styles.sectionSub}>Perfil base de la clínica</p>
          </div>
        </div>

        <div className={styles.sectionBody}>
          {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando clínica...</p></div></div>}
          {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}

          {!loading && !error && clinic && (
            <div className={styles.formSurface}>
              <form className={formStyles.formGrid} onSubmit={onSubmit}>
                <label className={formStyles.field}>Nombre<input className={formStyles.control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                <label className={formStyles.field}>Correo<input className={formStyles.control} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
                <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label className={formStyles.field}>Dirección<input className={formStyles.control} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                <div className={formStyles.formActions}>
                  <button className={styles.btnSoft} type="button" onClick={fetchClinic} disabled={saving}>Restablecer</button>
                  <button className={styles.btnPrimary} type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar clínica"}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
