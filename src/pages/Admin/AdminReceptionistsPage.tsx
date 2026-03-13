import { useEffect, useState } from "react";
import {
  createReceptionist,
  deleteReceptionist,
  getReceptionistById,
  getReceptionists,
  updateReceptionist,
  type AdminClinicUser,
} from "../../api/admin";
import styles from "./admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

type ReceptionistForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  status: boolean;
};

const emptyForm: ReceptionistForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  status: true,
};

export default function AdminReceptionistsPage() {
  const [items, setItems] = useState<AdminClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdminClinicUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ReceptionistForm>(emptyForm);

  async function fetchItems() {
    try {
      setLoading(true);
      setError("");
      setItems(await getReceptionists());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar recepcionistas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function openEdit(item: AdminClinicUser) {
    if (!item.id) return;
    const detail = await getReceptionistById(item.id);
    setEditing(detail);
    setForm({
      name: detail.name,
      email: detail.email,
      phone: detail.phone ?? "",
      password: "",
      status: detail.status !== false,
    });
    setShowModal(true);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editing?.id) {
        await updateReceptionist(editing.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password.trim() ? form.password : undefined,
          status: form.status,
        });
      } else {
        await createReceptionist(form);
      }
      setShowModal(false);
      await fetchItems();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: AdminClinicUser) {
    if (!item.id) return;
    if (!window.confirm(`¿Eliminar a ${item.name}?`)) return;
    await deleteReceptionist(item.id);
    await fetchItems();
  }

  return (
    <>
      <div className={styles.panelTop}>
        <div>
          <h2 className={styles.panelTitle}>Recepcionistas</h2>
          <p className={styles.panelSub}>Controla acceso del equipo de recepción.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true); }}>+ Crear recepcionista</button>
        </div>
      </div>

      <div className={styles.sectionBody}>
        {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando recepcionistas...</p></div></div>}
        {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}
        {!loading && !error && items.length === 0 && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Sin recepcionistas</p><p className={styles.emptyText}>Crea el primer perfil para comenzar.</p></div></div>}

        {!loading && !error && items.length > 0 && (
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Nombre</th><th>Contacto</th><th>Estatus</th><th>Acciones</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td><p className={styles.rowTitle}>{item.name}</p></td>
                      <td>
                        <p className={styles.rowTitle}>{item.email}</p>
                        <p className={styles.rowSub}>{item.phone || "Sin teléfono"}</p>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${item.status === false ? styles.pillOff : styles.pillOn}`}>
                          {item.status === false ? "Inactivo" : "Activo"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button className={styles.btnGhost} onClick={() => openEdit(item)}>Editar</button>
                          <button className={styles.btnDanger} onClick={() => onDelete(item)}>Eliminar</button>
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

      {showModal && (
        <div className={formStyles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={formStyles.modalHeader}>
              <h3 className={formStyles.modalTitle}>{editing ? "Editar recepcionista" : "Crear recepcionista"}</h3>
              <p className={formStyles.modalText}>Completa los datos para mantener el equipo actualizado.</p>
            </div>
            <div className={formStyles.modalBody}>
              <form className={formStyles.formGrid} onSubmit={onSubmit}>
                <label className={formStyles.field}>Nombre<input className={formStyles.control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                <label className={formStyles.field}>Correo<input className={formStyles.control} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
                <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label className={formStyles.field}>Contraseña {editing ? "(opcional)" : ""}<input className={formStyles.control} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} /></label>
                <label className={formStyles.checkboxField}><input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Activo</label>
                <div className={formStyles.formActions}><button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
