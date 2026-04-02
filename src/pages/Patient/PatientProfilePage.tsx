import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import {
  changePatientPassword,
  getPatientProfile,
  updatePatientProfile,
  type PatientProfileData,
} from "../../api/patientProfile";
import { getStoredUser } from "../../utils/auth";
import { toErrorMessage } from "../../api/appointments";
import styles from "./patient.module.css";

type ProfileFormValues = {
  nombre: string;
  telefono: string;
  correo: string;
};

type PasswordFormValues = {
  actual: string;
  nueva: string;
  confirmacion: string;
};

const EMPTY_PROFILE: ProfileFormValues = {
  nombre: "",
  telefono: "",
  correo: "",
};

const EMPTY_PASSWORD: PasswordFormValues = {
  actual: "",
  nueva: "",
  confirmacion: "",
};

function getInitialProfileFromStorage(): PatientProfileData {
  const stored = getStoredUser();
  return {
    id: stored?.id,
    nombre: stored?.name?.trim() || "",
    telefono: "",
    correo: stored?.email?.trim() || "",
    clinica: stored?.clinic_name?.trim() || "Clínica dental",
    rol: "Paciente",
  };
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+\-()\s]/g, "").trimStart();
}

export default function PatientProfilePage() {
  const [profileData, setProfileData] = useState<PatientProfileData>(getInitialProfileFromStorage);
  const [profileForm, setProfileForm] = useState<ProfileFormValues>(EMPTY_PROFILE);
  const [passwordForm, setPasswordForm] = useState<PasswordFormValues>(EMPTY_PASSWORD);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");

  const [emailEditable, setEmailEditable] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const result = await getPatientProfile();
        if (!active) return;

        setProfileData(result);
        setProfileForm({
          nombre: result.nombre,
          telefono: result.telefono,
          correo: result.correo,
        });
        setProfileError("");
      } catch (error) {
        if (!active) return;
        setProfileError(toErrorMessage(error, "No pudimos cargar tu perfil en este momento."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const hasProfileChanges = useMemo(
    () =>
      profileForm.nombre.trim() !== profileData.nombre ||
      profileForm.telefono.trim() !== profileData.telefono ||
      profileForm.correo.trim() !== profileData.correo,
    [profileForm, profileData]
  );

  function validateProfileForm() {
    if (!profileForm.nombre.trim()) return "El nombre completo es obligatorio.";
    if (profileForm.nombre.trim().length < 4) return "El nombre completo debe tener al menos 4 caracteres.";

    if (!profileForm.telefono.trim()) return "El teléfono es obligatorio.";

    const digits = profileForm.telefono.replace(/\D/g, "");
    if (digits.length < 8) return "Ingresa un teléfono válido de al menos 8 dígitos.";

    if (emailEditable && profileForm.correo.trim()) {
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.correo.trim());
      if (!isEmailValid) return "Ingresa un correo electrónico válido.";
    }

    return "";
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileFeedback("");
    setProfileError("");

    const validationError = validateProfileForm();
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    try {
      setSavingProfile(true);

      const updated = await updatePatientProfile({
        nombre: profileForm.nombre,
        telefono: profileForm.telefono,
        correo: emailEditable ? profileForm.correo : undefined,
      });

      setProfileData(updated);
      setProfileForm({
        nombre: updated.nombre,
        telefono: updated.telefono,
        correo: updated.correo,
      });
      setProfileFeedback("Tus datos se actualizaron correctamente.");

      const currentStoredUser = getStoredUser();
      if (currentStoredUser) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...currentStoredUser,
            name: updated.nombre,
            email: updated.correo,
          })
        );
      }
    } catch (error) {
      const maybeAxios = error as AxiosError;
      if (maybeAxios.response?.status === 403 || maybeAxios.response?.status === 422) {
        setEmailEditable(false);
      }

      setProfileError(toErrorMessage(error, "No se pudieron guardar tus cambios. Inténtalo nuevamente."));
    } finally {
      setSavingProfile(false);
    }
  }

  function handleResetChanges() {
    setProfileForm({
      nombre: profileData.nombre,
      telefono: profileData.telefono,
      correo: profileData.correo,
    });
    setProfileFeedback("");
    setProfileError("");
  }

  function validatePasswordForm() {
    if (!passwordForm.actual) return "Ingresa tu contraseña actual.";
    if (!passwordForm.nueva) return "Ingresa una nueva contraseña.";
    if (passwordForm.nueva.length < 8) return "La nueva contraseña debe tener al menos 8 caracteres.";
    if (passwordForm.confirmacion !== passwordForm.nueva) return "La confirmación no coincide con la nueva contraseña.";
    return "";
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordFeedback("");
    setPasswordError("");

    const validationError = validatePasswordForm();
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    try {
      setSavingPassword(true);
      await changePatientPassword({
        current_password: passwordForm.actual,
        password: passwordForm.nueva,
        password_confirmation: passwordForm.confirmacion,
      });
      setPasswordForm(EMPTY_PASSWORD);
      setPasswordFeedback("Tu contraseña se actualizó correctamente.");
    } catch (error) {
      setPasswordError(
        toErrorMessage(error, "No fue posible cambiar tu contraseña todavía. Puedes intentarlo más tarde.")
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section className={styles.profileRoot}>
      <header className={styles.welcomeHero}>
        <p className={styles.welcomeEyebrow}>Mi perfil</p>
        <h2 className={styles.welcomeTitle}>Gestiona tu información personal</h2>
        <p className={styles.welcomeDescription}>
          Mantén tus datos actualizados para facilitar la comunicación y la gestión de tus citas.
        </p>
      </header>

      {loading ? (
        <article className={styles.surfaceCard}>
          <p className={styles.compactState}>Cargando tu perfil...</p>
        </article>
      ) : (
        <div className={styles.profileLayout}>
          <aside className={styles.profileSummaryCard}>
            <p className={styles.sectionEyebrow}>Resumen</p>
            <h3 className={styles.sectionTitle}>{profileData.nombre || "Paciente"}</h3>
            <ul className={styles.profileSummaryList}>
              <li>
                <span>Correo</span>
                <strong>{profileData.correo || "No registrado"}</strong>
              </li>
              <li>
                <span>Teléfono</span>
                <strong>{profileData.telefono || "No registrado"}</strong>
              </li>
              <li>
                <span>Clínica</span>
                <strong>{profileData.clinica}</strong>
              </li>
              <li>
                <span>Rol</span>
                <strong>{profileData.rol}</strong>
              </li>
            </ul>
          </aside>

          <div className={styles.profileFormsColumn}>
            <article className={styles.surfaceCard}>
              <header className={styles.sectionHeader}>
                <p className={styles.sectionEyebrow}>Datos personales</p>
                <h3 className={styles.sectionTitle}>Información de contacto</h3>
                <p className={styles.sectionDescription}>Puedes editar únicamente tus datos personales permitidos.</p>
              </header>

              {profileError && <p className={styles.formError}>{profileError}</p>}
              {profileFeedback && <p className={styles.formSuccess}>{profileFeedback}</p>}

              <form className={styles.profileForm} onSubmit={handleSaveProfile}>
                <label className={styles.profileField} htmlFor="profile-name">
                  Nombre completo
                  <input
                    id="profile-name"
                    value={profileForm.nombre}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, nombre: event.target.value }))}
                    placeholder="Tu nombre completo"
                    autoComplete="name"
                  />
                </label>

                <label className={styles.profileField} htmlFor="profile-phone">
                  Teléfono
                  <input
                    id="profile-phone"
                    value={profileForm.telefono}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, telefono: normalizePhone(event.target.value) }))
                    }
                    placeholder="Ej. +52 55 1234 5678"
                    autoComplete="tel"
                  />
                </label>

                <label className={styles.profileField} htmlFor="profile-email">
                  Correo electrónico
                  <input
                    id="profile-email"
                    value={profileForm.correo}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, correo: event.target.value }))}
                    placeholder="tu.correo@ejemplo.com"
                    autoComplete="email"
                    readOnly={!emailEditable}
                    aria-readonly={!emailEditable}
                  />
                </label>

                {!emailEditable && (
                  <p className={styles.fieldHint}>
                    Tu correo no es editable en este flujo actual. Si necesitas cambiarlo, contacta a la clínica.
                  </p>
                )}

                <div className={styles.profileActions}>
                  <button className={styles.secondaryAction} type="button" onClick={handleResetChanges}>
                    Restablecer cambios
                  </button>
                  <button className={styles.primaryAction} type="submit" disabled={savingProfile || !hasProfileChanges}>
                    {savingProfile ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </article>

            <article className={styles.surfaceCard}>
              <header className={styles.sectionHeader}>
                <p className={styles.sectionEyebrow}>Seguridad</p>
                <h3 className={styles.sectionTitle}>Cambiar contraseña</h3>
                <p className={styles.sectionDescription}>Actualiza tu contraseña para proteger el acceso a tu cuenta.</p>
              </header>

              {passwordError && <p className={styles.formError}>{passwordError}</p>}
              {passwordFeedback && <p className={styles.formSuccess}>{passwordFeedback}</p>}

              <form className={styles.profileForm} onSubmit={handleChangePassword}>
                <label className={styles.profileField} htmlFor="current-password">
                  Contraseña actual
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.actual}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, actual: event.target.value }))}
                  />
                </label>

                <label className={styles.profileField} htmlFor="new-password">
                  Nueva contraseña
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.nueva}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, nueva: event.target.value }))}
                  />
                </label>

                <label className={styles.profileField} htmlFor="confirm-password">
                  Confirmar nueva contraseña
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmacion}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmacion: event.target.value }))}
                  />
                </label>

                <div className={styles.profileActions}>
                  <button
                    className={styles.secondaryAction}
                    type="button"
                    onClick={() => {
                      setPasswordForm(EMPTY_PASSWORD);
                      setPasswordError("");
                      setPasswordFeedback("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button className={styles.primaryAction} type="submit" disabled={savingPassword}>
                    {savingPassword ? "Actualizando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
