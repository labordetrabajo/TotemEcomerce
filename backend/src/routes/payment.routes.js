const express = require("express");

const paymentController = require(
  "../controllers/payment.controller"
);

const qrPaymentController = require(
  "../controllers/qrPayment.controller"
);

const router = express.Router();

// Checkout Pro anterior: lo dejamos como respaldo
router.post("/create", paymentController.createPayment);

// Nuevo pago mediante QR oficial
router.post(
  "/qr/create",
  qrPaymentController.createQrPayment
);
router.get(
  "/qr/status/:orderId",
  qrPaymentController.getQrPaymentStatus
);

router.post(
  "/qr/cancel/:orderId",
  qrPaymentController.cancelQrPayment
);
// Webhook viejo de Checkout Pro
router.post(
  "/qr/webhook",
  qrPaymentController.qrWebhook
);

router.post("/webhook", paymentController.webhook);

module.exports = router;