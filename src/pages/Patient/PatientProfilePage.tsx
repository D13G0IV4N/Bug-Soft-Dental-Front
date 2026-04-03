import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  updatePatientPassword,
  getPatientProfile,
  updatePatientProfile,
  exportPatientAppointmentSummary,
  type PatientProfileData,
} from "../../api/patientProfile";
import { getStoredUser } from "../../utils/auth";
import { toErrorMessage } from "../../api/appointments";
import styles from "./patient.module.css";

type ProfileFormValues = {
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
  alergias: string;
  notas: string;
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
  direccion: "",
  alergias: "",
  notas: "",
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
    direccion: "",
    alergias: "",
    notas: "",
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
  const [downloadingSummary, setDownloadingSummary] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [summaryFeedback, setSummaryFeedback] = useState("");

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
          direccion: result.direccion,
          alergias: result.alergias,
          notas: result.notas,
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
      profileForm.direccion.trim() !== profileData.direccion ||
      profileForm.alergias.trim() !== profileData.alergias ||
      profileForm.notas.trim() !== profileData.notas,
    [profileForm, profileData]
  );

  function validateProfileForm() {
    if (!profileForm.nombre.trim()) return "El nombre completo es obligatorio.";
    if (profileForm.nombre.trim().length < 4) return "El nombre completo debe tener al menos 4 caracteres.";

    if (!profileForm.telefono.trim()) return "El teléfono es obligatorio.";

    const digits = profileForm.telefono.replace(/\D/g, "");
    if (digits.length < 8) return "Ingresa un teléfono válido de al menos 8 dígitos.";

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
        direccion: profileForm.direccion,
        alergias: profileForm.alergias,
        notas: profileForm.notas,
      });

      setProfileData(updated);
      setProfileForm({
        nombre: updated.nombre,
        telefono: updated.telefono,
        correo: updated.correo,
        direccion: updated.direccion,
        alergias: updated.alergias,
        notas: updated.notas,
      });
      setProfileFeedback("Tus datos se actualizaron correctamente.");

      const currentStoredUser = getStoredUser();
      if (currentStoredUser) {
        localStorage.setItem(
          "user",
            JSON.stringify({
              ...currentStoredUser,
              name: updated.nombre,
              email: updated.correo || currentStoredUser.email,
            })
          );
      }
    } catch (error) {
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
      direccion: profileData.direccion,
      alergias: profileData.alergias,
      notas: profileData.notas,
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
      await updatePatientPassword({
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

  function downloadPdfBlob(blob: Blob, filename: string) {
    const fileUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = fileUrl;
    anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(fileUrl);
  }

  function generatePdfFromSummaryData(data: unknown) {
    const payload = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
    const appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
    const summary = (payload.summary ?? {}) as Record<string, unknown>;
    const generatedAt = new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
    const lines = [
      "Resumen de citas",
      "",
      `Paciente: ${profileData.nombre || "Paciente"}`,
      `Correo: ${profileData.correo || "No registrado"}`,
      `Fecha de generación: ${generatedAt}`,
      "",
      "Resumen general",
      `- Total de citas: ${String(summary.total ?? appointments.length)}`,
      `- Completadas: ${String(summary.completed ?? summary.completadas ?? 0)}`,
      `- Canceladas: ${String(summary.cancelled ?? summary.canceladas ?? 0)}`,
      "",
      "Listado de citas",
    ];

    if (!appointments.length) {
      lines.push("No hay citas registradas para mostrar.");
    } else {
      appointments.slice(0, 30).forEach((entry, index) => {
        const appointment = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
        lines.push(
          `${index + 1}. ${String(appointment.start_at ?? appointment.fecha ?? "Fecha no disponible")} | ${String(
            appointment.status ?? appointment.estado ?? "Sin estado"
          )} | ${String(appointment.reason ?? appointment.motivo ?? "Sin motivo")}`
        );
      });
    }

    const pdfBlob = createBasicPdf(lines);
    downloadPdfBlob(pdfBlob, `resumen-citas-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function createBasicPdf(lines: string[]) {
    const escapeText = (text: string) => text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const normalizedLines = lines.map((line) => escapeText(line.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
    const commands = [
      "BT",
      "/F1 12 Tf",
      "50 790 Td",
      ...normalizedLines.flatMap((line, index) => [`(${line}) Tj`, index < normalizedLines.length - 1 ? "0 -16 Td" : ""]),
      "ET",
    ]
      .filter(Boolean)
      .join("\n");

    const stream = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
      "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
      `5 0 obj ${stream} endobj`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });

    const xrefPosition = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

    return new Blob([pdf], { type: "application/pdf" });
  }

  async function handleDownloadSummary() {
    setSummaryFeedback("");
    setSummaryError("");

    try {
      setDownloadingSummary(true);
      const exportResult = await exportPatientAppointmentSummary();

      if (exportResult.kind === "pdf") {
        downloadPdfBlob(exportResult.blob, exportResult.filename);
      } else {
        generatePdfFromSummaryData(exportResult.data);
      }

      setSummaryFeedback("Tu resumen de citas se descargó correctamente.");
    } catch (error) {
      setSummaryError(
        toErrorMessage(error, "No pudimos generar tu resumen de citas en este momento. Inténtalo nuevamente.")
      );
    } finally {
      setDownloadingSummary(false);
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
          <article className={styles.profileIdentityCard}>
            <div className={styles.profileIdentityTop}>
              <span className={styles.profileAvatar} aria-hidden="true">
                {profileData.nombre?.trim()?.charAt(0).toUpperCase() || "P"}
              </span>
              <div className={styles.profileIdentityMain}>
                <p className={styles.sectionEyebrow}>Cuenta del paciente</p>
                <h3 className={styles.sectionTitle}>{profileData.nombre || "Paciente"}</h3>
                <p className={styles.sectionDescription}>{profileData.correo || "Correo no registrado"}</p>
              </div>
            </div>
            <ul className={styles.profileSummaryList}>
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

            <div className={styles.profileToolBox}>
              <p className={styles.profileToolTitle}>Herramientas de cuenta</p>
              <p className={styles.profileToolText}>
                Descarga un reporte en PDF con tu historial y resumen de citas para conservarlo o compartirlo.
              </p>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={handleDownloadSummary}
                disabled={downloadingSummary}
              >
                {downloadingSummary ? "Generando PDF..." : "Descargar resumen de citas"}
              </button>
              {summaryError && <p className={styles.formError}>{summaryError}</p>}
              {summaryFeedback && <p className={styles.formSuccess}>{summaryFeedback}</p>}
            </div>
          </article>

          <div className={styles.profileContentGrid}>
            <article className={styles.surfaceCard}>
              <header className={styles.sectionHeader}>
                <p className={styles.sectionEyebrow}>Datos personales</p>
                <h3 className={styles.sectionTitle}>Información de contacto</h3>
                <p className={styles.sectionDescription}>Puedes editar únicamente tus datos personales permitidos.</p>
              </header>

              {profileError && <p className={styles.formError}>{profileError}</p>}
              {profileFeedback && <p className={styles.formSuccess}>{profileFeedback}</p>}

              <form className={styles.profileForm} onSubmit={handleSaveProfile}>
                <div className={styles.profileFieldsGrid}>
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
                </div>

                <label className={styles.profileField} htmlFor="profile-email">
                  Correo electrónico
                  <input
                    id="profile-email"
                    value={profileForm.correo}
                    placeholder="tu.correo@ejemplo.com"
                    autoComplete="email"
                    disabled
                    aria-readonly="true"
                  />
                </label>

                <p className={styles.fieldHint}>
                  El correo no se puede editar desde esta sección. Si necesitas cambiarlo, contacta a la clínica.
                </p>

                <div className={styles.profileFieldsGrid}>
                  <label className={styles.profileField} htmlFor="profile-address">
                    Dirección
                    <input
                      id="profile-address"
                      value={profileForm.direccion}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, direccion: event.target.value }))}
                      placeholder="Tu dirección"
                      autoComplete="street-address"
                    />
                  </label>

                  <label className={styles.profileField} htmlFor="profile-allergies">
                    Alergias
                    <input
                      id="profile-allergies"
                      value={profileForm.alergias}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, alergias: event.target.value }))}
                      placeholder="Ej. Penicilina"
                    />
                  </label>
                </div>

                <label className={styles.profileField} htmlFor="profile-notes">
                  Notas
                  <textarea
                    id="profile-notes"
                    value={profileForm.notas}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, notas: event.target.value }))}
                    placeholder="Información adicional relevante para tu atención."
                    rows={4}
                  />
                </label>

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
