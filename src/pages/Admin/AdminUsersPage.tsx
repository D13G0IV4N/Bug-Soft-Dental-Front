import { useEffect, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUserById,
  getAdminUsers,
  updateAdminUser,
  type AdminClinicUser,
} from "../../api/admin";
import styles from "./admin.module.css";

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: boolean;
  password: string;
};

const emptyForm: UserFormState = {
  name: "",
  email: "",
  phone: "",
  role: "dentist",
  status: true,
  password: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminClinicUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError("");
      setUsers(await getAdminUsers());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  async function openEdit(user: AdminClinicUser) {
    if (!user.id) return;
    try {
      const full = await getAdminUserById(user.id);
      setEditing(full);
      setForm({
        name: full.name,
        email: full.email,
        phone: full.phone ?? "",
        role: full.role,
        status: full.status !== false,
        password: "",
      });
      setShowModal(true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo cargar el usuario");
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
          role: form.role,
          status: form.status,
          password: form.password.trim() ? form.password : undefined,
        });
      } else {
        await createAdminUser({ ...form });
      }
      setShowModal(false);
      await fetchUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(user: AdminClinicUser) {
    if (!user.id) return;
    if (!window.confirm(`¿Eliminar a ${user.name}?`)) return;

    try {
      await deleteAdminUser(user.id);
      await fetchUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <div className={styles.panelTop}>
        <div>
          <h2 className={styles.panelTitle}>Usuarios de mi clínica</h2>
          <p className={styles.panelSub}>Administra roles internos y estado de acceso.</p>
        </div>  
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={openCreate}>+ Crear Dentista</button>
          <button className={styles.btnSoft} onClick={fetchUsers} disabled={loading}>Actualizar</button>
        </div>
      </div>

      {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando usuarios...</p></div></div>}
      {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}
      {!loading && !error && users.length === 0 && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Sin usuarios</p><p className={styles.emptyText}>Crea el primer usuario para comenzar.</p></div></div>}

      {!loading && !error && users.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Nombre</th><th>Contacto</th><th>Rol</th><th>Estatus</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className={styles.rowTitle}>{user.name}</p>
                  </td>
                  <td>
                    <p className={styles.rowTitle}>{user.email}</p>
                    <p className={styles.rowSub}>{user.phone || "Sin teléfono"}</p>
                  </td>
                  <td>
                    <span className={`${styles.pill} ${styles.pillRole}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`${styles.pill} ${user.status === false ? styles.pillOff : styles.pillOn}`}>
                      {user.status === false ? "Inactivo" : "Activo"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.btnGhost} onClick={() => openEdit(user)}>Editar</button>
                      <button className={styles.btnDanger} onClick={() => onDelete(user)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>{editing ? "Editar usuario" : "Crear usuario"}</h3>
              <p className={styles.modalText}>Completa la información para {editing ? "actualizar" : "registrar"} el usuario.</p>
            </div>

            <form className={styles.formGrid} onSubmit={onSubmit}>
              <label className={styles.field}>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label className={styles.field}>Correo<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label className={styles.field}>Teléfono<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className={styles.field}>Rol
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="dentist">Dentista</option>
                  <option value="receptionist">Recepcionista</option>
                  <option value="client">Paciente/Cliente</option>
                </select>
              </label>
              <label className={styles.field}>Contraseña {editing ? "(opcional)" : ""}
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
              </label>
              <label className={styles.checkboxField}><input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Activo</label>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}