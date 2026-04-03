import { useEffect, useState } from "react";
import styles from "./dentists.module.css";
import formStyles from "../../styles/formSystem.module.css";
import { deleteDentist, updateDentist, type Dentist } from "../../api/dentists";
import { getSpecialties, type Specialty } from "../../api/specialties";
import SpecialtiesField from "./SpecialtiesField";

interface Props { clinicId: string; dentist: Dentist; onClose: () => void; onUpdated: () => void; }

type ErrorLike = { message?: string; response?: { data?: { message?: string } } };

function getErrorMessage(error: unknown, fallback: string): string {
  const err = (error && typeof error === "object" ? error : {}) as ErrorLike;
  return err.response?.data?.message || err.message || fallback;
}


export default function EditDentistModal({ clinicId, dentist, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<Dentist>({ ...dentist, specialtyIds: dentist.specialtyIds ?? [], password: "" });
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
          setError(getErrorMessage(err, "No se pudieron cargar las especialidades"));
        }
      } finally {
        if (active) setLoadingSpecialties(false);
      }
    }

    loadSpecialties();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setForm({ ...dentist, specialtyIds: dentist.specialtyIds ?? [], password: "" });
  }, [dentist]);

  function handleSpecialtiesChange(specialtyIds: number[]) {
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
      console.error("Update dentist error:", ((err && typeof err === "object" ? err : {}) as ErrorLike).response?.data || err);
      setError(getErrorMessage(err, "No se pudo actualizar el dentista"));
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
      console.error("Delete dentist error:", ((err && typeof err === "object" ? err : {}) as ErrorLike).response?.data || err);
      setError(getErrorMessage(err, "No se pudo eliminar el dentista"));
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
            <SpecialtiesField
              specialties={specialties}
              selectedIds={form.specialtyIds}
              loading={loadingSpecialties}
              disabled={loadingSpecialties || loading}
              onChange={handleSpecialtiesChange}
            />
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
