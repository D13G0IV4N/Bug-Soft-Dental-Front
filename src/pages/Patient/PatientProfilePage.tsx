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

type ReportAppointment = {
  servicio: string;
  odontologo: string;
  fecha: string;
  hora: string;
  estado: string;
  motivo: string;
  notas: {
    note: string;
    createdAt: string;
    authorName: string;
  }[];
  clinica: string;
};

type AppointmentExportReport = {
  pacienteNombre: string;
  pacienteCorreo: string;
  generatedAt: string;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  appointments: ReportAppointment[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(status: string) {
  const key = status.toLowerCase().trim();
  if (["completed", "completada", "completado"].includes(key)) return "Completada";
  if (["cancelled", "canceled", "cancelada", "cancelado"].includes(key)) return "Cancelada";
  if (["pending", "pendiente"].includes(key)) return "Pendiente";
  if (["scheduled", "programada", "confirmada", "confirmed"].includes(key)) return "Programada";
  return status || "Sin estado";
}

function normalizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function parseDateParts(value: unknown) {
  const raw = toText(value);
  if (!raw) return { fecha: "No registrada", hora: "No registrada" };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { fecha: raw, hora: "No registrada" };
  return {
    fecha: date.toLocaleDateString("es-ES", { dateStyle: "long" }),
    hora: date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
  };
}

function getValueFromKeys(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && toText(value)) return toText(value);
  }
  return "";
}

function resolveAppointmentReason(appointment: Record<string, unknown>, nestedAppointment: Record<string, unknown>) {
  return getValueFromKeys(appointment, ["reason"]) || getValueFromKeys(nestedAppointment, ["reason"]) || "Sin motivo registrado";
}

function formatNoteCreatedAt(value: unknown) {
  const raw = toText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
}

