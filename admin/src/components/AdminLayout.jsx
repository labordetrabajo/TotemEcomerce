import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "./Icons";

const pageMeta = {
  "/": {
    title: "Productos",
    subtitle: "Gestioná el catálogo, precios, stock y categorías.",
  },
  "/orders": {
    title: "Órdenes",
    subtitle: "Seguimiento en tiempo real de ventas y preparación.",
  },
  "/totems": {
    title: "Tótems",
    subtitle: "Administrá los equipos habilitados para tomar pedidos.",
  },
};

function TotemNavIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2.5" width="14" height="16" rx="2.5" />
      <path d="M9 21.5h6" />
      <path d="M12 18.5v3" />
      <path d="M9 6.5h6" />
      <circle cx="12" cy="14" r="1" />
    </svg>
  );
}

function AdminLayout({ children }) {
  const location = useLocation();
  const meta = pageMeta[location.pathname] || pageMeta["/"];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">PP</div>
          <div>
            <strong>Punto Pedido</strong>
            <span>Panel de control</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Navegación principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon name="products" />
            <span>Productos</span>
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon name="orders" />
            <span>Órdenes</span>
          </NavLink>

          <NavLink
            to="/totems"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <TotemNavIcon />
            <span>Tótems</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <span className="connection-dot" />
          <div>
            <strong>Sistema conectado</strong>
            <span>Actualización en tiempo real</span>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="page-eyebrow">Administración</p>
            <h1>{meta.title}</h1>
            <p className="page-subtitle">{meta.subtitle}</p>
          </div>

          <div className="admin-user-pill">
            <div className="admin-user-avatar">AD</div>
            <div>
              <strong>Administrador</strong>
              <span>Sesión local</span>
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}

export default AdminLayout;
