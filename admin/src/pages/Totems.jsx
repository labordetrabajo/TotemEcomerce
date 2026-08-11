import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import "./Totems.css";

const EMPTY_FORM = {
  username: "",
  name: "",
  password: "",
  active: true,
};

function formatDate(value) {
  if (!value) return "Nunca";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function Totems() {
  const [totems, setTotems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTotem, setEditingTotem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const loadTotems = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const data = await apiRequest("/totems");
      setTotems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los tótems");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadTotems();
  }, []);

  const filteredTotems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return totems;

    return totems.filter((totem) => {
      return (
        totem.username?.toLowerCase().includes(term) ||
        totem.name?.toLowerCase().includes(term)
      );
    });
  }, [totems, search]);

  const stats = useMemo(() => {
    const active = totems.filter((totem) => totem.active).length;
    const orders = totems.reduce(
      (total, totem) => total + Number(totem._count?.orders || 0),
      0
    );

    return {
      total: totems.length,
      active,
      inactive: totems.length - active,
      orders,
    };
  }, [totems]);

  const openCreate = () => {
    setEditingTotem(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (totem) => {
    setEditingTotem(totem);
    setForm({
      username: totem.username || "",
      name: totem.name || "",
      password: "",
      active: Boolean(totem.active),
    });
    setError("");
    setModalOpen(true);
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setModalOpen(false);
    setEditingTotem(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const username = form.username.trim().toUpperCase();
    const name = form.name.trim();
    const password = form.password.trim();

    if (!username || !name) {
      setError("Completá el usuario y el nombre del tótem.");
      return;
    }

    if (!editingTotem && password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    if (editingTotem && password && password.length < 4) {
      setError("La nueva contraseña debe tener al menos 4 caracteres.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        username,
        name,
        active: form.active,
      };

      if (password) {
        payload.password = password;
      }

      if (editingTotem) {
        await apiRequest(`/totems/${editingTotem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/totems", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      closeModal(true);
      await loadTotems({ silent: true });
    } catch (err) {
      setError(err.message || "No se pudo guardar el tótem");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (totem) => {
    try {
      setActionId(totem.id);
      setError("");

      await apiRequest(`/totems/${totem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !totem.active,
        }),
      });

      await loadTotems({ silent: true });
    } catch (err) {
      setError(err.message || "No se pudo cambiar el estado del tótem");
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="totems-page">
      <div className="page-actions">
        <div className="page-actions-copy">
          <h2>Equipos habilitados</h2>
          <p>
            Creá una cuenta diferente para cada tótem y adaptala a cada cliente o
            ubicación.
          </p>
        </div>

        <button className="primary-button" type="button" onClick={openCreate}>
          <span className="totem-plus">+</span>
          Nuevo tótem
        </button>
      </div>

      <div className="stats-grid totem-stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Total</span>
            <span className="totem-stat-dot neutral" />
          </div>
          <strong>{stats.total}</strong>
          <small>tótems registrados</small>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Activos</span>
            <span className="totem-stat-dot active" />
          </div>
          <strong>{stats.active}</strong>
          <small>pueden iniciar sesión</small>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Desactivados</span>
            <span className="totem-stat-dot inactive" />
          </div>
          <strong>{stats.inactive}</strong>
          <small>acceso bloqueado</small>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Pedidos</span>
            <span className="totem-stat-dot orders" />
          </div>
          <strong>{stats.orders}</strong>
          <small>órdenes asociadas</small>
        </div>
      </div>

      {error && !modalOpen && (
        <div className="totem-alert" role="alert">
          {error}
        </div>
      )}

      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Listado de tótems</h3>
            <p>Usuarios disponibles para los equipos de autoservicio.</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-field totem-search-field">
            <span className="totem-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuario o nombre..."
              aria-label="Buscar tótem"
            />
          </div>
        </div>

        {loading ? (
          <div className="totem-loading">Cargando tótems...</div>
        ) : filteredTotems.length === 0 ? (
          <div className="empty-state">
            <div>
              <div className="empty-state-icon">T</div>
              <h3>No hay tótems para mostrar</h3>
              <p>
                {search
                  ? "No encontramos coincidencias con esa búsqueda."
                  : "Creá el primer tótem para empezar a asociar pedidos."}
              </p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table totems-table">
              <thead>
                <tr>
                  <th>Tótem</th>
                  <th>Estado</th>
                  <th>Pedidos</th>
                  <th>Último acceso</th>
                  <th>Creado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filteredTotems.map((totem) => (
                  <tr key={totem.id}>
                    <td>
                      <div className="totem-name-cell">
                        <div className="totem-device-icon">T{totem.id}</div>
                        <div>
                          <span className="table-primary">{totem.username}</span>
                          <span className="table-secondary">{totem.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`totem-status-pill ${
                          totem.active ? "active" : "inactive"
                        }`}
                      >
                        <span />
                        {totem.active ? "Activo" : "Desactivado"}
                      </span>
                    </td>
                    <td>
                      <span className="totem-order-count">
                        {Number(totem._count?.orders || 0)}
                      </span>
                    </td>
                    <td>{formatDate(totem.lastLoginAt)}</td>
                    <td>{formatDate(totem.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="totem-inline-button"
                          type="button"
                          onClick={() => openEdit(totem)}
                        >
                          Editar
                        </button>
                        <button
                          className={`totem-inline-button ${
                            totem.active ? "danger" : "success"
                          }`}
                          type="button"
                          disabled={actionId === totem.id}
                          onClick={() => toggleActive(totem)}
                        >
                          {actionId === totem.id
                            ? "Guardando..."
                            : totem.active
                              ? "Desactivar"
                              : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="totem-modal-backdrop" onMouseDown={closeModal}>
          <div
            className="totem-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="totem-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="totem-modal-header">
              <div>
                <span className="page-eyebrow">
                  {editingTotem ? "Configuración" : "Nuevo equipo"}
                </span>
                <h2 id="totem-modal-title">
                  {editingTotem ? "Editar tótem" : "Crear tótem"}
                </h2>
                <p>
                  {editingTotem
                    ? "Podés cambiar el usuario, nombre, contraseña y estado."
                    : "Estos datos se usarán para iniciar sesión en el equipo."}
                </p>
              </div>

              <button
                className="totem-modal-close"
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="totem-username">Usuario</label>
                  <input
                    id="totem-username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Ej. CLIENTE_TOTEM_01"
                    autoComplete="off"
                  />
                  <span className="form-help">
                    Se guarda en mayúsculas y debe ser único.
                  </span>
                </div>

                <div className="form-field">
                  <label htmlFor="totem-name">Nombre / ubicación</label>
                  <input
                    id="totem-name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Ej. Entrada principal"
                    autoComplete="off"
                  />
                  <span className="form-help">
                    Es el nombre que vas a ver en órdenes y reportes.
                  </span>
                </div>

                <div className="form-field full">
                  <label htmlFor="totem-password">
                    {editingTotem ? "Nueva contraseña" : "Contraseña"}
                  </label>
                  <input
                    id="totem-password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={
                      editingTotem
                        ? "Dejar vacío para mantener la actual"
                        : "Mínimo 4 caracteres"
                    }
                    autoComplete="new-password"
                  />
                  <span className="form-help">
                    {editingTotem
                      ? "Solo completala si querés reemplazar la contraseña actual."
                      : "Esta contraseña se usará únicamente en el tótem."}
                  </span>
                </div>

                {editingTotem && (
                  <div className="form-field full">
                    <label className="totem-checkbox-row">
                      <input
                        type="checkbox"
                        name="active"
                        checked={form.active}
                        onChange={handleChange}
                      />
                      <span>
                        <strong>Tótem activo</strong>
                        <small>
                          Si lo desactivás, su sesión dejará de ser válida para
                          crear nuevas órdenes.
                        </small>
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {error && (
                <div className="totem-alert modal-alert" role="alert">
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving
                    ? "Guardando..."
                    : editingTotem
                      ? "Guardar cambios"
                      : "Crear tótem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Totems;
