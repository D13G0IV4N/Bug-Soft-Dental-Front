import { useState } from "react";
import styles from "./dentists.module.css";

import { deleteDentist, updateDentist } from "../../api/dentists";
import type { Dentist } from "../../api/dentists";

interface Props {
  clinicId: string;
  dentist: Dentist;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditDentistModal({
  clinicId,
  dentist,
  onClose,
  onUpdated,
}: Props) {
  const [form, setForm] = useState<Dentist>({
    name: dentist.name || "",
    phone: dentist.phone || "",
    email: dentist.email || "",
    specialty: dentist.specialty || "",
    status: dentist.status ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!dentist.id) {
      setError("No se puede editar este dentista porque no tiene ID.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateDentist(clinicId, dentist.id, form);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Update dentist error:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo actualizar el dentista"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!dentist.id) {
      setError("No se puede eliminar este dentista porque no tiene ID.");
      return;
    }

    const confirmed = window.confirm("¿Seguro que deseas eliminar este dentista?");
    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      await deleteDentist(clinicId, dentist.id);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Delete dentist error:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo eliminar el dentista"
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
            <h2 className={styles.modalTitle}>Editar dentista</h2>
            <p className={styles.modalText}>Actualiza la información o elimina el registro.</p>
          </div>

          <button className={styles.btnGhost} type="button" onClick={onClose} disabled={loading}>
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formFieldFull}>
            <label>Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div>
            <label>Teléfono</label>
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={styles.input}
            />
          </div>

          <div>
            <label>Correo</label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formFieldFull}>
            <label>Especialidad</label>
            <input
              value={form.specialty ?? ""}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={form.status ?? true}
              onChange={(e) => setForm({ ...form, status: e.target.checked })}
            />
            <span>Activo</span>
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActionsBetween}>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Procesando..." : "Eliminar"}
            </button>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
