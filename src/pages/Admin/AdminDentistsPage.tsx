import { useEffect, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminDentists,
  getAdminUserById,
  updateAdminUser,
  type AdminClinicUser,
} from "../../api/admin";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

type DentistFormState = {
  name: string;
  email: string;
  phone: string;
  status: boolean;
  password: string;
};

const emptyForm: DentistFormState = {
  name: "",
  email: "",
  phone: "",
  status: true,
  password: "",
};

export default function AdminDentistsPage() {
  const [dentists, setDentists] = useState<AdminClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminClinicUser | null>(null);
  const [form, setForm] = useState<DentistFormState>(emptyForm);

  async function fetchDentists() {
    try {
      setLoading(true);
      setError("");
      setDentists(await getAdminDentists());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los dentistas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDentists();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  async function openEdit(dentist: AdminClinicUser) {
    if (!dentist.id) return;
    try {
      const full = await getAdminUserById(dentist.id);
      setEditing(full);
      setForm({
        name: full.name,
        email: full.email,
        phone: full.phone ?? "",
        status: full.status !== false,
        password: "",
      });
      setShowModal(true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo cargar el dentista");
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editing?.id) {
        await updateAdminUser(editing.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: "dentist",
          status: form.status,
          password: form.password.trim() ? form.password : undefined,
        });
      } else {
        await createAdminUser({ ...form, role: "dentist" });
      }
      setShowModal(false);
      await fetchDentists();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo guardar el dentista");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(dentist: AdminClinicUser) {
    if (!dentist.id) return;
    if (!window.confirm(`¿Eliminar a ${dentist.name}?`)) return;

    try {
      await deleteAdminUser(dentist.id);
      await fetchDentists();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar el dentista");
    }
  }

  return (
    <>
      <div className={styles.viewStack}>
        <div className={styles.hero}>
          <div>
            <h2 className={styles.heroTitle}>Dentistas</h2>
            <p className={styles.heroSub}>Gestiona únicamente a los dentistas y su acceso al sistema.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={openCreate}>+ Crear dentista</button>
          </div>
        </div>

        <div className={styles.contentCard}>
          <div className={styles.sectionHead}>
            <div>
              <h3 className={styles.sectionTitle}>Directorio de dentistas</h3>
              <p className={styles.sectionSub}>{loading ? "Cargando..." : `${dentists.length} dentista(s)`}</p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando dentistas...</p></div></div>}
            {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}
            {!loading && !error && dentists.length === 0 && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Sin dentistas</p><p className={styles.emptyText}>Crea el primer dentista para comenzar.</p></div></div>}

            {!loading && !error && dentists.length > 0 && (
              <div className={styles.listSurface}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Nombre</th><th>Contacto</th><th>Rol</th><th>Estatus</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {dentists.map((dentist) => (
                        <tr key={dentist.id}>
                          <td><p className={styles.rowTitle}>{dentist.name}</p></td>
                          <td><p className={styles.rowTitle}>{dentist.email}</p><p className={styles.rowSub}>{dentist.phone || "Sin teléfono"}</p></td>
                          <td><span className={`${styles.pill} ${styles.pillRole}`}>dentist</span></td>
                          <td><span className={`${styles.pill} ${dentist.status === false ? styles.pillOff : styles.pillOn}`}>{dentist.status === false ? "Inactivo" : "Activo"}</span></td>
                          <td>
                            <div className={styles.tableActions}>
                              <button className={styles.btnGhost} onClick={() => openEdit(dentist)}>Editar</button>
                              <button className={styles.btnDanger} onClick={() => onDelete(dentist)}>Eliminar</button>
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
        <div className={formStyles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={formStyles.modalHeader}>
              <h3 className={formStyles.modalTitle}>{editing ? "Editar dentista" : "Crear dentista"}</h3>
              <p className={formStyles.modalText}>Completa la información para {editing ? "actualizar" : "registrar"} el dentista.</p>
            </div>

            <div className={formStyles.modalBody}>
              <form className={formStyles.formGrid} onSubmit={onSubmit}>
                <label className={formStyles.field}>Nombre<input className={formStyles.control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                <label className={formStyles.field}>Correo<input className={formStyles.control} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
                <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label className={formStyles.field}>Rol
                  <input className={formStyles.control} value="Dentista" readOnly aria-readonly="true" />
                </label>
                <label className={formStyles.field}>Contraseña {editing ? "(opcional)" : ""}
                  <input className={formStyles.control} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
                </label>
                <label className={formStyles.checkboxField}><input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Activo</label>
                <div className={formStyles.formActions}>
                  <button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Guardando..." : editing ? "Guardar dentista" : "Crear dentista"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
