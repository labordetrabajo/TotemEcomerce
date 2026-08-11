import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { Icon } from "../components/Icons";
import StatusBadge, { getStatusLabel } from "../components/StatusBadge";
import { apiRequest } from "../services/api";
import "./Orders.css";

const STATUS_OPTIONS = [
  ["all", "Todos los estados"],
  ["pending", "Pendiente"],
  ["paid", "Pagada"],
  ["preparing", "En preparación"],
  ["ready", "Lista"],
  ["delivered", "Entregada"],
  ["cancelled", "Cancelada"],
  ["expired", "Vencida"],
  ["refunded", "Reembolsada"],
];

const ALLOWED_TRANSITIONS = {
  pending: ["pending"],
  paid: ["paid", "preparing"],
  preparing: ["preparing", "ready"],
  ready: ["ready", "delivered"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
  canceled: ["cancelled"],
  expired: ["expired"],
  refunded: ["refunded"],
};

const formatPrice = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadOrders = async ({ silent = false } = {}) => {
    try {
      if (!silent) setPageError("");
      const data = await apiRequest("/orders");
      const safeOrders = Array.isArray(data) ? data : [];
      setOrders(safeOrders);
      setLastUpdated(new Date());

      setSelectedOrder((current) => {
        if (!current) return null;
        return safeOrders.find((order) => order.id === current.id) || current;
      });
    } catch (error) {
      console.error(error);
      if (!silent) setPageError(error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const intervalId = window.setInterval(() => {
      loadOrders({ silent: true });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        String(order.id).includes(normalizedSearch) ||
        order.totem?.username?.toLowerCase().includes(normalizedSearch) ||
        order.totem?.name?.toLowerCase().includes(normalizedSearch) ||
        order.items?.some((item) =>
          item.product?.name?.toLowerCase().includes(normalizedSearch)
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const activeSalesStatuses = new Set(["paid", "preparing", "ready", "delivered"]);
  const totalSales = orders
    .filter((order) => activeSalesStatuses.has(order.status))
    .reduce((total, order) => total + Number(order.total || 0), 0);

  const pendingCount = orders.filter((order) => order.status === "pending").length;
  const preparingCount = orders.filter(
    (order) => order.status === "preparing"
  ).length;
  const readyCount = orders.filter((order) => order.status === "ready").length;

  const handleView = async (id) => {
    try {
      const data = await apiRequest(`/orders/${id}`);
      setSelectedOrder(data);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      setUpdatingOrderId(id);
      await apiRequest(`/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      await loadOrders({ silent: true });

      if (selectedOrder?.id === id) {
        const detail = await apiRequest(`/orders/${id}`);
        setSelectedOrder(detail);
      }
    } catch (error) {
      console.error(error);
      window.alert(error.message || "Error actualizando el estado");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <>
      <div className="page-actions">
        <div className="page-actions-copy">
          <h2>Operación en tiempo real</h2>
          <p>
            El panel se actualiza cada 3 segundos
            {lastUpdated ? ` · Última actualización ${lastUpdated.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={() => loadOrders()}>
          <Icon name="refresh" size={17} />
          Actualizar ahora
        </button>
      </div>

      {pageError && (
        <p className="page-error">
          <Icon name="alert" size={18} />
          {pageError}
        </p>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Ventas confirmadas</span>
            <span className="stat-icon"><Icon name="money" size={18} /></span>
          </div>
          <strong>{formatPrice(totalSales)}</strong>
          <small>Pagadas y en proceso</small>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Pendientes</span>
            <span className="stat-icon"><Icon name="clock" size={18} /></span>
          </div>
          <strong>{pendingCount}</strong>
          <small>Esperando pago o vencimiento</small>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">En preparación</span>
            <span className="stat-icon"><Icon name="orders" size={18} /></span>
          </div>
          <strong>{preparingCount}</strong>
          <small>Órdenes en cocina</small>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Listas</span>
            <span className="stat-icon"><Icon name="check" size={18} /></span>
          </div>
          <strong>{readyCount}</strong>
          <small>Esperando entrega</small>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Órdenes</h3>
            <p>{filteredOrders.length} resultado(s)</p>
          </div>
          <span className="live-indicator"><span /> En vivo</span>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por orden, producto o tótem"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrar por estado"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty-state">
            <div>
              <div className="empty-state-icon"><Icon name="refresh" /></div>
              <h3>Cargando órdenes…</h3>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div>
              <div className="empty-state-icon"><Icon name="orders" /></div>
              <h3>No hay órdenes para mostrar</h3>
              <p>Probá cambiar los filtros de búsqueda.</p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table orders-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Fecha</th>
                  <th>Tótem</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const transitionOptions =
                    ALLOWED_TRANSITIONS[order.status] || [order.status];

                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="order-number">#{order.id}</span>
                        <span className="table-secondary">
                          {order.mercadoPagoOrderId ? "QR Mercado Pago" : "Orden local"}
                        </span>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        {order.totem ? (
                          <div className="totem-cell">
                            <span className="totem-avatar">
                              {order.totem.username?.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase() || "T"}
                            </span>
                            <span className="totem-cell-copy">
                              <strong>{order.totem.username}</strong>
                              <small>{order.totem.name || "Sin ubicación"}</small>
                            </span>
                          </div>
                        ) : (
                          <div className="totem-cell totem-cell-empty">
                            <span className="totem-avatar">—</span>
                            <span className="totem-cell-copy">
                              <strong>Sin tótem</strong>
                              <small>Orden anterior</small>
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="table-primary">
                          {order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0} artículo(s)
                        </span>
                        <span className="table-secondary order-products-preview">
                          {order.items?.slice(0, 2).map((item) => item.product?.name || "Producto").join(" · ") || "Sin detalle"}
                        </span>
                      </td>
                      <td><span className="price-cell">{formatPrice(order.total)}</span></td>
                      <td>
                        <div className="order-status-control">
                          <StatusBadge status={order.status} />
                          <select
                            value={order.status}
                            onChange={(event) => handleStatusChange(order.id, event.target.value)}
                            disabled={updatingOrderId === order.id || transitionOptions.length === 1}
                            aria-label={`Cambiar estado de la orden ${order.id}`}
                          >
                            {transitionOptions.map((status) => (
                              <option key={status} value={status}>{getStatusLabel(status)}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-button"
                            onClick={() => handleView(order.id)}
                            aria-label={`Ver orden ${order.id}`}
                            title="Ver detalle"
                          >
                            <Icon name="eye" size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selectedOrder)}
        title={selectedOrder ? `Orden #${selectedOrder.id}` : "Detalle de orden"}
        subtitle={selectedOrder ? formatDate(selectedOrder.createdAt) : ""}
        onClose={() => setSelectedOrder(null)}
        size="lg"
      >
        {selectedOrder && (
          <div className="order-detail">
            <div className="order-detail-summary">
              <div>
                <span>Estado actual</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div>
                <span>Total</span>
                <strong>{formatPrice(selectedOrder.total)}</strong>
              </div>
              <div>
                <span>Pago</span>
                <strong>{selectedOrder.paymentStatus || "Sin información"}</strong>
              </div>
              <div>
                <span>Tótem</span>
                {selectedOrder.totem ? (
                  <>
                    <strong>{selectedOrder.totem.username}</strong>
                    <small className="order-detail-totem-name">
                      {selectedOrder.totem.name || "Sin ubicación"}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>Sin tótem</strong>
                    <small className="order-detail-totem-name">
                      Orden creada antes de la asignación
                    </small>
                  </>
                )}
              </div>
            </div>

            <div className="order-detail-section-title">
              <h3>Productos</h3>
              <span>{selectedOrder.items?.length || 0} línea(s)</span>
            </div>

            <div className="order-items-list">
              {selectedOrder.items?.map((item) => (
                <article key={item.id} className="order-item-card">
                  <div className="order-item-quantity">{item.quantity}×</div>
                  <div className="order-item-copy">
                    <strong>{item.product?.name || "Producto eliminado"}</strong>
                    <span>{formatPrice(item.price)} por unidad</span>
                  </div>
                  <strong className="order-item-total">
                    {formatPrice(Number(item.price) * Number(item.quantity))}
                  </strong>
                </article>
              ))}
            </div>

            <div className="order-detail-total">
              <span>Total de la orden</span>
              <strong>{formatPrice(selectedOrder.total)}</strong>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default Orders;
