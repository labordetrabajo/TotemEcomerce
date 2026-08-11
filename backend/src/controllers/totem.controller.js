const totemService = require(
  "../services/totem.service"
);

const getAll = async (req, res) => {
  try {
    const totems = await totemService.getAll();
    return res.json(totems);
  } catch (error) {
    console.error("Error obteniendo tótems:", error);

    return res.status(500).json({
      error: "No se pudieron obtener los tótems",
    });
  }
};

const getById = async (req, res) => {
  try {
    const totem = await totemService.getById(
      req.params.id
    );

    if (!totem) {
      return res.status(404).json({
        error: "Tótem no encontrado",
      });
    }

    return res.json(totem);
  } catch (error) {
    console.error("Error obteniendo tótem:", error);

    return res.status(500).json({
      error: "No se pudo obtener el tótem",
    });
  }
};

const create = async (req, res) => {
  try {
    const totem = await totemService.create(
      req.body
    );

    return res.status(201).json(totem);
  } catch (error) {
    console.error("Error creando tótem:", error);

    return res.status(400).json({
      error: error.message,
    });
  }
};

const update = async (req, res) => {
  try {
    const totem = await totemService.update(
      req.params.id,
      req.body
    );

    return res.json(totem);
  } catch (error) {
    console.error("Error actualizando tótem:", error);

    return res.status(400).json({
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const result = await totemService.login(
      req.body
    );

    return res.json(result);
  } catch (error) {
    console.error("Error iniciando sesión:", error);

    return res.status(401).json({
      error: error.message,
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  login,
};