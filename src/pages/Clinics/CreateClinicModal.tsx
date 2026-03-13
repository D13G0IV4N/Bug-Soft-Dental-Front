import { useState } from "react";
import styles from "./clinics.module.css";
import formStyles from "../../styles/formSystem.module.css";

import { createClinic } from "../../api/clinics";
import type { Clinic, ClinicAdmin } from "../../api/clinics";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateClinicModal({ onClose, onCreated }: Props) {
  const [clinic, setClinic] = useState<Clinic>({ name: "", address: "", phone: "", email: "", status: true });
  const [admin, setAdmin] = useState<ClinicAdmin>({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createClinic({ clinic, admin });
      onCreated();
      onClose();
    } catch (err: any) {
      console.error("Create clinic error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo crear la clínica");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={onClose}>
      <div className={formStyles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={formStyles.modalHeader}>
          <div>
            <h2 className={formStyles.modalTitle}>Crear clínica</h2>
            <p className={formStyles.modalText}>Crea la clínica y su usuario administrador.</p>
          </div>
          <button className={styles.btnGhost} type="button" onClick={onClose} disabled={loading}>X</button>
        </div>

        <div className={formStyles.modalBody}>
          <form onSubmit={handleSubmit} className={formStyles.formGrid}>
            <div className={formStyles.formSection}>
              <h3 className={formStyles.sectionTitle}>Datos de la clínica</h3>
              <div className={formStyles.formGrid}>
                <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
                  Nombre *
                  <input className={formStyles.control} value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} required placeholder="Clínica Dental Bug&Soft" />
                </label>
                <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={clinic.phone ?? ""} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} placeholder="33 0000 0000" /></label>
                <label className={formStyles.field}>Correo<input className={formStyles.control} type="email" value={clinic.email ?? ""} onChange={(e) => setClinic({ ...clinic, email: e.target.value })} placeholder="clinica@correo.com" /></label>
                <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Dirección<input className={formStyles.control} value={clinic.address ?? ""} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} placeholder="Av. Algo 123, Guadalajara" /></label>
                <label className={formStyles.checkboxField}><input type="checkbox" checked={clinic.status ?? true} onChange={(e) => setClinic({ ...clinic, status: e.target.checked })} /> Activa</label>
              </div>
            </div>

            <div className={formStyles.formSection}>
              <h3 className={formStyles.sectionTitle}>Administrador</h3>
              <div className={formStyles.formGrid}>
                <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Nombre *<input className={formStyles.control} value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} required placeholder="Juan Pérez" /></label>
                <label className={formStyles.field}>Correo *<input className={formStyles.control} type="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} required placeholder="admin@correo.com" /></label>
                <label className={formStyles.field}>Contraseña *<input className={formStyles.control} type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} required placeholder="********" /></label>
                <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Teléfono<input className={formStyles.control} value={admin.phone ?? ""} onChange={(e) => setAdmin({ ...admin, phone: e.target.value })} placeholder="33 0000 0000" /></label>
              </div>
            </div>

            {error && <div className={formStyles.error}>{error}</div>}

            <div className={formStyles.formActions}>
              <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>Cancelar</button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>{loading ? "Creando..." : "Crear"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
