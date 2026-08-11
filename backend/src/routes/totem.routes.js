const express = require("express");

const totemController = require(
  "../controllers/totem.controller"
);

const authenticateTotem = require(
  "../middlewares/totemAuth.middleware"
);

const router = express.Router();

// LOGIN DEL TÓTEM
router.post(
  "/login",
  totemController.login
);

// VALIDAR SESIÓN ACTUAL
// IMPORTANTE: tiene que estar ANTES de /:id
router.get(
  "/me",
  authenticateTotem,
  (req, res) => {
    res.json({
      valid: true,
      totem: req.totem,
    });
  }
);

// LISTAR TÓTEMS
router.get(
  "/",
  totemController.getAll
);

// OBTENER TÓTEM POR ID
router.get(
  "/:id",
  totemController.getById
);

// CREAR TÓTEM
router.post(
  "/",
  totemController.create
);

// EDITAR TÓTEM
router.put(
  "/:id",
  totemController.update
);

module.exports = router;