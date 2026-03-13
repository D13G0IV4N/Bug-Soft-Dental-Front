import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./clinics.module.css";
import formStyles from "../../styles/formSystem.module.css";

import { getSuperClinicById } from "../../api/clinics";
import {
  createClinicUser,
  deleteClinicUser,
  getClinicUsers,
  updateClinicUser,
  type ClinicUser,
} from "../../api/users";

type ClinicData = {
  id: number;
  name?: string;
  nombre?: string;
  address?: string;
  direccion?: string;
  phone?: string;
  email?: string;
  status?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ReceptionistForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  status: boolean;
};

const emptyReceptionistForm: ReceptionistForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  status: true,
};

function toDate(dateString?: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-MX");
}

export default function ClinicDetailPage() {
  const navigate = useNavigate();
  const { clinicId } = useParams();

  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState("");
  const [usersError, setUsersError] = useState("");

  const [selectedUser, setSelectedUser] = useState<ClinicUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    status: true,
    password: "",
  });

  const [selectedReceptionist, setSelectedReceptionist] = useState<ClinicUser | null>(null);
  const [showReceptionistModal, setShowReceptionistModal] = useState(false);
  const [savingReceptionist, setSavingReceptionist] = useState(false);
  const [receptionistForm, setReceptionistForm] =
    useState<ReceptionistForm>(emptyReceptionistForm);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  async function fetchClinic() {
    if (!clinicId) return;

    try {
      setLoading(true);
      setError("");
      const data = await getSuperClinicById(clinicId);
      setClinic(data);
    } catch (e: any) {
      console.error("Clinic detail error:", e?.response?.data || e);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "No se pudo cargar la información de la clínica"
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    if (!clinicId) return;

    try {
      setUsersLoading(true);
      setUsersError("");
      const data = await getClinicUsers(clinicId);
      setUsers(data);
    } catch (e: any) {
      console.error("Clinic users error:", e?.response?.data || e);
      setUsersError(
        e?.response?.data?.message || e?.message || "No se pudieron cargar los usuarios"
      );
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    fetchClinic();
    fetchUsers();
  }, [clinicId]);

  const adminUser = useMemo(() => users.find((user) => user.role === "admin"), [users]);

  const usersByRole = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const role = user.role || "sin_rol";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [users]);

  const receptionists = useMemo(
    () => users.filter((user) => user.role === "receptionist"),
    [users]
  );

  function openUserEditor(user: ClinicUser) {
    setSelectedUser(user);
    setUserForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role ?? "",
      status: user.status !== false,
      password: "",
    });
    setShowUserModal(true);
  }

  function openReceptionistModal(user?: ClinicUser) {
    if (!user) {
      setSelectedReceptionist(null);
      setReceptionistForm(emptyReceptionistForm);
      setShowReceptionistModal(true);
      return;
    }

    setSelectedReceptionist(user);
    setReceptionistForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      password: "",
      status: user.status !== false,
    });
    setShowReceptionistModal(true);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId || !selectedUser?.id) return;

    try {
      setSavingUser(true);
      await updateClinicUser(clinicId, selectedUser.id, {
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        status: userForm.status,
        password: userForm.password || undefined,
      });
      setShowUserModal(false);
      await fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "No se pudo actualizar el usuario");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleSaveReceptionist(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId) return;

    try {
      setSavingReceptionist(true);

      if (selectedReceptionist?.id) {
        await updateClinicUser(clinicId, selectedReceptionist.id, {
          name: receptionistForm.name,
          email: receptionistForm.email,
          phone: receptionistForm.phone,
          role: "receptionist",
          status: receptionistForm.status,
          password: receptionistForm.password.trim() ? receptionistForm.password : undefined,
        });
      } else {
        await createClinicUser(clinicId, {
          name: receptionistForm.name,
          email: receptionistForm.email,
          phone: receptionistForm.phone,
          password: receptionistForm.password,
          role: "receptionist",
          status: receptionistForm.status,
        });
      }

      setShowReceptionistModal(false);
      await fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "No se pudo guardar la recepcionista");
    } finally {
      setSavingReceptionist(false);
    }
  }

  async function handleDeleteUser(user: ClinicUser) {
    if (!clinicId || !user.id) return;
    const confirmDelete = window.confirm(
      `¿Eliminar a ${user.name || "este usuario"}? Esta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    try {
      await deleteClinicUser(clinicId, user.id);
      await fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "No se pudo eliminar el usuario");
    }
  }

  const clinicName = clinic?.name || clinic?.nombre || `Clínica #${clinicId}`;

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.h1}>{clinicName}</h1>
            <p className={styles.sub}>Panel de detalle y administración de usuarios de clínica.</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={() => navigate("/clinics")}>
              ← Volver
            </button>
            <button
              className={styles.btnGhost}
              onClick={() => navigate(`/clinics/${clinicId}/dentists`)}
            >
              Dentistas
            </button>
            <button
              className={styles.btnGhost}
              onClick={() => navigate(`/clinics/${clinicId}/patients`)}
            >
              Pacientes
            </button>
            <button className={styles.btnGhost} onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.panel}>
            <div className={styles.skeletonRow}>
              <div className={styles.skeleton} />
            </div>
          </div>
        ) : error ? (
          <div className={styles.panel}>
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Error</p>
                <p className={styles.emptyText}>{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.statsGrid}>
              <article className={styles.statCard}>
                <p>Total usuarios</p>
                <strong>{usersLoading ? "-" : users.length}</strong>
              </article>
              <article className={styles.statCard}>
                <p>Administrador</p>
                <strong>{adminUser?.name || "No identificado"}</strong>
              </article>
              <article className={styles.statCard}>
                <p>Recepcionistas</p>
                <strong>{usersLoading ? "-" : receptionists.length}</strong>
              </article>
            </div>

            <section className={styles.panel}>
              <div className={styles.panelTop}>
                <div className={styles.panelTitle}>Información de clínica</div>
              </div>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span>Nombre</span>
                  <strong>{clinicName}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Correo</span>
                  <strong>{clinic?.email || "Sin correo"}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Teléfono</span>
                  <strong>{clinic?.phone || "Sin teléfono"}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Dirección</span>
                  <strong>{clinic?.address || clinic?.direccion || "Sin dirección"}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Creación</span>
                  <strong>{toDate(clinic?.created_at)}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Última actualización</span>
                  <strong>{toDate(clinic?.updated_at)}</strong>
                </div>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTop}>
                <div>
                  <div className={styles.panelTitle}>Recepcionistas de clínica</div>
                  <div className={styles.count}>
                    {usersLoading ? "Cargando..." : `${receptionists.length} registradas`}
                  </div>
                </div>
                <button className={styles.btnPrimary} onClick={() => openReceptionistModal()}>
                  + Crear recepcionista
                </button>
              </div>

              {usersLoading && (
                <div className={styles.skeletonRow}>
                  <div className={styles.skeleton} />
                </div>
              )}

              {!usersLoading && usersError && (
                <div className={styles.empty}>
                  <div className={styles.emptyBox}>
                    <p className={styles.emptyTitle}>No se pudieron cargar recepcionistas</p>
                    <p className={styles.emptyText}>{usersError}</p>
                  </div>
                </div>
              )}

              {!usersLoading && !usersError && receptionists.length === 0 && (
                <div className={styles.empty}>
                  <div className={styles.emptyBox}>
                    <p className={styles.emptyTitle}>Sin recepcionistas</p>
                    <p className={styles.emptyText}>
                      Esta clínica no tiene recepcionistas registradas aún.
                    </p>
                  </div>
                </div>
              )}

              {!usersLoading && !usersError && receptionists.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Estatus</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receptionists.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.name || "Sin nombre"}</strong>
                          </td>
                          <td>{user.email || "-"}</td>
                          <td>{user.phone || "-"}</td>
                          <td>{user.status === false ? "Inactivo" : "Activo"}</td>
                          <td>
                            <div className={styles.tableActions}>
                              <button
                                className={styles.btnGhost}
                                onClick={() => openReceptionistModal(user)}
                              >
                                Editar
                              </button>
                              <button
                                className={styles.btnDanger}
                                onClick={() => handleDeleteUser(user)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTop}>
                <div className={styles.panelTitle}>Usuarios de clínica</div>
                <div className={styles.count}>
                  {Object.entries(usersByRole)
                    .map(([role, total]) => `${role}: ${total}`)
                    .join(" · ") || "Sin usuarios"}
                </div>
              </div>

              {usersLoading && (
                <div className={styles.skeletonRow}>
                  <div className={styles.skeleton} />
                  <div className={styles.skeleton} />
                </div>
              )}

              {!usersLoading && usersError && (
                <div className={styles.empty}>
                  <div className={styles.emptyBox}>
                    <p className={styles.emptyTitle}>No se pudieron cargar los usuarios</p>
                    <p className={styles.emptyText}>{usersError}</p>
                  </div>
                </div>
              )}

              {!usersLoading && !usersError && users.length === 0 && (
                <div className={styles.empty}>
                  <div className={styles.emptyBox}>
                    <p className={styles.emptyTitle}>Sin usuarios</p>
                    <p className={styles.emptyText}>
                      Esta clínica todavía no tiene usuarios registrados.
                    </p>
                  </div>
                </div>
              )}

              {!usersLoading && !usersError && users.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Rol</th>
                        <th>Estatus</th>
                        <th>Extra</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.name || "Sin nombre"}</strong>
                            {user.role === "admin" && (
                              <span className={styles.adminBadge}>Administrador</span>
                            )}
                          </td>
                          <td>{user.email || "-"}</td>
                          <td>{user.phone || "-"}</td>
                          <td>{user.role || "-"}</td>
                          <td>{user.status === false ? "Inactivo" : "Activo"}</td>
                          <td>
                            {user.role === "dentist"
                              ? `${user.dentistProfile?.specialty || "Sin especialidad"} · ${
                                  user.dentistProfile?.licenseNumber || "Sin licencia"
                                }`
                              : "-"}
                          </td>
                          <td>
                            <div className={styles.tableActions}>
                              <button
                                className={styles.btnGhost}
                                onClick={() => openUserEditor(user)}
                              >
                                Editar
                              </button>
                              <button
                                className={styles.btnDanger}
                                onClick={() => handleDeleteUser(user)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showUserModal && selectedUser && (
        <div className={formStyles.modalOverlay} onClick={() => setShowUserModal(false)}>
          <div className={formStyles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={formStyles.modalHeader}><h3 className={formStyles.modalTitle}>Editar usuario</h3></div>
            <div className={formStyles.modalBody}>
            <form onSubmit={handleUpdateUser} className={formStyles.formGrid}>
              <label className={formStyles.field}>
                Nombre
                <input
                  className={formStyles.control}
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  required
                />
              </label>
              <label className={formStyles.field}>
                Correo
                <input
                  className={formStyles.control}
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </label>
              <label className={formStyles.field}>
                Teléfono
                <input
                  className={formStyles.control}
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
              </label>
              <label className={formStyles.field}>
                Rol
                <input
                  className={formStyles.control}
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  required
                />
              </label>
              <label className={formStyles.field}>
                Contraseña (opcional)
                <input
                  className={formStyles.control}
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </label>
              <label className={formStyles.checkboxField}>
                <input
                  type="checkbox"
                  checked={userForm.status}
                  onChange={(e) => setUserForm({ ...userForm, status: e.target.checked })}
                />
                Activo
              </label>

              <div className={formStyles.formActions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setShowUserModal(false)}
                  disabled={savingUser}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={savingUser}>
                  {savingUser ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {showReceptionistModal && (
        <div className={formStyles.modalOverlay} onClick={() => setShowReceptionistModal(false)}>
          <div className={formStyles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={formStyles.modalHeader}><h3 className={formStyles.modalTitle}>{selectedReceptionist ? "Editar recepcionista" : "Crear recepcionista"}</h3></div>
            <div className={formStyles.modalBody}>
            <form onSubmit={handleSaveReceptionist} className={formStyles.formGrid}>
              <label className={formStyles.field}>
                Nombre
                <input
                  className={formStyles.control}
                  value={receptionistForm.name}
                  onChange={(e) =>
                    setReceptionistForm({ ...receptionistForm, name: e.target.value })
                  }
                  required
                />
              </label>
              <label className={formStyles.field}>
                Correo
                <input
                  className={formStyles.control}
                  type="email"
                  value={receptionistForm.email}
                  onChange={(e) =>
                    setReceptionistForm({ ...receptionistForm, email: e.target.value })
                  }
                  required
                />
              </label>
              <label className={formStyles.field}>
                Teléfono
                <input
                  className={formStyles.control}
                  value={receptionistForm.phone}
                  onChange={(e) =>
                    setReceptionistForm({ ...receptionistForm, phone: e.target.value })
                  }
                />
              </label>
              <label className={formStyles.field}>
                Contraseña {selectedReceptionist ? "(opcional)" : ""}
                <input
                  className={formStyles.control}
                  type="password"
                  value={receptionistForm.password}
                  onChange={(e) =>
                    setReceptionistForm({ ...receptionistForm, password: e.target.value })
                  }
                  required={!selectedReceptionist}
                />
              </label>
              <label className={formStyles.checkboxField}>
                <input
                  type="checkbox"
                  checked={receptionistForm.status}
                  onChange={(e) =>
                    setReceptionistForm({ ...receptionistForm, status: e.target.checked })
                  }
                />
                Activo
              </label>

              <div className={formStyles.formActions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setShowReceptionistModal(false)}
                  disabled={savingReceptionist}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={savingReceptionist}>
                  {savingReceptionist ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
