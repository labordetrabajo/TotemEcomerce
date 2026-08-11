import { useMemo, useState } from "react";

import "./ProductCard.css";

import { useCart } from "../context/CartContext";
import {
  getProductFallback,
  getProductImage,
} from "../utils/productImage";

function ProductCard({ product }) {
  const { cart, addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const cartItem = useMemo(
    () => cart.find((item) => item.id === product.id),
    [cart, product.id]
  );

  const stock = Number(product.stock || 0);
  const quantityInCart = cartItem?.quantity || 0;
  const soldOut = stock <= 0;
  const reachedLimit = quantityInCart >= stock && stock > 0;
  const lowStock = stock > 0 && stock <= 5;

  const formatPrice = (price) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const handleAddToCart = () => {
    if (soldOut || reachedLimit) {
      return;
    }

    addToCart(product);
    setJustAdded(true);

    window.setTimeout(() => {
      setJustAdded(false);
    }, 850);
  };

  const buttonText = soldOut
    ? "Sin stock"
    : reachedLimit
      ? "Máximo agregado"
      : justAdded
        ? "¡Agregado!"
        : "Agregar";

  return (
    <article className={`product-card ${soldOut ? "sold-out" : ""}`}>
      <div className="product-media">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="product-image"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = getProductFallback(product);
          }}
        />

        {product.category?.name && (
          <span className="product-category">
            {product.category.name}
          </span>
        )}

        {quantityInCart > 0 && (
          <span className="product-cart-quantity">
            {quantityInCart} en tu pedido
          </span>
        )}

        {soldOut && (
          <div className="sold-out-overlay">
            <span>Agotado</span>
          </div>
        )}
      </div>

      <div className="product-content">
        <div className="product-heading-row">
          <h3>{product.name}</h3>

          {lowStock && (
            <span className="low-stock-badge">
              Últimas {stock}
            </span>
          )}
        </div>

        <p className="product-description">
          {product.description?.trim() ||
            "Preparado para disfrutar en el momento."}
        </p>

        <div className="product-footer">
          <strong className="product-price">
            {formatPrice(product.price)}
          </strong>

          <button
            type="button"
            className={`add-button ${justAdded ? "added" : ""}`}
            onClick={handleAddToCart}
            disabled={soldOut || reachedLimit}
          >
            <span>{buttonText}</span>
            {!soldOut && !reachedLimit && !justAdded && (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
