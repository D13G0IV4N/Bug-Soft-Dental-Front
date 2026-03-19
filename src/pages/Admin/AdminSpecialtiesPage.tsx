import { useEffect, useState } from "react";
import {
  createSpecialty,
  deleteSpecialty,
  getSpecialties,
  updateSpecialty,
  type Specialty,
} from "../../api/specialties";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

type SpecialtyFormState = {
  name: string;
  description: string;
  status: boolean;
};

const emptyForm: SpecialtyFormState = {
  name: "",
  description: "",
  status: true,
};

export default function AdminSpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SpecialtyFormState>(emptyForm);

  async function fetchSpecialties() {
    try {
      setLoading(true);
      setError("");
      const catalog = await getSpecialties({ includeInactive: true });
      setSpecialties(catalog);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las especialidades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSpecialties();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(specialty: Specialty) {
    setEditing(specialty);
    setForm({
      name: specialty.name,
      description: specialty.description ?? "",
      status: specialty.status !== false,
    });
    setShowModal(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editing?.id) {
        await updateSpecialty(editing.id, form);
      } else {
        await createSpecialty(form);
      }

      setShowModal(false);
      await fetchSpecialties();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la especialidad");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(specialty: Specialty) {
    if (!specialty.id) return;
    if (!window.confirm(`¿Eliminar la especialidad ${specialty.name}?`)) return;

    try {
      setError("");
      await deleteSpecialty(specialty.id);
      await fetchSpecialties();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la especialidad");
    }
  }

  return (
    <>
      <div className={styles.viewStack}>
        <div className={styles.hero}>
          <div>
            <h2 className={styles.heroTitle}>Especialidades</h2>
            <p className={styles.heroSub}>
              Catálogo maestro para asignación de dentistas y servicios en toda la clínica.
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={openCreate}>+ Crear especialidad</button>
          </div>
        </div>

        <div className={styles.contentCard}>
          <div className={styles.sectionHead}>
            <div>
              <h3 className={styles.sectionTitle}>Catálogo de especialidades</h3>
              <p className={styles.sectionSub}>{loading ? "Cargando..." : `${specialties.length} especialidad(es)`}</p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando especialidades...</p></div></div>}
            {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}
            {!loading && !error && specialties.length === 0 && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Sin especialidades</p><p className={styles.emptyText}>Crea la primera especialidad para reutilizarla en dentistas y servicios.</p></div></div>}

            {!loading && !error && specialties.length > 0 && (
              <div className={styles.listSurface}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Nombre</th><th>Descripción</th><th>Estatus</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {specialties.map((specialty) => (
                        <tr key={specialty.id}>
                          <td><p className={styles.rowTitle}>{specialty.name}</p></td>
                          <td><p className={styles.rowSub}>{specialty.description?.trim() || "Sin descripción"}</p></td>
                          <td><span className={`${styles.pill} ${specialty.status === false ? styles.pillOff : styles.pillOn}`}>{specialty.status === false ? "Inactiva" : "Activa"}</span></td>
                          <td>
                            <div className={styles.tableActions}>
                              <button className={styles.btnGhost} onClick={() => openEdit(specialty)}>Editar</button>
                              <button className={styles.btnDanger} onClick={() => handleDelete(specialty)}>Eliminar</button>
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
        <div className={formStyles.modalOverlay} onClick={() => !saving && setShowModal(false)}>
          <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={formStyles.modalHeader}>
              <div>
                <h3 className={formStyles.modalTitle}>{editing ? "Editar especialidad" : "Crear especialidad"}</h3>
                <p className={formStyles.modalText}>Este catálogo es la fuente de verdad para dentistas y servicios.</p>
              </div>
            </div>

            <div className={formStyles.modalBody}>
              <form className={formStyles.formGrid} onSubmit={handleSubmit}>
                <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
                  Nombre *
                  <input
                    className={formStyles.control}
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ortodoncia"
                    maxLength={255}
                    required
                  />
                </label>

                <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
                  Descripción
                  <textarea
                    className={formStyles.control}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Tratamientos y diagnóstico relacionados con ortodoncia."
                  />
                </label>

                <label className={formStyles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))}
                  />
                  Activa
                </label>

                {error && <div className={formStyles.error}>{error}</div>}

                <div className={formStyles.formActions}>
                  <button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear especialidad"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
