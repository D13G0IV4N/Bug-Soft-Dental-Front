import { useEffect, useMemo, useState } from "react";
import { createService, deleteService, getServiceById, getServices, updateService, type Service } from "../../api/services";
import { getSpecialties, type Specialty } from "../../api/specialties";
import { toErrorMessage } from "../../api/appointments";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

type ServiceFormState = {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  status: boolean;
  specialty_id: string;
};

const emptyForm: ServiceFormState = {
  name: "",
  description: "",
  duration_minutes: "30",
  price: "",
  status: true,
  specialty_id: "",
};

function getServiceSpecialtyName(service: Service, specialties: Specialty[]) {
  if (service.specialty?.name?.trim()) return service.specialty.name.trim();
  return specialties.find((specialty) => specialty.id === service.specialty_id)?.name ?? `#${service.specialty_id}`;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

  const hasSpecialties = specialties.length > 0;
  const activeServices = useMemo(() => services.filter((service) => service.status !== false).length, [services]);

  async function fetchServices() {
    try {
      setLoading(true);
      setError("");
      setServices(await getServices());
    } catch (err) {
      setError(toErrorMessage(err, "No se pudieron cargar los servicios"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchSpecialties() {
    try {
      setSpecialtiesLoading(true);
      const catalog = await getSpecialties({ includeInactive: true });
      setSpecialties(catalog);
    } catch (err) {
      setError(toErrorMessage(err, "No se pudieron cargar las especialidades"));
    } finally {
      setSpecialtiesLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
    fetchSpecialties();
  }, []);

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditing(null);
    setError("");
    setForm(emptyForm);
    setShowModal(true);
  }

  async function openEdit(service: Service) {
    if (!service.id) return;

    try {
      setError("");
      const full = await getServiceById(service.id);
      setEditing(full);
      setForm({
        name: full.name,
        description: full.description ?? "",
        duration_minutes: full.duration_minutes > 0 ? String(full.duration_minutes) : "30",
        price: full.price === null || full.price === undefined ? "" : String(full.price),
        status: full.status !== false,
        specialty_id: full.specialty_id ? String(full.specialty_id) : "",
      });
      setShowModal(true);
    } catch (err) {
      setError(toErrorMessage(err, "No se pudo cargar el servicio"));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const durationMinutes = Number(form.duration_minutes);
    const specialtyId = Number(form.specialty_id);
    const price = form.price.trim() === "" ? null : Number(form.price);

    if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
      setError("Debes seleccionar una especialidad válida.");
      return;
    }

    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      setError("La duración debe ser un número entero mayor que 0.");
      return;
    }

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setError("El precio debe ser un número mayor o igual a 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name,
        description: form.description,
        duration_minutes: durationMinutes,
        price,
        status: form.status,
        specialty_id: specialtyId,
      };

      if (editing?.id) {
        await updateService(editing.id, payload);
      } else {
        await createService(payload);
      }

      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      await fetchServices();
    } catch (err) {
      setError(toErrorMessage(err, "No se pudo guardar el servicio"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service: Service) {
    if (!service.id) return;
    if (!window.confirm(`¿Eliminar el servicio ${service.name}?`)) return;

    try {
      setError("");
      await deleteService(service.id);
      await fetchServices();
    } catch (err) {
      setError(toErrorMessage(err, "No se pudo eliminar el servicio"));
    }
  }

  return (
    <>
      <div className={styles.viewStack}>
        <div className={styles.hero}>
          <div>
            <h2 className={styles.heroTitle}>Servicios</h2>
            <p className={styles.heroSub}>Servicios clínicos vinculados al catálogo de especialidades del backend y limitados a tu clínica.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={openCreate} disabled={specialtiesLoading || !hasSpecialties}>+ Crear servicio</button>
          </div>
        </div>

        <div className={styles.contentCard}>
          <div className={styles.sectionHead}>
            <div>
              <h3 className={styles.sectionTitle}>Catálogo de servicios</h3>
              <p className={styles.sectionSub}>{loading ? "Cargando..." : `${services.length} servicio(s) · ${activeServices} activo(s)`}</p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            {!specialtiesLoading && !hasSpecialties && (
              <div className={styles.empty}>
                <div className={styles.emptyBox}>
                  <p className={styles.emptyTitle}>Primero crea especialidades</p>
                  <p className={styles.emptyText}>El backend exige `specialty_id` en cada servicio, así que necesitas al menos una especialidad disponible para crear o editar servicios.</p>
                </div>
              </div>
            )}

            {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando servicios...</p></div></div>}
            {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}
            {!loading && !error && services.length === 0 && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Sin servicios</p><p className={styles.emptyText}>Crea el primer servicio de la clínica usando una especialidad del backend.</p></div></div>}

            {!loading && !error && services.length > 0 && (
              <div className={styles.listSurface}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Servicio</th><th>Especialidad</th><th>Duración</th><th>Precio</th><th>Estatus</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {services.map((service) => (
                        <tr key={service.id}>
                          <td>
                            <p className={styles.rowTitle}>{service.name}</p>
                            <p className={styles.rowSub}>{service.description?.trim() || "Sin descripción"}</p>
                          </td>
                          <td>
                            <p className={styles.rowTitle}>{getServiceSpecialtyName(service, specialties)}</p>
                            <p className={styles.rowSub}>specialty_id: {service.specialty_id || "—"}</p>
                          </td>
                          <td><p className={styles.rowSub}>{service.duration_minutes} min</p></td>
                          <td><p className={styles.rowSub}>{service.price === null || service.price === undefined ? "Sin precio" : `$${service.price.toFixed(2)}`}</p></td>
                          <td><span className={`${styles.pill} ${service.status === false ? styles.pillOff : styles.pillOn}`}>{service.status === false ? "Inactivo" : "Activo"}</span></td>
                          <td>
                            <div className={styles.tableActions}>
                              <button className={styles.btnGhost} onClick={() => openEdit(service)} disabled={specialtiesLoading}>Editar</button>
                              <button className={styles.btnDanger} onClick={() => handleDelete(service)}>Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className={formStyles.modalOverlay} onClick={closeModal}>
          <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={formStyles.modalHeader}>
              <div>
                <h3 className={formStyles.modalTitle}>{editing ? "Editar servicio" : "Crear servicio"}</h3>
                <p className={formStyles.modalText}>Cada servicio debe pertenecer a una sola especialidad del catálogo backend.</p>
              </div>
            </div>

            <div className={formStyles.modalBody}>
              <form className={formStyles.formGrid} onSubmit={handleSubmit}>
                <label className={formStyles.field}>Nombre *
                  <input className={formStyles.control} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={255} required />
                </label>

                <label className={formStyles.field}>Especialidad *
                  <select className={formStyles.control} value={form.specialty_id} onChange={(event) => setForm((current) => ({ ...current, specialty_id: event.target.value }))} disabled={specialtiesLoading || saving} required>
                    <option value="">Selecciona una especialidad</option>
                    {specialties.map((specialty) => (
                      <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                    ))}
                  </select>
                </label>

                <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Descripción
                  <textarea className={formStyles.control} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe qué incluye el servicio." />
                </label>

                <label className={formStyles.field}>Duración (minutos) *
                  <input className={formStyles.control} type="number" min="1" step="1" value={form.duration_minutes} onChange={(event) => setForm((current) => ({ ...current, duration_minutes: event.target.value }))} required />
                </label>

                <label className={formStyles.field}>Precio
                  <input className={formStyles.control} type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="0.00" />
                </label>

                <label className={formStyles.checkboxField}>
                  <input type="checkbox" checked={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))} />
                  Activo
                </label>

                <p className={formStyles.helper}>
                  {specialtiesLoading
                    ? "Cargando especialidades desde el backend..."
                    : hasSpecialties
                      ? "El valor enviado al backend será specialty_id, nunca texto libre."
                      : "No hay especialidades disponibles en el backend."}
                </p>

                {error && <div className={formStyles.error} style={{ whiteSpace: "pre-line" }}>{error}</div>}

                <div className={formStyles.formActions}>
                  <button type="button" className={styles.btnGhost} onClick={closeModal} disabled={saving}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary} disabled={saving || specialtiesLoading || !hasSpecialties}>{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear servicio"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
