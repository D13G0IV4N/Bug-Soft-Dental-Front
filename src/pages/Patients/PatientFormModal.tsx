import { useMemo, useState } from "react";
import styles from "../Dentists/dentists.module.css";
import type { Patient } from "../../api/patients";

interface Props {
  title: string;
  submitLabel: string;
  loadingLabel: string;
  initialPatient: Patient;
  requirePassword: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (patient: Patient) => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = (error as { response?: { data?: { message?: string } } }).response;
    const message = maybeResponse?.data?.message;
    if (message) return message;

    const directMessage = (error as { message?: string }).message;
    if (directMessage) return directMessage;
  }

  return fallback;
}

export default function PatientFormModal({
  title,
  submitLabel,
  loadingLabel,
  initialPatient,
  requirePassword,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [error, setError] = useState("");

  const isPasswordRequired = useMemo(() => requirePassword, [requirePassword]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (isPasswordRequired && !patient.password?.trim()) {
      setError("La contraseña es obligatoria para crear pacientes.");
      return;
    }

    try {
      await onSubmit(patient);
      onClose();
    } catch (error: unknown) {
      setError(getErrorMessage(error, "No se pudo guardar el paciente"));
    }
  }

  function updateProfile(field: keyof Patient["profile"], value: string) {
    setPatient((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            <p className={styles.modalText}>Completa la información administrativa del paciente.</p>
          </div>

          <button className={styles.btnGhost} type="button" onClick={onClose} disabled={loading}>
            X
          </button>
        </div>

        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <label className={styles.formFieldFull}>
            Nombre *
            <input
              className={styles.input}
              value={patient.name}
              onChange={(e) => setPatient({ ...patient, name: e.target.value })}
              required
            />
          </label>

          <label>
            Correo *
            <input
              className={styles.input}
              type="email"
              value={patient.email}
              onChange={(e) => setPatient({ ...patient, email: e.target.value })}
              required
            />
          </label>

          <label>
            Teléfono
            <input
              className={styles.input}
              value={patient.phone ?? ""}
              onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
            />
          </label>

          <label>
            Contraseña {isPasswordRequired ? "*" : "(opcional)"}
            <input
              className={styles.input}
              type="password"
              value={patient.password ?? ""}
              onChange={(e) => setPatient({ ...patient, password: e.target.value })}
              required={isPasswordRequired}
            />
          </label>

          <label>
            Fecha de nacimiento
            <input
              className={styles.input}
              type="date"
              value={patient.profile.birth_date ?? ""}
              onChange={(e) => updateProfile("birth_date", e.target.value)}
            />
          </label>

          <label>
            Género
            <select
              className={styles.input}
              value={patient.profile.gender ?? ""}
              onChange={(e) => updateProfile("gender", e.target.value)}
            >
              <option value="">Selecciona</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </select>
          </label>

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={patient.status !== false}
              onChange={(e) => setPatient({ ...patient, status: e.target.checked })}
            />
            Paciente activo
          </label>

          <label className={styles.formFieldFull}>
            Dirección
            <textarea
              className={styles.input}
              value={patient.profile.address ?? ""}
              onChange={(e) => updateProfile("address", e.target.value)}
            />
          </label>

          <label className={styles.formFieldFull}>
            Alergias
            <textarea
              className={styles.input}
              value={patient.profile.allergies ?? ""}
              onChange={(e) => updateProfile("allergies", e.target.value)}
            />
          </label>

          <label className={styles.formFieldFull}>
            Notas
            <textarea
              className={styles.input}
              value={patient.profile.notes ?? ""}
              onChange={(e) => updateProfile("notes", e.target.value)}
            />
          </label>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActionsBetween}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? loadingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
