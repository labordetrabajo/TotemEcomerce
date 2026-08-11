import { useState } from "react";

import "./Cart.css";

import { useCart } from "../context/CartContext";
import {
  cancelQrPayment,
  createOrder,
  createQrPayment,
} from "../services/api";
import {
  getProductFallback,
  getProductImage,
} from "../utils/productImage";

import PaymentQR from "./PaymentQR";

function Cart({ isOpen, onClose }) {
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentData, setPaymentData] = useState(null);

  const formatPrice = (price) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const total = cart.reduce(
    (accumulator, item) =>
      accumulator + Number(item.price) * item.quantity,
    0
  );

  const totalItems = cart.reduce(
    (accumulator, item) => accumulator + item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setCheckoutError("");

      const items = cart.map((item) => ({
        productId: Number(item.id),
        quantity: Number(item.quantity),
      }));

      const ticketItems = cart.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
      }));

      const order = await createOrder(items);

      if (!order?.id) {
        throw new Error("No se pudo crear la orden");
      }

      const qrPayment = await createQrPayment(order.id);

      if (!qrPayment?.qrData) {
        throw new Error(
          "Mercado Pago no devolvió los datos del QR"
        );
      }

      setPaymentData({
        qrData: qrPayment.qrData,
        orderId: qrPayment.orderId || order.id,
        total: qrPayment.total || order.total,
        items: ticketItems,
      });
    } catch (error) {
      console.error("Error procesando la orden:", error);
      setCheckoutError(
        error.message || "No se pudo generar el pago QR"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentData) {
    return (
      <PaymentQR
        qrData={paymentData.qrData}
        orderId={paymentData.orderId}
        total={paymentData.total}
        items={paymentData.items}
        onCancel={async ({ skipRemote = false } = {}) => {
          if (!skipRemote) {
            await cancelQrPayment(paymentData.orderId);
          }

          setPaymentData(null);
        }}
        onPaymentApproved={() => {
          clearCart();
          window.location.reload();
        }}
      />
    );
  }

  return (
    <>
      <div
        className={`cart-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        className={`cart-panel ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="cart-header">
          <div>
            <p>Resumen</p>
            <h2>Tu pedido</h2>
          </div>

          <button
            type="button"
            className="cart-close-button"
            onClick={onClose}
            aria-label="Cerrar pedido"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="cart-content">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H7" />
                  <circle cx="10" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                </svg>
              </div>
              <h3>Tu pedido está vacío</h3>
              <p>Agregá productos del menú para continuar.</p>
              <button type="button" onClick={onClose}>
                Volver al menú
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map((item) => (
                <article key={item.id} className="cart-item">
                  <img
                    src={getProductImage(item)}
                    alt=""
                    className="cart-item-image"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src =
                        getProductFallback(item);
                    }}
                  />

                  <div className="cart-item-info">
                    <div className="cart-item-title-row">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{formatPrice(item.price)} c/u</p>
                      </div>

                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                        </svg>
                      </button>
                    </div>

                    <div className="cart-item-bottom">
                      <div className="quantity-controls">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          disabled={item.quantity <= 1}
                          aria-label={`Disminuir ${item.name}`}
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          disabled={
                            item.quantity >= Number(item.stock)
                          }
                          aria-label={`Aumentar ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <strong>
                        {formatPrice(
                          Number(item.price) * item.quantity
                        )}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-summary-line">
            <span>
              Productos ({totalItems})
            </span>
            <span>{formatPrice(total)}</span>
          </div>

          <div className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <p className="cart-payment-note">
            El pago se realiza escaneando un código QR.
          </p>

          {checkoutError && (
            <div className="checkout-error">
              {checkoutError}
            </div>
          )}

          <button
            type="button"
            className="checkout-button"
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCheckout}
          >
            {isProcessing ? (
              <>
                <span className="button-spinner" />
                Generando QR...
              </>
            ) : (
              <>
                Continuar al pago
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Cart;
