const prisma = require("../config/prisma");

const getAll = async () => {
  return await prisma.product.findMany({
    include: {
      category: true
    }
  });
};

const create = async (data) => {
  return await prisma.product.create({
    data
  });
};

const getById = async (id) => {
  return await prisma.product.findUnique({
    where: {
      id: Number(id)
    },
    include: {
      category: true
    }
  });
};
const update = async (id, data) => {
  return await prisma.product.update({
    where: { id: Number(id) },
    data
  });
};

const remove = async (id) => {
  return await prisma.product.delete({
    where: { id: Number(id) }
  });
};

module.exports = {
  getAll,
  create,
  getById,
  update,
  remove
};