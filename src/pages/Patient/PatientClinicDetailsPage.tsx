import { useEffect, useMemo, useState } from "react";
import { getPublicClinics, extractPublicClinics } from "../../api/clinics";
import { getServices, type Service } from "../../api/services";
import { getClinicUsers, type ClinicUser } from "../../api/users";
import { me } from "../../api/auth";
import { toErrorMessage } from "../../api/appointments";
import { getStoredUser, resolveClinicId, resolveClinicName } from "../../utils/auth";
import styles from "./patient.module.css";

type ClinicDetailsData = {
  clinic: {
    id: number | null;
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  services: Service[];
  dentists: ClinicUser[];
};

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3.8" width="16" height="16.4" rx="2.8" />
      <path d="M8 8.2h2M8 12h2M8 15.8h2M14 8.2h2M14 12h2M14 15.8h2M12 20.2V17" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.8a6 6 0 0 1 6 6c0 4.8-4.8 9.5-6 9.5-1.3 0-6-4.7-6-9.5a6 6 0 0 1 6-6Z" />
      <circle cx="12" cy="9.7" r="2" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.2v4.9a4.4 4.4 0 0 0 8.8 0V4.2" />
      <path d="M4.8 4.2h4.4M14.8 4.2h4.4" />
      <path d="M15.2 14.2a3.8 3.8 0 1 0 3.8 3.8v-3.3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.8" y="5.6" width="16.4" height="12.8" rx="2" />
      <path d="m4.8 7.4 7.2 5.6 7.2-5.6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.6 4.8h2.5l1.2 3.5-1.5 1.4a13.2 13.2 0 0 0 4.5 4.5l1.4-1.5 3.5 1.2v2.5A1.6 1.6 0 0 1 18 18c-6.6 0-12-5.4-12-12 0-.7.6-1.2 1.6-1.2Z" />
    </svg>
  );
}

function SpecialtyTag({ name }: { name: string }) {
  return <span className={styles.dentistSpecialtyTag}>{name}</span>;
}