function resolveAppointmentNotes(appointment: Record<string, unknown>, nestedAppointment: Record<string, unknown>) {
  const notesValue = Array.isArray(appointment.notes)
    ? appointment.notes
    : Array.isArray(nestedAppointment.notes)
      ? nestedAppointment.notes
      : [];

  return notesValue
    .map((entry) => {
      const noteRecord = asRecord(entry);
      const authorRecord = asRecord(noteRecord.author);
      const note = toText(noteRecord.note);
      if (!note) return null;

      return {
        note,
        createdAt: formatNoteCreatedAt(noteRecord.created_at),
        authorName: getValueFromKeys(authorRecord, ["name"]),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function findAppointmentsArray(payload: unknown): unknown[] {
  const queue: unknown[] = [payload];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (Array.isArray(current)) {
      if (current.some((item) => {
        const record = asRecord(item);
        return Boolean(record.start_at || record.fecha || record.service_name || record.servicio || record.status || record.estado);
      })) {
        return current;
      }
      continue;
    }
    const record = asRecord(current);
    const explicitAppointments = record.appointments;
    if (Array.isArray(explicitAppointments)) return explicitAppointments;
    Object.values(record).forEach((value) => queue.push(value));
  }
  return [];
}

function findFirstRecordByKey(payload: unknown, keys: string[]) {
  const queue: unknown[] = [payload];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (Array.isArray(current)) {
      current.forEach((entry) => queue.push(entry));
      continue;
    }
    const record = asRecord(current);
    if (keys.some((key) => record[key] !== undefined)) return record;
    Object.values(record).forEach((value) => queue.push(value));
  }
  return {};
}

function buildAppointmentExportReport(data: unknown, profileData: PatientProfileData): AppointmentExportReport {
  const appointmentsRaw = findAppointmentsArray(data);
  const patientRecord = findFirstRecordByKey(data, ["patient", "patient_name", "nombre", "correo", "email"]);
  const summaryRecord = findFirstRecordByKey(data, ["summary", "total", "completed", "cancelled", "pending", "programadas"]);
  const nestedSummary = asRecord(summaryRecord.summary);

  const appointments = appointmentsRaw.map((entry) => {
    const appointment = asRecord(entry);
    const nestedAppointment = asRecord(appointment.appointment);
    const serviceRecord = asRecord(appointment.service);
    const dentistRecord = asRecord(appointment.dentist);
    const clinicRecord = asRecord(appointment.clinic);
    const startRaw = appointment.start_at ?? nestedAppointment.start_at ?? appointment.fecha ?? appointment.date;
    const { fecha, hora } = parseDateParts(startRaw);
    const reason = resolveAppointmentReason(appointment, nestedAppointment);
    const notes = resolveAppointmentNotes(appointment, nestedAppointment);

    return {
      servicio:
        getValueFromKeys(appointment, ["servicio", "service_name", "service"]) ||
        getValueFromKeys(nestedAppointment, ["service_name", "service"]) ||
        getValueFromKeys(serviceRecord, ["name"]) ||
        "Servicio no especificado",
      odontologo:
        getValueFromKeys(appointment, ["odontologo", "dentist_name"]) ||
        getValueFromKeys(nestedAppointment, ["dentist_name"]) ||
        getValueFromKeys(dentistRecord, ["name"]) ||
        "No especificado",
      fecha,
      hora:
        getValueFromKeys(appointment, ["hora"]) ||
        `${hora}${toText(appointment.end_at) ? ` - ${parseDateParts(appointment.end_at).hora}` : ""}`,
      estado: normalizeStatus(getValueFromKeys(appointment, ["estado", "status"]) || getValueFromKeys(nestedAppointment, ["status"]) || "Sin estado"),
      motivo: reason,
      notas: notes,
      clinica:
        getValueFromKeys(appointment, ["clinic_name", "clinica"]) ||
        getValueFromKeys(nestedAppointment, ["clinic_name", "clinica"]) ||
        getValueFromKeys(clinicRecord, ["name"]) ||
        profileData.clinica ||
        "Clinica dental",
    } satisfies ReportAppointment;
  });

  const patientNested = asRecord(patientRecord.patient);
  const patientName =
    getValueFromKeys(patientRecord, ["patient_name", "nombre", "name"]) ||
    getValueFromKeys(patientNested, ["nombre", "name"]) ||
    profileData.nombre ||
    "Paciente";
  const patientEmail =
    getValueFromKeys(patientRecord, ["correo", "email", "patient_email"]) ||
    getValueFromKeys(patientNested, ["correo", "email"]) ||
    profileData.correo ||
    "No registrado";

  const total = Number(nestedSummary.total ?? summaryRecord.total ?? appointments.length) || appointments.length;
  const completed = Number(nestedSummary.completed ?? summaryRecord.completed ?? nestedSummary.completadas ?? summaryRecord.completadas ?? 0) || 0;
  const cancelled = Number(nestedSummary.cancelled ?? summaryRecord.cancelled ?? nestedSummary.canceladas ?? summaryRecord.canceladas ?? 0) || 0;
  const pending =
    Number(
      nestedSummary.pending ??
      summaryRecord.pending ??
      nestedSummary.programadas ??
      summaryRecord.programadas ??
      nestedSummary.scheduled ??
      summaryRecord.scheduled ??
      0
    ) || 0;

  return {
    pacienteNombre: patientName,
    pacienteCorreo: patientEmail,
    generatedAt: new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" }),
    total,
    completed,
    cancelled,
    pending,
    appointments,
  };
}

function createStyledAppointmentPdf(report: AppointmentExportReport) {
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const pages: string[] = [""];
  let pageIndex = 0;
  let y = PAGE_HEIGHT - MARGIN;

  function addPage() {
    pages.push("");
    pageIndex += 1;
    y = PAGE_HEIGHT - MARGIN;
  }

  function add(command: string) {
    pages[pageIndex] += `${command}\n`;
  }

  function rect(x: number, rectY: number, w: number, h: number, fillRgb?: [number, number, number], stroke = false) {
    if (fillRgb) add(`${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg`);
    if (stroke) add("0.83 0.86 0.92 RG");
    add(`${x.toFixed(2)} ${rectY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fillRgb && stroke ? "B" : fillRgb ? "f" : "S"}`);
  }

  function text(value: string, x: number, textY: number, size = 10, font: "F1" | "F2" = "F1", color: [number, number, number] = [0.1, 0.13, 0.2]) {
    add("BT");
    add(`/${font} ${size} Tf`);
    add(`${color[0]} ${color[1]} ${color[2]} rg`);
    add(`${x.toFixed(2)} ${textY.toFixed(2)} Td`);
    add(`(${escapePdfText(value)}) Tj`);
    add("ET");
  }

  function splitText(value: string, maxWidth: number, size: number) {
    const words = normalizePdfText(value).split(" ").filter(Boolean);
    if (!words.length) return [""];
    const lines: string[] = [];
    let current = words[0];
    const maxChars = Math.max(12, Math.floor(maxWidth / (size * 0.5)));
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${current} ${words[i]}`;
      if (candidate.length > maxChars) {
        lines.push(current);
        current = words[i];
      } else {
        current = candidate;
      }
    }
    lines.push(current);
    return lines;
  }

  function ensureSpace(height: number) {
    if (y - height < MARGIN) addPage();
  }

  rect(MARGIN, PAGE_HEIGHT - MARGIN - 95, CONTENT_WIDTH, 95, [0.93, 0.96, 1], true);
  text("Portal Odontologico", MARGIN + 16, PAGE_HEIGHT - MARGIN - 28, 11, "F2", [0.2, 0.33, 0.54]);
  text("Resumen de citas", MARGIN + 16, PAGE_HEIGHT - MARGIN - 50, 23, "F2", [0.08, 0.12, 0.22]);
  text(`Generado: ${report.generatedAt}`, MARGIN + 16, PAGE_HEIGHT - MARGIN - 72, 10, "F1", [0.28, 0.34, 0.45]);
  y = PAGE_HEIGHT - MARGIN - 120;

  ensureSpace(98);
  rect(MARGIN, y - 88, CONTENT_WIDTH, 88, [0.98, 0.985, 1], true);
  text("Informacion del paciente", MARGIN + 14, y - 24, 12, "F2", [0.12, 0.19, 0.32]);
  text(`Nombre: ${report.pacienteNombre}`, MARGIN + 14, y - 46, 11, "F1");
  text(`Correo: ${report.pacienteCorreo}`, MARGIN + 14, y - 66, 11, "F1");
  y -= 106;

  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const cardHeight = 64;
  ensureSpace(cardHeight * 2 + gap + 24);
  text("Resumen general", MARGIN, y, 13, "F2", [0.12, 0.19, 0.32]);
  y -= 14;
  const cards = [
    { label: "Total de citas", value: String(report.total) },
    { label: "Completadas", value: String(report.completed) },
    { label: "Canceladas", value: String(report.cancelled) },
    { label: "Programadas/Pendientes", value: String(report.pending) },
  ];
  cards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + col * (cardWidth + gap);
    const cardY = y - row * (cardHeight + gap);
    rect(x, cardY - cardHeight, cardWidth, cardHeight, [0.95, 0.97, 1], true);
    text(card.label, x + 12, cardY - 24, 10, "F1", [0.25, 0.31, 0.44]);
    text(card.value, x + 12, cardY - 48, 20, "F2", [0.08, 0.12, 0.22]);
  });
  y -= cardHeight * 2 + gap + 26;

  ensureSpace(30);
  text("Historial completo de citas", MARGIN, y, 14, "F2", [0.12, 0.19, 0.32]);
  y -= 16;

  if (!report.appointments.length) {
    ensureSpace(42);
    rect(MARGIN, y - 40, CONTENT_WIDTH, 40, [0.99, 0.99, 1], true);
    text("No hay citas disponibles en el export para este paciente.", MARGIN + 12, y - 24, 10);
  } else {
    report.appointments.forEach((appointment, index) => {
      const notesLines = splitText(`Motivo: ${appointment.motivo}`, CONTENT_WIDTH - 24, 10);
      const appointmentNotesLines = appointment.notas.length
        ? appointment.notas.flatMap((noteEntry, noteIndex) => {
          const metadata = [noteEntry.createdAt, noteEntry.authorName ? `Autor: ${noteEntry.authorName}` : ""].filter(Boolean).join(" · ");
          const detail = metadata ? ` (${metadata})` : "";
          return splitText(`${noteIndex === 0 ? "Notas: " : "       "}• ${noteEntry.note}${detail}`, CONTENT_WIDTH - 24, 10);
        })
        : splitText("Notas: Sin notas registradas", CONTENT_WIDTH - 24, 10);
      const cardHeightDynamic = 92 + (notesLines.length + appointmentNotesLines.length) * 12;
      ensureSpace(cardHeightDynamic + 12);

      rect(MARGIN, y - cardHeightDynamic, CONTENT_WIDTH, cardHeightDynamic, [1, 1, 1], true);
      text(`Cita #${index + 1}`, MARGIN + 12, y - 20, 11, "F2", [0.11, 0.16, 0.3]);

      const statusColor: [number, number, number] =
        appointment.estado === "Completada" ? [0.16, 0.5, 0.26] : appointment.estado === "Cancelada" ? [0.7, 0.2, 0.2] : [0.73, 0.48, 0.1];
      rect(PAGE_WIDTH - MARGIN - 122, y - 28, 110, 18, [0.96, 0.97, 1], true);
      text(appointment.estado, PAGE_WIDTH - MARGIN - 114, y - 16, 10, "F2", statusColor);

      text(`Servicio: ${appointment.servicio}`, MARGIN + 12, y - 38, 10);
      text(`Odontologo: ${appointment.odontologo}`, MARGIN + 12, y - 54, 10);
      text(`Fecha: ${appointment.fecha}  |  Hora: ${appointment.hora}`, MARGIN + 12, y - 70, 10);
      text(`Clinica: ${appointment.clinica}`, MARGIN + 12, y - 86, 10);

      let textY = y - 102;
      notesLines.forEach((line) => {
        text(line, MARGIN + 12, textY, 10, "F1", [0.2, 0.22, 0.3]);
        textY -= 12;
      });
      appointmentNotesLines.forEach((line) => {
        text(line, MARGIN + 12, textY, 10, "F1", [0.2, 0.22, 0.3]);
        textY -= 12;
      });

      y -= cardHeightDynamic + 12;
    });
  }

  ensureSpace(30);
  text("Reporte generado automaticamente por el portal del paciente.", MARGIN, 24, 9, "F1", [0.44, 0.48, 0.57]);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kidsRefs = pages.map((_, idx) => `${idx * 2 + 3} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kidsRefs}] /Count ${pages.length} >>`);

  pages.forEach((stream, idx) => {
    const pageObjectId = idx * 2 + 3;
    const contentObjectId = idx * 2 + 4;
    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
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
    const report = buildAppointmentExportReport(data, profileData);
    const pdfBlob = createStyledAppointmentPdf(report);
    downloadPdfBlob(pdfBlob, `resumen-citas-${new Date().toISOString().slice(0, 10)}.pdf`);
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
