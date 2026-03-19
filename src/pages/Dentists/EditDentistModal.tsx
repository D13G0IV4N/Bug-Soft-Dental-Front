import { useEffect, useState } from "react";
import styles from "./dentists.module.css";
import formStyles from "../../styles/formSystem.module.css";
import { deleteDentist, updateDentist, type Dentist } from "../../api/dentists";
import { getSpecialties, type Specialty } from "../../api/specialties";

interface Props { clinicId: string; dentist: Dentist; onClose: () => void; onUpdated: () => void; }

export default function EditDentistModal({ clinicId, dentist, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<Dentist>({ ...dentist, password: "" });
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSpecialties() {
      try {
        setLoadingSpecialties(true);
        const catalog = await getSpecialties();
        if (active) setSpecialties(catalog);
      } catch (err: unknown) {
        if (active) {
          setError(err?.response?.data?.message || err?.message || "No se pudieron cargar las especialidades");
        }
      } finally {
        if (active) setLoadingSpecialties(false);
      }
    }

    loadSpecialties();
    return () => { active = false; };
  }, []);

  function handleSpecialtiesChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const specialtyIds = Array.from(event.target.selectedOptions)
      .map((option) => Number(option.value))
      .filter((value) => Number.isInteger(value) && value > 0);

    setForm((current) => ({ ...current, specialtyIds }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!dentist.id) return;
      await updateDentist(clinicId, dentist.id, form);
      onUpdated();
      onClose();
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Especialidades
              <select className={formStyles.control} multiple size={Math.min(Math.max(specialties.length, 4), 6)} value={form.specialtyIds.map(String)} onChange={handleSpecialtiesChange} disabled={loadingSpecialties || loading}>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                ))}
              </select>
            </label>
            <p className={formStyles.helper}>
              {loadingSpecialties ? "Cargando especialidades..." : specialties.length > 0 ? "Mantén presionada la tecla Ctrl (o Cmd en Mac) para elegir varias especialidades." : "No hay especialidades disponibles en el backend."}
            </p>
            <label className={formStyles.field}>Número de licencia<input className={formStyles.control} value={form.licenseNumber ?? ""} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></label>
            <label className={formStyles.field}>Color<input className={formStyles.control} type="color" value={form.color || "#2f86e6"} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
            <label className={formStyles.checkboxField}><input type="checkbox" checked={form.status ?? true} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Activo</label>
            {error && <div className={formStyles.error}>{error}</div>}
            <div className={formStyles.formActionsBetween}>
              <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={loading}>{loading ? "Procesando..." : "Eliminar"}</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={loading || loadingSpecialties}>{loading ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
