import { useState } from "react";
import styles from "./dentists.module.css";
import formStyles from "../../styles/formSystem.module.css";
import { deleteDentist, updateDentist, type Dentist } from "../../api/dentists";

interface Props { clinicId: string; dentist: Dentist; onClose: () => void; onUpdated: () => void; }

export default function EditDentistModal({ clinicId, dentist, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<Dentist>({ ...dentist, password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!dentist.id) return;
      await updateDentist(clinicId, dentist.id, form);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Update dentist error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo actualizar el dentista");
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!dentist.id || !window.confirm("¿Eliminar dentista? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    setError("");
    try {
      await deleteDentist(clinicId, dentist.id);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Delete dentist error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo eliminar el dentista");
    } finally { setLoading(false); }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={onClose}>
      <div className={formStyles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={formStyles.modalHeader}>
          <div>
            <h2 className={formStyles.modalTitle}>Editar dentista</h2>
            <p className={formStyles.modalText}>Actualiza los datos o elimina el registro.</p>
          </div>
          <button className={styles.btnGhost} type="button" onClick={onClose} disabled={loading}>X</button>
        </div>
        <div className={formStyles.modalBody}>
          <form onSubmit={handleSubmit} className={formStyles.formGrid}>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Nombre *<input className={formStyles.control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className={formStyles.field}>Correo *<input className={formStyles.control} type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Contraseña (opcional)<input className={formStyles.control} type="password" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label className={formStyles.field}>Especialidad<input className={formStyles.control} value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></label>
            <label className={formStyles.field}>Número de licencia<input className={formStyles.control} value={form.licenseNumber ?? ""} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></label>
            <label className={formStyles.field}>Color<input className={formStyles.control} type="color" value={form.color || "#2f86e6"} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
            <label className={formStyles.checkboxField}><input type="checkbox" checked={form.status ?? true} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Activo</label>
            {error && <div className={formStyles.error}>{error}</div>}
            <div className={formStyles.formActionsBetween}>
              <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={loading}>{loading ? "Procesando..." : "Eliminar"}</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
