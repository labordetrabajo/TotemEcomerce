const {
  Preference,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} = require("mercadopago");

const client = require("../config/mercadopago");
const orderService = require("../services/order.service");

const removeTrailingSlash = (url = "") =>
  url.replace(/\/+$/, "");

const getOrderStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case "approved":
      return "paid";

    case "rejected":
      return "rejected";

    case "cancelled":
      return "cancelled";

    case "refunded":
    case "charged_back":
      return "refunded";

    case "pending":
    case "in_process":
    case "authorized":
    default:
      return "pending";
  }
};

const createPayment = async (req, res) => {
  try {
    const orderId = Number(req.body.orderId);

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

    const frontendUrl = removeTrailingSlash(
      process.env.FRONTEND_URL
    );

    const backendPublicUrl = removeTrailingSlash(
      process.env.BACKEND_PUBLIC_URL
    );

    const preferenceBody = {
      external_reference: String(order.id),

      items: order.items.map((item) => ({
        id: String(item.productId),
        title: item.product.name,
        description:
          item.product.description || item.product.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        currency_id: "ARS",
      })),
    };

    // Solo se agregan cuando existe una URL pública.
    if (frontendUrl) {
      preferenceBody.back_urls = {
        success: `${frontendUrl}/?payment=success&orderId=${order.id}`,
        failure: `${frontendUrl}/?payment=failure&orderId=${order.id}`,
        pending: `${frontendUrl}/?payment=pending&orderId=${order.id}`,
      };

      preferenceBody.auto_return = "approved";
    }

    if (backendPublicUrl) {
      preferenceBody.notification_url =
        `${backendPublicUrl}/payments/webhook`;
    }

    const preference = new Preference(client);

    const result = await preference.create({
      body: preferenceBody,
    });

    await orderService.updatePaymentInfo(order.id, {
      preferenceId: result.id,
      paymentStatus: "pending",
    });

    return res.json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      preference_id: result.id,
      order_id: order.id,
    });
  } catch (error) {
    console.error("Error creando pago:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Error creando preferencia de Mercado Pago",
    });
  }
};

const webhook = async (req, res) => {
  try {
    const paymentId =
      req.query["data.id"] ||
      req.body?.data?.id;

    if (!paymentId) {
      return res.status(400).json({
        error: "No se recibió el ID del pago",
      });
    }

    /*
      Validación de seguridad.

      En desarrollo puede quedar sin validar mientras todavía
      no tengas MP_WEBHOOK_SECRET, pero en producción debe existir.
    */
    if (process.env.MP_WEBHOOK_SECRET) {
      WebhookSignatureValidator.validate({
        xSignature: req.headers["x-signature"],
        xRequestId: req.headers["x-request-id"],
        dataId: String(paymentId),
        secret: process.env.MP_WEBHOOK_SECRET,
      });
    }

    const paymentClient = new Payment(client);

    // Siempre consultamos el pago real en Mercado Pago.
    const payment = await paymentClient.get({
      id: paymentId,
    });

    const orderId = Number(payment.external_reference);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        error: "El pago no contiene una orden válida",
      });
    }

    const order = await orderService.getById(orderId);

    if (!order) {
      return res.status(404).json({
        error: "La orden asociada no existe",
      });
    }

    const paymentStatus = payment.status;
    const orderStatus = getOrderStatus(paymentStatus);

    await orderService.updatePaymentInfo(orderId, {
      paymentId: String(payment.id),
      paymentStatus,
      status: orderStatus,
    });

    return res.status(200).json({
      message: "Webhook procesado correctamente",
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.error("Firma del webhook inválida");

      return res.status(401).json({
        error: "Firma del webhook inválida",
      });
    }

    console.error("Error procesando webhook:", error);

    return res.status(500).json({
      error: "Error procesando webhook",
    });
  }
};

module.exports = {
  createPayment,
  webhook,
};