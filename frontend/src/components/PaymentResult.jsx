function PaymentResult({
  status,
  orderId,
  onReturnHome,
}) {
  const results = {
    success: {
      icon: "✅",
      title: "Pago aprobado",
      message: "Tu orden fue procesada correctamente.",
      className: "payment-success",
    },

    pending: {
      icon: "⏳",
      title: "Pago pendiente",
      message:
        "Tu pago todavía está siendo procesado. La orden se actualizará cuando Mercado Pago lo confirme.",
      className: "payment-pending",
    },

    failure: {
      icon: "❌",
      title: "No se pudo completar el pago",
      message:
        "El pago fue rechazado o cancelado. Podés volver al inicio e intentarlo nuevamente.",
      className: "payment-failure",
    },
  };

  const result = results[status] || results.failure;

  return (
    <main className={`payment-result ${result.className}`}>
      <div className="payment-result-card">
        <div className="payment-result-icon">
          {result.icon}
        </div>

        <h1>{result.title}</h1>

        <p>{result.message}</p>

        {orderId && (
          <div className="payment-order-number">
            Orden N.º {orderId}
          </div>
        )}

        <button
          type="button"
          className="payment-return-button"
          onClick={onReturnHome}
        >
          Volver al inicio
        </button>
      </div>
    </main>
  );
}

export default PaymentResult;