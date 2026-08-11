import { useEffect, useMemo, useState } from "react";

import "./App.css";

import { getProducts } from "./services/api";
import { useCart } from "./context/CartContext";
import { useTotemAuth } from "./context/TotemAuthContext";

import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import TotemLogin from "./components/TotemLogin";

const ALL_CATEGORY = "Todos";

function App() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { cart } = useCart();
  const { isElectron, isCheckingSession, session } = useTotemAuth();

  const brandName = import.meta.env.VITE_BRAND_NAME || "Punto Pedido";
  const brandSubtitle = import.meta.env.VITE_BRAND_SUBTITLE || "Elegí, pagá y disfrutá";

  const loadProducts = async () => {
    try {
      setError("");
      setLoading(true);
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron && (!session || isCheckingSession)) {
      return;
    }

    loadProducts();
  }, [isElectron, session, isCheckingSession]);

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category?.name)
      .filter(Boolean);

    return [ALL_CATEGORY, ...new Set(values)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) {
      return products;
    }

    return products.filter(
      (product) => product.category?.name === activeCategory
    );
  }, [products, activeCategory]);

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0
  );

  const formatPrice = (value) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(value));

  if (isElectron && isCheckingSession) {
    return <TotemLogin checking />;
  }

  if (isElectron && !session) {
    return <TotemLogin />;
  }

  return (
    <div className="kiosk-shell">
      <div className="kiosk-app">
        <header className="kiosk-header">
          <div className="brand-mark" aria-hidden="true">
            <span>PP</span>
          </div>

          <div className="brand-copy">
            <p className="brand-eyebrow">Autoservicio</p>
            <h1>{brandName}</h1>
            <p>{brandSubtitle}</p>
          </div>

          <div className="header-status">
            <span className="status-dot" />
            Pedidos activos
          </div>
        </header>

        <section className="welcome-panel">
          <div>
            <p className="welcome-kicker">Armá tu pedido</p>
            <h2>¿Qué vas a elegir hoy?</h2>
            <p className="welcome-description">
              Tocá un producto para agregarlo. Podés revisar tu
              pedido antes de pagar.
            </p>
          </div>

          <div className="welcome-number" aria-hidden="true">01</div>
        </section>

        <nav className="category-nav" aria-label="Categorías">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-button ${
                activeCategory === category ? "active" : ""
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </nav>

        <main className="products-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Menú</p>
              <h2>{activeCategory}</h2>
            </div>

            <span className="product-count">
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1 ? "producto" : "productos"}
            </span>
          </div>

          {loading && (
            <div className="loading-grid" aria-label="Cargando">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="product-skeleton" key={index} />
              ))}
            </div>
          )}

          {error && (
            <div className="error-panel">
              <strong>No pudimos cargar el menú</strong>
              <p>{error}</p>
              <button type="button" onClick={loadProducts}>Reintentar</button>
            </div>
          )}

          {!loading && !error && visibleProducts.length === 0 && (
            <div className="empty-panel">
              <span aria-hidden="true">🍔</span>
              <h3>No hay productos disponibles</h3>
              <p>Elegí otra categoría o volvé a intentarlo.</p>
            </div>
          )}

          {!loading && !error && visibleProducts.length > 0 && (
            <div className="products-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>

      <button
        type="button"
        className={`order-dock ${totalItems > 0 ? "has-items" : ""}`}
        onClick={() => setIsCartOpen(true)}
        aria-label="Abrir mi pedido"
      >
        <span className="order-dock-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H7" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>
        </span>

        <span className="order-dock-copy">
          <small>
            {totalItems > 0
              ? `${totalItems} ${totalItems === 1 ? "producto" : "productos"}`
              : "Todavía no agregaste productos"}
          </small>
          <strong>Ver mi pedido</strong>
        </span>

        <span className="order-dock-total">
          {totalItems > 0 ? formatPrice(cartTotal) : "Abrir"}
        </span>
      </button>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </div>
  );
}

export default App;
