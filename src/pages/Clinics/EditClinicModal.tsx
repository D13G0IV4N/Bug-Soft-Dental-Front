import { useState } from "react";
import styles from "./clinics.module.css";
import formStyles from "../../styles/formSystem.module.css";
import { deleteClinic, updateClinic, type Clinic } from "../../api/clinics";
import AppModal from "../../components/ui/AppModal";

interface Props {
  clinic: Clinic;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditClinicModal({ clinic, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<Clinic>({ ...clinic });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!clinic.id) return;
      await updateClinic(clinic.id, form);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Update clinic error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo actualizar la clínica");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("¿Seguro que quieres eliminar esta clínica? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    setError("");
    try {
      if (!clinic.id) return;
      await deleteClinic(clinic.id);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Delete clinic error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo eliminar la clínica");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal
      open
      size="narrow"
      eyebrow="Administración de clínicas"
      title="Editar clínica"
      subtitle="Actualiza la información principal o elimina la clínica si ya no opera."
      onClose={onClose}
      closeDisabled={loading}
      disableClose={loading}
      actions={(
        <div className={formStyles.formActionsBetween}>
          <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={loading}>{loading ? "Procesando..." : "Eliminar"}</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" form="edit-clinic-form" className={styles.btnPrimary} disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</button>
          </div>
        </div>
      )}
    >
      <form id="edit-clinic-form" onSubmit={handleSubmit} className={formStyles.formGrid}>
        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Identificación de la clínica</p>
          <div className={formStyles.formSectionGrid}>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Nombre *<input className={formStyles.control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Clínica Dental Bug&Soft" /></label>
            <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="33 0000 0000" /></label>
            <label className={formStyles.field}>Correo<input className={formStyles.control} type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="clinica@correo.com" /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Dirección<input className={formStyles.control} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Av. Algo 123, Guadalajara" /></label>
            <label className={formStyles.checkboxField}><input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> {form.status ? "Activa" : "Inactiva"}</label>
          </div>
        </section>
        {error && <div className={formStyles.error}>{error}</div>}
      </form>
    </AppModal>
  );
}
