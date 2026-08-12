const crypto = require("crypto");

const {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} = require("mercadopago");

const orderService = require("../services/order.service");

const createQrPayment = async (req, res) => {
  try {
    const orderId = Number(req.body.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        error: "El ID de la orden no es válido",
      });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        error: "Falta configurar MP_ACCESS_TOKEN",
      });
    }

    if (!process.env.MP_POS_EXTERNAL_ID) {
      return res.status(500).json({
        error: "Falta configurar MP_POS_EXTERNAL_ID",
      });
    }

    const order = await orderService.getById(orderId);

    if (!order) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        error: "La orden no contiene productos",
      });
    }

    if (order.status === "paid") {
      return res.status(400).json({
        error: "La orden ya fue pagada",
      });
    }

    const totalAmount = Number(order.total).toFixed(2);

    const body = {
      type: "qr",

      total_amount: totalAmount,

      description: `Orden TOTEM ${order.id}`,

      external_reference: `TOTEM_ORDER_${order.id}`,

      expiration_time: "PT15M",

      config: {
        qr: {
          external_pos_id: process.env.MP_POS_EXTERNAL_ID,
          mode: "dynamic",
        },
      },

      transactions: {
        payments: [
          {
            amount: totalAmount,
          },
        ],
      },

      items: order.items.map((item) => ({
        title: item.product.name.slice(0, 150),
        unit_price: Number(item.price).toFixed(2),
        quantity: Number(item.quantity),
        unit_measure: "unit",
        external_code: String(item.productId),
      })),
    };

    /*
      Usamos una clave estable para esta orden.
      Si se repite accidentalmente la misma solicitud,
      Mercado Pago no debería crear otro cobro idéntico.
    */
    const idempotencyKey = `totem-order-${order.id}`;

    const response = await fetch(
      "https://api.mercadopago.com/v1/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "Error de Mercado Pago:",
        JSON.stringify(result, null, 2)
      );

      return res.status(response.status).json({
        error:
          result?.message ||
          "Mercado Pago no pudo crear la orden QR",
        details: result,
      });
    }

    const qrData = result.type_response?.qr_data;

    if (!result.id || !qrData) {
      console.error(
        "Respuesta QR incompleta:",
        JSON.stringify(result, null, 2)
      );

      return res.status(500).json({
        error: "Mercado Pago no devolvió los datos del QR",
      });
    }

    await orderService.updatePaymentInfo(order.id, {
      mercadoPagoOrderId: result.id,
      qrData,
      paymentStatus: result.status || "created",
    });

    return res.status(201).json({
      orderId: order.id,
      mercadoPagoOrderId: result.id,
      qrData,
      status: result.status,
      total: totalAmount,
    });
  } catch (error) {
    console.error("Error creando QR:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Error interno creando el pago QR",
    });
  }
};

const getQrPaymentStatus = async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        error: "El ID de la orden no es válido",
      });
    }

    const order = await orderService.getById(orderId);

    if (!order) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (!order.mercadoPagoOrderId) {
      return res.status(400).json({
        error: "La orden todavía no tiene un pago QR asociado",
      });
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${order.mercadoPagoOrderId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const mercadoPagoOrder = await response.json();

    if (!response.ok) {
      console.error(
        "Error consultando Mercado Pago:",
        JSON.stringify(mercadoPagoOrder, null, 2)
      );

      return res.status(response.status).json({
        error:
          mercadoPagoOrder?.message ||
          "No se pudo consultar el estado del pago",
        details: mercadoPagoOrder,
      });
    }

    const mpStatus = mercadoPagoOrder.status;
    const mpStatusDetail = mercadoPagoOrder.status_detail;

    let localStatus = "pending";
    let paymentStatus = mpStatus || "created";

    if (
      mpStatus === "processed" &&
      mpStatusDetail === "accredited"
    ) {
      localStatus = "paid";
      paymentStatus = "approved";
    } else if (
      mpStatus === "canceled" ||
      mpStatus === "cancelled"
    ) {
      localStatus = "cancelled";
      paymentStatus = "cancelled";
    } else if (mpStatus === "expired") {
      localStatus = "expired";
      paymentStatus = "expired";
    } else if (mpStatus === "refunded") {
      localStatus = "refunded";
      paymentStatus = "refunded";
    }

    const paymentId =
      mercadoPagoOrder.transactions?.payments?.[0]?.id;

let updatedOrder;

if (
  localStatus === "expired" ||
  localStatus === "cancelled"
) {
  updatedOrder =
    await orderService.closeUnpaidOrder(
      order.id,
      localStatus
    );
} else {
  updatedOrder =
    await orderService.updatePaymentInfo(order.id, {
      status: localStatus,
      paymentStatus,
      ...(paymentId && {
        paymentId: String(paymentId),
      }),
    });
}

    return res.json({
      orderId: updatedOrder.id,
      mercadoPagoOrderId: order.mercadoPagoOrderId,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      mercadoPagoStatus: mpStatus,
      mercadoPagoStatusDetail: mpStatusDetail,
      paid: updatedOrder.status === "paid",
    });
  } catch (error) {
    console.error("Error consultando estado QR:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Error interno consultando el estado del pago",
    });
  }
};

