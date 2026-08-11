const STATUS_LABELS = {
  pending: "Pendiente",
  paid: "Pagada",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Entregada",
  cancelled: "Cancelada",
  canceled: "Cancelada",
  expired: "Vencida",
  refunded: "Reembolsada",
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Sin estado";
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status || "unknown"}`}>
      <span className="status-badge-dot" />
      {getStatusLabel(status)}
    </span>
  );
}

export default StatusBadge;
