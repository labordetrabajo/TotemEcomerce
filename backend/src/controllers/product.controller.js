const productService = require("../services/product.service");

const getAll = async (req, res) => {
  try {
    const products = await productService.getAll();

    res.json(products);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error obteniendo productos"
    });
  }
};

const create = async (req, res) => {
  try {

    const data = {
      ...req.body,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      categoryId: req.body.categoryId
        ? Number(req.body.categoryId)
        : null,
      image: req.file
        ? `/uploads/products/${req.file.filename}`
        : null
    };

    console.log(data);

    const product = await productService.create(data);

    res.status(201).json(product);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error creando producto"
    });
  }
};

const getById = async (req, res) => {
  try {
    const product = await productService.getById(req.params.id);

    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado"
      });
    }

    res.json(product);

  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo producto"
    });
  }
};

const update = async (req, res) => {
  try {
    const product = await productService.update(
      req.params.id,
      req.body
    );

    res.json(product);

  } catch (error) {
    res.status(500).json({
      error: "Error actualizando producto"
    });
  }
};

const remove = async (req, res) => {
  try {
    await productService.remove(req.params.id);

    res.json({
      message: "Producto eliminado"
    });

  } catch (error) {
    res.status(500).json({
      error: "Error eliminando producto"
    });
  }
};

module.exports = {
  getAll,
  create,
  getById,
  update,
  remove
};