const cancelQrPayment = async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        error: "El ID de la orden no es válido",
      });
    }

    const order = await orderService.getById(orderId);

    if (!order) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (order.status === "paid") {
      return res.status(409).json({
        error: "La orden ya fue pagada y no puede cancelarse",
      });
    }

    if (
      order.status === "cancelled" ||
      order.status === "canceled"
    ) {
      return res.json({
        orderId: order.id,
        status: "cancelled",
        message: "La orden ya estaba cancelada",
      });
    }

    if (!order.mercadoPagoOrderId) {
      return res.status(400).json({
        error: "La orden no tiene un pago QR asociado",
      });
    }

   const response = await fetch(
  `https://api.mercadopago.com/v1/orders/${order.mercadoPagoOrderId}/cancel`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `cancel-${order.mercadoPagoOrderId}`,
    },
  }
);

    const responseText = await response.text();

    let mercadoPagoResult = {};

    if (responseText) {
      try {
        mercadoPagoResult = JSON.parse(responseText);
      } catch {
        mercadoPagoResult = {
          rawResponse: responseText,
        };
      }
    }

    if (!response.ok) {
      console.error(
        "Error cancelando orden en Mercado Pago:",
        mercadoPagoResult
      );

      return res.status(response.status).json({
        error:
          mercadoPagoResult?.message ||
          "Mercado Pago no pudo cancelar la orden",
        details: mercadoPagoResult,
      });
    }

const updatedOrder =
  await orderService.closeUnpaidOrder(
    order.id,
    "cancelled"
  );

    return res.json({
      orderId: updatedOrder.id,
      mercadoPagoOrderId: order.mercadoPagoOrderId,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      message: "Orden cancelada correctamente",
    });
  } catch (error) {
    console.error("Error cancelando pago QR:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Error interno cancelando la orden",
    });
  }
};

const qrWebhook = async (req, res) => {
  try {
    const mercadoPagoOrderId =
      req.query["data.id"] ||
      req.body?.data?.id ||
      req.body?.id;

    if (!mercadoPagoOrderId) {
      return res.status(400).json({
        error: "No se recibió el ID de la orden de Mercado Pago",
      });
    }

    // En producción, si configuramos MP_WEBHOOK_SECRET,
    // validamos que la notificación venga realmente de Mercado Pago.
    if (process.env.MP_WEBHOOK_SECRET) {
      WebhookSignatureValidator.validate({
        xSignature: req.headers["x-signature"],
        xRequestId: req.headers["x-request-id"],
        dataId: String(mercadoPagoOrderId),
        secret: process.env.MP_WEBHOOK_SECRET,
      });
    }

    // No confiamos solamente en el contenido del webhook.
    // Consultamos la orden real directamente a Mercado Pago.
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${mercadoPagoOrderId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const mercadoPagoOrder = await response.json();

    if (!response.ok) {
      console.error(
        "Error consultando orden del webhook en Mercado Pago:",
        JSON.stringify(mercadoPagoOrder, null, 2)
      );

      return res.status(500).json({
        error: "No se pudo consultar la orden en Mercado Pago",
      });
    }

    /*
      Cuando creamos el QR usamos:
      external_reference: TOTEM_ORDER_123

      De ahí recuperamos nuestra orden local.
    */
    const externalReference =
      String(mercadoPagoOrder.external_reference || "");

    const match =
      externalReference.match(/^TOTEM_ORDER_(\d+)$/);

    if (!match) {
      return res.status(400).json({
        error: "La orden no contiene una referencia TOTEM válida",
      });
    }

    const orderId = Number(match[1]);

    const order = await orderService.getById(orderId);

    if (!order) {
      return res.status(404).json({
        error: "La orden local asociada no existe",
      });
    }

    const mpStatus = mercadoPagoOrder.status;
    const mpStatusDetail =
      mercadoPagoOrder.status_detail;

    let localStatus = "pending";
    let paymentStatus = mpStatus || "created";

    if (
      mpStatus === "processed" &&
      mpStatusDetail === "accredited"
    ) {
      localStatus = "paid";
      paymentStatus = "approved";
    } else if (
      mpStatus === "canceled" ||
      mpStatus === "cancelled"
    ) {
      localStatus = "cancelled";
      paymentStatus = "cancelled";
    } else if (mpStatus === "expired") {
      localStatus = "expired";
      paymentStatus = "expired";
    } else if (mpStatus === "refunded") {
      localStatus = "refunded";
      paymentStatus = "refunded";
    }

    const paymentId =
      mercadoPagoOrder.transactions
        ?.payments?.[0]?.id;

    let updatedOrder;

    if (
      localStatus === "expired" ||
      localStatus === "cancelled"
    ) {
      updatedOrder =
        await orderService.closeUnpaidOrder(
          order.id,
          localStatus
        );
    } else {
      updatedOrder =
        await orderService.updatePaymentInfo(
          order.id,
          {
            status: localStatus,
            paymentStatus,
            ...(paymentId && {
              paymentId: String(paymentId),
            }),
          }
        );
    }

    console.log(
      `Webhook QR procesado: orden ${order.id} -> ${updatedOrder.status}`
    );

    return res.status(200).json({
      message: "Webhook QR procesado correctamente",
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    });
  } catch (error) {
    if (
      error instanceof InvalidWebhookSignatureError
    ) {
      console.error(
        "Firma inválida en webhook QR"
      );

      return res.status(401).json({
        error: "Firma del webhook QR inválida",
      });
    }

    console.error(
      "Error procesando webhook QR:",
      error
    );

    return res.status(500).json({
      error: "Error procesando webhook QR",
    });
  }
};

module.exports = {
  createQrPayment,
  getQrPaymentStatus,
  cancelQrPayment,
  qrWebhook,
};