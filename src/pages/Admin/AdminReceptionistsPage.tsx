import { useEffect, useState } from "react";
import styles from "../Dentists/dentists.module.css";
import {
  createReceptionist,
  deleteReceptionist,
  getReceptionistById,
  getReceptionists,
  updateReceptionist,
  type AdminClinicUser,
} from "../../api/admin";

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
        <div className={styles.panelTitle}>Recepcionistas</div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true); }}>+ Crear recepcionista</button>
          <button className={styles.btnGhost} onClick={fetchItems} disabled={loading}>Actualizar</button>
        </div>
      </div>

      {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando...</p></div></div>}
      {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}

      {!loading && !error && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Estatus</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td><td>{item.email}</td><td>{item.phone || "-"}</td><td>{item.status === false ? "Inactivo" : "Activo"}</td>
                  <td><div className={styles.tableActions}><button className={styles.btnPrimary} onClick={() => openEdit(item)}>Editar</button><button className={styles.btnDanger} onClick={() => onDelete(item)}>Eliminar</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <h3>{editing ? "Editar recepcionista" : "Crear recepcionista"}</h3>
            <form className={styles.formGrid} onSubmit={onSubmit}>
              <label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Correo<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label>Teléfono<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label>Contraseña {editing ? "(opcional)" : ""}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} /></label>
              <label className={styles.checkboxField}><input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Activo</label>
              <div className={styles.actions}><button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
