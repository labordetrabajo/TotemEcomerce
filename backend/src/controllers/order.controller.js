const orderService = require("../services/order.service");

const getAll = async (req, res) => {
  try {
    const orders = await orderService.getAll();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo órdenes" });
  }
};

const getById = async (req, res) => {
  try {
    const order = await orderService.getById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: "Orden no encontrada"
      });
    }

    res.json(order);

  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo orden"
    });
  }
};

const create = async (req, res) => {
  try {
const order = await orderService.create(
  req.body.items,
  req.totem?.id || null
);

    res.status(201).json(order);
  } catch (error) {
    console.error("Error creando orden:", error);

    res.status(500).json({
      error: error.message
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await orderService.updateStatus(
      req.params.id,
      { status }
    );

    res.json(order);
  } catch (error) {
    res.status(500).json({
      error: "Error actualizando estado"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  updateStatus
};