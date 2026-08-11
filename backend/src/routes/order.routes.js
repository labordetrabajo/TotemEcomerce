const express = require("express");
const orderController = require("../controllers/order.controller");
const optionalTotemAuth = require(
  "../middlewares/optionalTotemAuth.middleware"
);

const router = express.Router();

router.get("/", orderController.getAll);
router.get("/:id", orderController.getById);

router.post(
  "/",
  optionalTotemAuth,
  orderController.create
);
router.put(
  "/:id/status",
  orderController.updateStatus
);

module.exports = router;