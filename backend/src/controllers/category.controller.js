const categoryService = require("../services/category.service");

const getAll = async (req, res) => {
  try {
    const categories = await categoryService.getAll();

    res.json(categories);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error obteniendo categorías"
    });
  }
};

const getById = async (req, res) => {
  try {
    const category = await categoryService.getById(req.params.id);

    if (!category) {
      return res.status(404).json({
        error: "Categoría no encontrada"
      });
    }

    res.json(category);

  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo categoría"
    });
  }
};

const create = async (req, res) => {
  try {
    const category = await categoryService.create(req.body);

    res.status(201).json(category);

  } catch (error) {
    res.status(500).json({
      error: "Error creando categoría"
    });
  }
};

const update = async (req, res) => {
  try {
    const category = await categoryService.update(
      req.params.id,
      req.body
    );

    res.json(category);

  } catch (error) {
    res.status(500).json({
      error: "Error actualizando categoría"
    });
  }
};

const remove = async (req, res) => {
  try {
    await categoryService.remove(req.params.id);

    res.json({
      message: "Categoría eliminada"
    });

  } catch (error) {
    res.status(500).json({
      error: "Error eliminando categoría"
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};