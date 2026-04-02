import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [isClinicDropdownOpen, setIsClinicDropdownOpen] = useState(false);
  const clinicSelectorRef = useRef<HTMLDivElement | null>(null);
  const clinicTriggerRef = useRef<HTMLButtonElement | null>(null);
  const clinicDropdownRef = useRef<HTMLDivElement | null>(null);
  const [clinicDropdownPosition, setClinicDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 280,
  });

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
  const isClinicSelectorDisabled =
    isClinicLoading || Boolean(clinicError) || hasClinicEmptyState;

  const selectedClinic = useMemo(
    () => clinics.find((clinic) => String(clinic.id) === form.clinic_id) ?? null,
    [clinics, form.clinic_id]
  );

  const clinicTriggerLabel = isClinicLoading
    ? "Cargando clínicas disponibles..."
    : clinicError
      ? "No se pudieron cargar las clínicas"
      : hasClinicEmptyState
        ? "No hay clínicas disponibles por ahora"
        : "Selecciona tu clínica de preferencia";

  const selectedClinicSecondary = selectedClinic?.address || selectedClinic?.phone || selectedClinic?.email || "";


  const updateClinicDropdownPosition = useCallback(() => {
    const trigger = clinicTriggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(220, openUpward ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(360, availableHeight);

    setClinicDropdownPosition({
      top: openUpward ? Math.max(8, rect.top - maxHeight - 8) : rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!isClinicDropdownOpen) return;

    updateClinicDropdownPosition();

    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (clinicSelectorRef.current?.contains(targetNode)) return;
      if (clinicDropdownRef.current?.contains(targetNode)) return;
      setIsClinicDropdownOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsClinicDropdownOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateClinicDropdownPosition);
    window.addEventListener("scroll", updateClinicDropdownPosition, true);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateClinicDropdownPosition);
      window.removeEventListener("scroll", updateClinicDropdownPosition, true);
    };
  }, [isClinicDropdownOpen, updateClinicDropdownPosition]);

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
              <label className={styles.label} htmlFor="clinic_selector">
                Clínica
              </label>
              <input type="hidden" name="clinic_id" value={form.clinic_id} />
              <div
                className={styles.clinicSelect}
                ref={clinicSelectorRef}
              >
                <button
                  type="button"
                  id="clinic_selector"
                  ref={clinicTriggerRef}
                  className={`${styles.clinicTrigger} ${errors.clinic_id ? styles.inputError : ""}`}
                  onClick={() => {
                    setIsClinicDropdownOpen((prev) => {
                      const nextState = !prev;
                      if (!prev) updateClinicDropdownPosition();
                      return nextState;
                    });
                  }}
                  disabled={isClinicSelectorDisabled}
                  aria-invalid={Boolean(errors.clinic_id)}
                  aria-haspopup="listbox"
                  aria-expanded={isClinicDropdownOpen}
                >
                  <span className={styles.clinicTriggerText}>
                    <span className={styles.clinicTriggerPrimary}>
                      {selectedClinic ? selectedClinic.name : clinicTriggerLabel}
                    </span>
                    {selectedClinic && selectedClinicSecondary && (
                      <span className={styles.clinicTriggerSecondary}>
                        {selectedClinicSecondary}
                      </span>
                    )}
                  </span>
                  <span className={styles.clinicTriggerIcon} aria-hidden="true">
                    ▾
                  </span>
                </button>

                {isClinicDropdownOpen && !isClinicSelectorDisabled && createPortal(
                  <div
                    className={styles.clinicDropdown}
                    role="presentation"
                    ref={clinicDropdownRef}
                    style={{
                      top: clinicDropdownPosition.top,
                      left: clinicDropdownPosition.left,
                      width: clinicDropdownPosition.width,
                      maxHeight: clinicDropdownPosition.maxHeight,
                    }}
                  >
                    <ul className={styles.clinicListbox} role="listbox" aria-label="Listado de clínicas">
                      {clinics.map((clinic) => {
                        const clinicId = String(clinic.id);
                        const isSelected = form.clinic_id === clinicId;
                        return (
                          <li key={clinic.id} role="option" aria-selected={isSelected}>
                            <button
                              type="button"
                              className={`${styles.clinicOptionCard} ${isSelected ? styles.clinicOptionCardSelected : ""}`}
                              onClick={() => {
                                handleChange("clinic_id", clinicId);
                                setIsClinicDropdownOpen(false);
                              }}
                            >
                              <span className={styles.clinicOptionMain}>{clinic.name}</span>
                              {clinic.address && (
                                <span className={styles.clinicOptionSecondary}>
                                  {clinic.address}
                                </span>
                              )}
                              {(clinic.phone || clinic.email) && (
                                <span className={styles.clinicOptionMeta}>
                                  {clinic.phone && <span>{clinic.phone}</span>}
                                  {clinic.email && <span>{clinic.email}</span>}
                                </span>
                              )}
                              {isSelected && (
                                <span className={styles.clinicOptionCheck} aria-hidden="true">
                                  ✓
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>,
                  document.body
                )}
              </div>
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
