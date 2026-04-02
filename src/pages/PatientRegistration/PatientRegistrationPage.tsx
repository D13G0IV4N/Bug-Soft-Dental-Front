import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { extractPublicClinics, getPublicClinics, type PublicClinic } from "../../api/clinics";
import styles from "./patientRegistration.module.css";

type RegistrationForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  clinic_id: string;
  acceptsTerms: boolean;
};

type RegistrationErrors = Partial<Record<keyof RegistrationForm, string>>;

const INITIAL_FORM: RegistrationForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  clinic_id: "",
  acceptsTerms: false,
};

export default function PatientRegistrationPage() {
  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [clinics, setClinics] = useState<PublicClinic[]>([]);
  const [isClinicLoading, setIsClinicLoading] = useState(true);
  const [clinicError, setClinicError] = useState("");

  useEffect(() => {
    async function loadClinics() {
      setIsClinicLoading(true);
      setClinicError("");

      try {
        const response = await getPublicClinics();
        setClinics(extractPublicClinics(response));
      } catch {
        setClinics([]);
        setClinicError("No pudimos cargar las clínicas en este momento. Intenta nuevamente en unos minutos.");
      } finally {
        setIsClinicLoading(false);
      }
    }

    void loadClinics();
  }, []);

  const handleChange = <K extends keyof RegistrationForm>(
    key: K,
    value: RegistrationForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitMessage("");
  };

  const validate = () => {
    const nextErrors: RegistrationErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Ingresa tu nombre completo.";

    if (!form.email.trim()) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(form.email.trim())) {
      nextErrors.email = "Ingresa un correo válido.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Ingresa tu teléfono.";
    } else if (!/^[+\d\s()-]{7,}$/.test(form.phone.trim())) {
      nextErrors.phone = "Ingresa un teléfono válido.";
    }

    if (!form.password) {
      nextErrors.password = "Crea una contraseña segura.";
    } else if (form.password.length < 8) {
      nextErrors.password = "Debe tener al menos 8 caracteres.";
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Confirma tu contraseña.";
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (!form.clinic_id) nextErrors.clinic_id = "Selecciona una clínica.";

    if (!form.acceptsTerms)
      nextErrors.acceptsTerms = "Debes aceptar el aviso de privacidad.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 750));
      // TODO: conectar con endpoint real de auto-registro de pacientes.
      setSubmitMessage(
        "Cuenta preparada. Cuando el endpoint esté listo, este formulario enviará tu registro automáticamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasClinicEmptyState = !isClinicLoading && !clinicError && clinics.length === 0;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandMark}>🦷</div>
          <p className={styles.brandEyebrow}>Portal de pacientes</p>
          <h1 className={styles.brandTitle}>Comienza tu cuidado dental</h1>
          <p className={styles.brandCopy}>
            Crea tu cuenta para agendar citas, consultar tu historial clínico y
            mantener el seguimiento de tu tratamiento en un solo lugar.
          </p>
          <ul className={styles.featureList}>
            <li>Reserva de citas en minutos</li>
            <li>Recordatorios y seguimiento</li>
            <li>Información segura y privada</li>
          </ul>
        </aside>

        <div className={styles.formPanel}>
          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>Regístrate como paciente</h2>
            <p className={styles.formSubtitle}>
              Completa tus datos para crear una cuenta y gestionar tus citas y
              cuidados desde el portal de Bug&Soft Dental.
            </p>
          </header>

          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.row}>
              <label className={styles.label} htmlFor="fullName">
                Nombre completo
              </label>
              <input
                id="fullName"
                className={`${styles.input} ${errors.fullName ? styles.inputError : ""}`}
                type="text"
                placeholder="ej. Ana María Pérez"
                value={form.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
            </div>

            <div className={styles.doubleRow}>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                  type="email"
                  placeholder="ej. paciente@email.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="phone">
                  Teléfono
                </label>
                <input
                  id="phone"
                  className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                  type="tel"
                  placeholder="ej. +57 300 123 4567"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              </div>
            </div>

            <div className={styles.doubleRow}>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="confirmPassword">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                {errors.confirmPassword && (
                  <span className={styles.errorText}>{errors.confirmPassword}</span>
                )}
              </div>
            </div>

            <div className={styles.row}>
              <label className={styles.label} htmlFor="clinic_id">
                Clínica
              </label>
              <select
                id="clinic_id"
                className={`${styles.input} ${styles.selectInput} ${errors.clinic_id ? styles.inputError : ""}`}
                value={form.clinic_id}
                onChange={(e) => handleChange("clinic_id", e.target.value)}
                disabled={isClinicLoading || Boolean(clinicError) || hasClinicEmptyState}
                aria-invalid={Boolean(errors.clinic_id)}
              >
                <option value="">
                  {isClinicLoading
                    ? "Cargando clínicas disponibles..."
                    : clinicError
                      ? "No se pudieron cargar las clínicas"
                      : hasClinicEmptyState
                        ? "No hay clínicas disponibles por ahora"
                        : "Selecciona tu clínica de preferencia"}
                </option>
                {!isClinicLoading &&
                  !clinicError &&
                  clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.location_label
                        ? `${clinic.name} — ${clinic.location_label}`
                        : clinic.name}
                    </option>
                  ))}
              </select>
              {errors.clinic_id && <span className={styles.errorText}>{errors.clinic_id}</span>}
              {clinicError && <span className={styles.helperText}>{clinicError}</span>}
              {hasClinicEmptyState && (
                <span className={styles.helperText}>
                  Aún no hay clínicas activas para registro. Vuelve a intentarlo más tarde.
                </span>
              )}
            </div>

            <label className={styles.termsRow}>
              <input
                type="checkbox"
                checked={form.acceptsTerms}
                onChange={(e) => handleChange("acceptsTerms", e.target.checked)}
              />
              Acepto el tratamiento de datos y el aviso de privacidad para la atención
              odontológica.
            </label>
            {errors.acceptsTerms && <span className={styles.errorText}>{errors.acceptsTerms}</span>}

            {submitMessage && <div className={styles.successMessage}>{submitMessage}</div>}

            <button className={styles.btn} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            <p className={styles.footer}>
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
