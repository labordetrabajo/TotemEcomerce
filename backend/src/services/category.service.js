const prisma = require("../config/prisma");

const getAll = async () => {
  return await prisma.category.findMany();
};

const getById = async (id) => {
  return await prisma.category.findUnique({
    where: { id: Number(id) }
  });
};

const create = async (data) => {
  return await prisma.category.create({
    data
  });
};

const update = async (id, data) => {
  return await prisma.category.update({
    where: { id: Number(id) },
    data
  });
};

const remove = async (id) => {
  return await prisma.category.delete({
    where: { id: Number(id) }
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};