export default function PatientClinicDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ClinicDetailsData>({
    clinic: {
      id: null,
      name: "Clínica dental",
      address: "",
      phone: "",
      email: "",
    },
    services: [],
    dentists: [],
  });

  useEffect(() => {
    let active = true;

    async function loadClinicDetails() {
      try {
        setLoading(true);

        const userFromStorage = getStoredUser();
        const meResponse = await me();
        const mePayload = meResponse?.data?.data ?? meResponse?.data ?? {};

        const clinicId = resolveClinicId(mePayload) ?? resolveClinicId(userFromStorage);
        const clinicName =
          resolveClinicName(mePayload) ||
          resolveClinicName(userFromStorage) ||
          "Clínica dental";

        const [publicClinicsResponse, servicesResponse, dentistsResponse] = await Promise.all([
          getPublicClinics().catch(() => null),
          getServices().catch(() => []),
          clinicId ? getClinicUsers(clinicId).catch(() => []) : Promise.resolve([]),
        ]);

        if (!active) return;

        const publicClinics = publicClinicsResponse
          ? extractPublicClinics(publicClinicsResponse)
          : [];

        const matchedClinic = publicClinics.find((clinic) => Number(clinic.id) === clinicId) ?? null;
        const clinicInfoFromMe = (mePayload?.clinic ?? mePayload?.profile?.clinic ?? {}) as Record<string, unknown>;

        const clinicAddress =
          (typeof matchedClinic?.address === "string" ? matchedClinic.address : "") ||
          (typeof clinicInfoFromMe.address === "string" ? clinicInfoFromMe.address : "");

        const clinicPhone =
          (typeof matchedClinic?.phone === "string" ? matchedClinic.phone : "") ||
          (typeof clinicInfoFromMe.phone === "string" ? clinicInfoFromMe.phone : "");

        const clinicEmail =
          (typeof matchedClinic?.email === "string" ? matchedClinic.email : "") ||
          (typeof clinicInfoFromMe.email === "string" ? clinicInfoFromMe.email : "");

        const servicesByClinic = (servicesResponse ?? [])
          .filter((service) => service.status !== false)
          .filter((service) => (clinicId ? service.clinic_id === clinicId || service.clinic_id === undefined : true));

        const dentists = (dentistsResponse ?? []).filter((user) => user.role === "dentist" && user.status !== false);

        setData({
          clinic: {
            id: clinicId,
            name: matchedClinic?.name || clinicName,
            address: clinicAddress,
            phone: clinicPhone,
            email: clinicEmail,
          },
          services: servicesByClinic,
          dentists,
        });

        setError("");
      } catch (requestError) {
        if (!active) return;
        setError(toErrorMessage(requestError, "No pudimos cargar los detalles de tu clínica por ahora."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadClinicDetails();

    return () => {
      active = false;
    };
  }, []);

  const dentistsWithSpecialties = useMemo(
    () =>
      data.dentists.map((dentist) => ({
        ...dentist,
        specialtyNames: dentist.dentistProfile?.specialties?.map((item) => item.name).filter(Boolean) ?? [],
      })),
    [data.dentists]
  );

  if (loading) {
    return (
      <section className={styles.dashboardRoot}>
        <article className={styles.surfaceCard}>
          <p className={styles.compactState}>Cargando detalles de la clínica...</p>
        </article>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.dashboardRoot}>
        <article className={styles.errorCard}>
          <h2 className={styles.errorTitle}>No pudimos cargar los detalles de la clínica.</h2>
          <p className={styles.errorBody}>{error}</p>
          <button className={styles.primaryAction} type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className={styles.clinicDetailsRoot}>
      <header className={styles.clinicHeroCard}>
        <span className={styles.clinicHeroIcon}>
          <BuildingIcon />
        </span>
        <div>
          <p className={styles.welcomeEyebrow}>Detalles de la clínica</p>
          <h2 className={styles.welcomeTitle}>{data.clinic.name}</h2>
          <p className={styles.welcomeDescription}>
            Aquí puedes conocer la información principal de tu clínica, sus servicios disponibles y el equipo odontológico
            que te acompaña.
          </p>
        </div>
      </header>

      <article className={styles.clinicInfoCard}>
        <header className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Información general</p>
          <h3 className={styles.sectionTitle}>Datos de tu clínica</h3>
          <p className={styles.sectionDescription}>Una vista rápida para ubicar y contactar fácilmente tu sede.</p>
        </header>

        <div className={styles.clinicInfoGrid}>
          <div className={styles.clinicInfoItem}>
            <span className={styles.clinicInfoIcon}><BuildingIcon /></span>
            <div>
              <p className={styles.clinicInfoLabel}>Nombre de la clínica</p>
              <p className={styles.clinicInfoValue}>{data.clinic.name}</p>
            </div>
          </div>

          <div className={styles.clinicInfoItem}>
            <span className={styles.clinicInfoIcon}><MapPinIcon /></span>
            <div>
              <p className={styles.clinicInfoLabel}>Ubicación</p>
              <p className={styles.clinicInfoValue}>{data.clinic.address || "Dirección no disponible por el momento."}</p>
            </div>
          </div>

          <div className={styles.clinicInfoItem}>
            <span className={styles.clinicInfoIcon}><PhoneIcon /></span>
            <div>
              <p className={styles.clinicInfoLabel}>Teléfono</p>
              <p className={styles.clinicInfoValue}>{data.clinic.phone || "No disponible"}</p>
            </div>
          </div>

          <div className={styles.clinicInfoItem}>
            <span className={styles.clinicInfoIcon}><MailIcon /></span>
            <div>
              <p className={styles.clinicInfoLabel}>Correo</p>
              <p className={styles.clinicInfoValue}>{data.clinic.email || "No disponible"}</p>
            </div>
          </div>
        </div>
      </article>

      <div className={styles.clinicSectionsGrid}>
        <article className={styles.surfaceCard}>
          <header className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Servicios</p>
            <h3 className={styles.sectionTitle}>Servicios que ofrece la clínica</h3>
            <p className={styles.sectionDescription}>Tratamientos disponibles para tus citas y seguimiento dental.</p>
          </header>

          {data.services.length === 0 ? (
            <div className={styles.emptyStateCard}>
              <h4 className={styles.emptyStateTitle}>Aún no hay servicios publicados.</h4>
              <p className={styles.emptyStateText}>
                Estamos actualizando la oferta de tratamientos. Pronto verás aquí los servicios de tu clínica.
              </p>
            </div>
          ) : (
            <div className={styles.serviceCardsGrid}>
              {data.services.map((service) => (
                <article className={styles.serviceSummaryCard} key={service.id}>
                  <h4 className={styles.serviceSummaryTitle}>{service.name}</h4>
                  {service.description ? (
                    <p className={styles.serviceSummaryDescription}>{service.description}</p>
                  ) : (
                    <p className={styles.serviceSummaryDescription}>Servicio clínico disponible en tu sede.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className={styles.surfaceCard}>
          <header className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Equipo odontológico</p>
            <h3 className={styles.sectionTitle}>Odontólogos de tu clínica</h3>
            <p className={styles.sectionDescription}>Profesionales disponibles para atender tu tratamiento.</p>
          </header>

          {dentistsWithSpecialties.length === 0 ? (
            <div className={styles.emptyStateCard}>
              <h4 className={styles.emptyStateTitle}>No hay odontólogos visibles por ahora.</h4>
              <p className={styles.emptyStateText}>
                Cuando el equipo esté disponible para pacientes, aparecerá aquí con su especialidad.
              </p>
            </div>
          ) : (
            <div className={styles.dentistCardsGrid}>
              {dentistsWithSpecialties.map((dentist) => (
                <article className={styles.dentistCard} key={dentist.id}>
                  <div className={styles.dentistCardTop}>
                    <span className={styles.dentistAvatar} aria-hidden="true">
                      {dentist.name?.trim()?.charAt(0).toUpperCase() || "D"}
                    </span>
                    <div>
                      <h4 className={styles.dentistName}>{dentist.name || "Odontólogo"}</h4>
                      <p className={styles.dentistRole}>Odontología clínica</p>
                    </div>
                  </div>

                  <div className={styles.dentistSpecialtiesWrap}>
                    {dentist.specialtyNames.length > 0 ? (
                      dentist.specialtyNames.map((specialty) => <SpecialtyTag key={`${dentist.id}-${specialty}`} name={specialty} />)
                    ) : (
                      <span className={styles.dentistSpecialtyTagMuted}>Especialidad por confirmar</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className={styles.clinicAssistCard}>
        <span className={styles.clinicAssistIcon}>
          <StethoscopeIcon />
        </span>
        <div>
          <h3 className={styles.sectionTitle}>¿Necesitas ayuda para agendar?</h3>
          <p className={styles.sectionDescription}>
            Si no encuentras el servicio o profesional que buscas, contáctanos y te ayudaremos a programar tu próxima
            cita.
          </p>
        </div>
      </article>
    </section>
  );
}
