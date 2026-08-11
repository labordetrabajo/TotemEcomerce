const express = require("express");

const productController = require(
  "../controllers/product.controller"
);

const upload = require(
  "../middlewares/upload"
);

const router = express.Router();

// LISTAR PRODUCTOS
router.get(
  "/",
  productController.getAll
);

// OBTENER PRODUCTO POR ID
router.get(
  "/:id",
  productController.getById
);

// CREAR PRODUCTO
router.post(
  "/",
  upload.single("image"),
  productController.create
);

// EDITAR PRODUCTO
router.put(
  "/:id",
  upload.single("image"),
  productController.update
);

// ELIMINAR PRODUCTO
router.delete(
  "/:id",
  productController.remove
);

module.exports = router;