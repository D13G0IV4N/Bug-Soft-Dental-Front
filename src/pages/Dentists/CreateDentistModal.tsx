import { useEffect, useState } from "react";
import styles from "./dentists.module.css";
import formStyles from "../../styles/formSystem.module.css";
import { createDentist, type Dentist } from "../../api/dentists";
import { getSpecialties, type Specialty } from "../../api/specialties";
import SpecialtiesField from "./SpecialtiesField";

interface Props { clinicId: string; onClose: () => void; onCreated: () => void; }

const emptyDentist: Dentist = {
  name: "",
  email: "",
  password: "",
  phone: "",
  status: true,
  specialtyIds: [],
  specialties: [],
  licenseNumber: "",
  color: "#2f86e6",
};

export default function CreateDentistModal({ clinicId, onClose, onCreated }: Props) {
  const [dentist, setDentist] = useState<Dentist>(emptyDentist);
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

  function handleSpecialtiesChange(specialtyIds: number[]) {
    setDentist((current) => ({ ...current, specialtyIds }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createDentist(clinicId, dentist);
      onCreated();
      onClose();
    } catch (err: unknown) {
      console.error("Create dentist error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo crear el dentista");
    } finally { setLoading(false); }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={onClose}>
      <div className={formStyles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={formStyles.modalHeader}>
          <div>
            <h2 className={formStyles.modalTitle}>Crear dentista</h2>
            <p className={formStyles.modalText}>Completa los datos para registrar el dentista.</p>
          </div>
          <button className={styles.btnGhost} type="button" onClick={onClose} disabled={loading}>X</button>
        </div>

        <div className={formStyles.modalBody}>
          <form onSubmit={handleSubmit} className={formStyles.formGrid}>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Nombre *<input className={formStyles.control} value={dentist.name} onChange={(e) => setDentist({ ...dentist, name: e.target.value })} required placeholder="Dr. Carrillo Gama" /></label>
            <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={dentist.phone ?? ""} onChange={(e) => setDentist({ ...dentist, phone: e.target.value })} placeholder="3312345678" /></label>
            <label className={formStyles.field}>Correo *<input className={formStyles.control} type="email" value={dentist.email ?? ""} onChange={(e) => setDentist({ ...dentist, email: e.target.value })} required placeholder="correo@gmail.com" /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Contraseña *<input className={formStyles.control} type="password" value={dentist.password ?? ""} onChange={(e) => setDentist({ ...dentist, password: e.target.value })} required placeholder="********" /></label>
            <SpecialtiesField
              specialties={specialties}
              selectedIds={dentist.specialtyIds}
              loading={loadingSpecialties}
              disabled={loadingSpecialties || loading}
              onChange={handleSpecialtiesChange}
            />
            <label className={formStyles.field}>Número de licencia<input className={formStyles.control} value={dentist.licenseNumber ?? ""} onChange={(e) => setDentist({ ...dentist, licenseNumber: e.target.value })} placeholder="LIC-123456" /></label>
            <label className={formStyles.field}>Color<input className={formStyles.control} type="color" value={dentist.color || "#2f86e6"} onChange={(e) => setDentist({ ...dentist, color: e.target.value })} /></label>
            <label className={formStyles.checkboxField}><input type="checkbox" checked={dentist.status ?? true} onChange={(e) => setDentist({ ...dentist, status: e.target.checked })} /> Activo</label>
            {error && <div className={formStyles.error}>{error}</div>}
            <div className={formStyles.formActions}><button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>Cancelar</button><button type="submit" className={styles.btnPrimary} disabled={loading || loadingSpecialties}>{loading ? "Creando..." : "Crear"}</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
