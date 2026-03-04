import { useState } from "react";
import styles from "./dentists.module.css";

import { createDentist } from "../../api/dentists";
import type { Dentist } from "../../api/dentists";

interface Props {
  clinicId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDentistModal({ clinicId, onClose, onCreated }: Props) {
  const [dentist, setDentist] = useState<Dentist>({
    name: "",
    phone: "",
    email: "",
    specialty: "",
    status: true,
  });

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
      setError(
        err?.response?.data?.message || err?.message || "No se pudo crear el dentista"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Crear dentista</h2>
            <p className={styles.modalText}>Completa los datos para registrar el dentista.</p>
          </div>

          <button className={styles.btnGhost} type="button" onClick={onClose} disabled={loading}>
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formFieldFull}>
            <label>Nombre *</label>
            <input
              value={dentist.name}
              onChange={(e) => setDentist({ ...dentist, name: e.target.value })}
              required
              placeholder="Dr. Juan Pérez"
              className={styles.input}
            />
          </div>

          <div>
            <label>Teléfono</label>
            <input
              value={dentist.phone ?? ""}
              onChange={(e) => setDentist({ ...dentist, phone: e.target.value })}
              placeholder="33 0000 0000"
              className={styles.input}
            />
          </div>

          <div>
            <label>Correo</label>
            <input
              type="email"
              value={dentist.email ?? ""}
              onChange={(e) => setDentist({ ...dentist, email: e.target.value })}
              placeholder="dentista@correo.com"
              className={styles.input}
            />
          </div>

          <div className={styles.formFieldFull}>
            <label>Especialidad</label>
            <input
              value={dentist.specialty ?? ""}
              onChange={(e) => setDentist({ ...dentist, specialty: e.target.value })}
              placeholder="Ortodoncia"
              className={styles.input}
            />
          </div>

          <div className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={dentist.status ?? true}
              onChange={(e) => setDentist({ ...dentist, status: e.target.checked })}
            />
            <span>Activo</span>
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
