import { useState } from "react";
import styles from "./dentists.module.css";
import formStyles from "../../styles/formSystem.module.css";
import { createDentist, type Dentist } from "../../api/dentists";

interface Props { clinicId: string; onClose: () => void; onCreated: () => void; }

export default function CreateDentistModal({ clinicId, onClose, onCreated }: Props) {
  const [dentist, setDentist] = useState<Dentist>({ name: "", email: "", password: "", phone: "", status: true, specialty: "", licenseNumber: "", color: "#2f86e6" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createDentist(clinicId, dentist);
      onCreated();
      onClose();
    } catch (err: any) {
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
            <label className={formStyles.field}>Especialidad<input className={formStyles.control} value={dentist.specialty ?? ""} onChange={(e) => setDentist({ ...dentist, specialty: e.target.value })} placeholder="Ortodoncia / Endodoncia..." /></label>
            <label className={formStyles.field}>Número de licencia<input className={formStyles.control} value={dentist.licenseNumber ?? ""} onChange={(e) => setDentist({ ...dentist, licenseNumber: e.target.value })} placeholder="LIC-123456" /></label>
            <label className={formStyles.field}>Color<input className={formStyles.control} type="color" value={dentist.color || "#2f86e6"} onChange={(e) => setDentist({ ...dentist, color: e.target.value })} /></label>
            <label className={formStyles.checkboxField}><input type="checkbox" checked={dentist.status ?? true} onChange={(e) => setDentist({ ...dentist, status: e.target.checked })} /> Activo</label>
            {error && <div className={formStyles.error}>{error}</div>}
            <div className={formStyles.formActions}><button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>Cancelar</button><button type="submit" className={styles.btnPrimary} disabled={loading}>{loading ? "Creando..." : "Crear"}</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
