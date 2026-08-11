const orderService = require("../services/order.service");

const REVIEW_INTERVAL_MS = 60 * 1000;

let intervalId = null;
let isReviewing = false;

const getPaymentId = (mercadoPagoOrder) => {
  const payment =
    mercadoPagoOrder.transactions?.payments?.[0];

  return payment?.id ? String(payment.id) : null;
};

const reviewSingleOrder = async (order) => {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${order.mercadoPagoOrderId}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const mercadoPagoOrder = await response.json();

    if (!response.ok) {
      console.error(
        `No se pudo consultar la orden local ${order.id}:`,
        mercadoPagoOrder
      );

      return;
    }

    const mpStatus = mercadoPagoOrder.status;
    const mpStatusDetail =
      mercadoPagoOrder.status_detail;

    console.log(
      `Revisión orden ${order.id}:`,
      mpStatus,
      mpStatusDetail
    );

    /*
     * La orden todavía está esperando el pago.
     * No hacemos ningún cambio.
     */
    if (mpStatus === "created") {
      return;
    }

    /*
     * Pago aprobado.
     */
    if (
      mpStatus === "processed" &&
      mpStatusDetail === "accredited"
    ) {
      const paymentId =
        getPaymentId(mercadoPagoOrder);

      await orderService.updatePaymentInfo(
        order.id,
        {
          status: "paid",
          paymentStatus: "approved",

          ...(paymentId && {
            paymentId,
          }),
        }
      );

      console.log(
        `Orden ${order.id} marcada como pagada`
      );

      return;
    }

    /*
     * Orden vencida.
     * closeUnpaidOrder devuelve el stock
     * y evita devolverlo dos veces.
     */
    if (mpStatus === "expired") {
      await orderService.closeUnpaidOrder(
        order.id,
        "expired"
      );

      console.log(
        `Orden ${order.id} marcada como vencida`
      );

      return;
    }

    /*
     * Mercado Pago usa "canceled".
     * Localmente usamos "cancelled".
     */
    if (
      mpStatus === "canceled" ||
      mpStatus === "cancelled"
    ) {
      await orderService.closeUnpaidOrder(
        order.id,
        "cancelled"
      );

      console.log(
        `Orden ${order.id} marcada como cancelada`
      );

      return;
    }

    /*
     * Un reembolso no devuelve automáticamente
     * el stock porque el producto podría haberse
     * entregado antes del reembolso.
     */
    if (mpStatus === "refunded") {
      await orderService.updatePaymentInfo(
        order.id,
        {
          status: "refunded",
          paymentStatus: "refunded",
        }
      );

      console.log(
        `Orden ${order.id} marcada como reembolsada`
      );

      return;
    }

    console.log(
      `Estado no procesado para la orden ${order.id}:`,
      mpStatus,
      mpStatusDetail
    );
  } catch (error) {
    console.error(
      `Error revisando la orden ${order.id}:`,
      error.message
    );
  }
};

const reviewPendingOrders = async () => {
  if (isReviewing) {
    console.log(
      "La revisión anterior todavía está ejecutándose"
    );

    return;
  }

  isReviewing = true;

  try {
    const pendingOrders =
      await orderService.getPendingQrOrders();

    if (pendingOrders.length === 0) {
      console.log(
        "Revisor: no hay órdenes QR pendientes"
      );

      return;
    }

    console.log(
      `Revisor: verificando ${pendingOrders.length} orden(es)`
    );

    /*
     * Las consultamos una por una para evitar enviar
     * demasiadas solicitudes simultáneas.
     */
    for (const order of pendingOrders) {
      await reviewSingleOrder(order);
    }
  } catch (error) {
    console.error(
      "Error en el revisor de órdenes:",
      error
    );
  } finally {
    isReviewing = false;
  }
};

const startPendingOrdersReviewer = () => {
  if (intervalId) {
    return;
  }

  console.log(
    "Revisor automático de órdenes iniciado"
  );

  /*
   * Primera revisión unos segundos después
   * de levantar el servidor.
   */
  setTimeout(() => {
    reviewPendingOrders();
  }, 5000);

  /*
   * Después revisa cada minuto.
   */
  intervalId = setInterval(
    reviewPendingOrders,
    REVIEW_INTERVAL_MS
  );
};

const stopPendingOrdersReviewer = () => {
  if (!intervalId) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;

  console.log(
    "Revisor automático de órdenes detenido"
  );
};

module.exports = {
  startPendingOrdersReviewer,
  stopPendingOrdersReviewer,
  reviewPendingOrders,
};