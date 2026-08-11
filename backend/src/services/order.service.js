const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

const create = async (items, totemId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      "La orden debe contener al menos un producto"
    );
  }

  return await prisma.$transaction(async (tx) => {
    let total = new Prisma.Decimal(0);
    const orderItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        throw new Error(
          "El ID del producto no es válido"
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "La cantidad debe ser un número entero mayor a cero"
        );
      }

      const product = await tx.product.findUnique({
        where: {
          id: productId,
        },
      });

      if (!product || !product.active) {
        throw new Error(
          "Producto no encontrado o inactivo"
        );
      }

      if (product.stock < quantity) {
        throw new Error(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`
        );
      }

      const itemTotal =
        product.price.mul(quantity);

      total = total.add(itemTotal);

      orderItems.push({
        productId: product.id,
        quantity,
        price: product.price,
      });

      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          stock: {
            decrement: quantity,
          },
        },
      });
    }

    const order = await tx.order.create({
      data: {
        total,
        status: "pending",
        paymentStatus: "pending",
        totemId: totemId
  ? Number(totemId)
  : null,

        items: {
          create: orderItems,
        },
      },

      include: {
        totem: {
          select: {
            id: true,
            username: true,
            name: true,
            active: true,
          },
        },

        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return order;
  });
};

const getAll = async () => {
  return await prisma.order.findMany({
    include: {
      totem: {
        select: {
          id: true,
          username: true,
          name: true,
          active: true,
        },
      },

      items: {
        include: {
          product: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

const getById = async (id) => {
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    return null;
  }

  return await prisma.order.findUnique({
    where: {
      id: orderId,
    },

    include: {
      totem: {
        select: {
          id: true,
          username: true,
          name: true,
          active: true,
        },
      },

      items: {
        include: {
          product: true,
        },
      },
    },
  });
};

const updatePaymentInfo = async (id, data) => {
  return await prisma.order.update({
    where: {
      id: Number(id),
    },
    data,
  });
};

const updateStatus = async (id, data) => {
  return await prisma.order.update({
    where: {
      id: Number(id),
    },
    data,
  });
};

const getPendingQrOrders = async () => {
  return await prisma.order.findMany({
    where: {
      status: "pending",

      mercadoPagoOrderId: {
        not: null,
      },
    },

    select: {
      id: true,
      mercadoPagoOrderId: true,
      createdAt: true,
    },
  });
};

const closeUnpaidOrder = async (
  id,
  finalStatus
) => {
  const orderId = Number(id);

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    throw new Error(
      "El ID de la orden no es válido"
    );
  }

  const allowedStatuses = [
    "cancelled",
    "expired",
  ];

  if (!allowedStatuses.includes(finalStatus)) {
    throw new Error(
      "El estado final de la orden no es válido"
    );
  }

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },

      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error(
        "Orden no encontrada"
      );
    }

    // Ya fue procesada anteriormente.
    // No devolvemos nuevamente el stock.
    if (order.status === finalStatus) {
      return order;
    }

    // Solamente se devuelve stock
    // en órdenes pendientes.
    if (order.status !== "pending") {
      return order;
    }

    /*
     * Cambiamos el estado únicamente
     * si continúa pendiente.
     *
     * Esto evita devolver el stock
     * dos veces.
     */
    const updateResult =
      await tx.order.updateMany({
        where: {
          id: orderId,
          status: "pending",
        },

        data: {
          status: finalStatus,
          paymentStatus: finalStatus,
          qrData: null,
        },
      });

    if (updateResult.count === 0) {
      return await tx.order.findUnique({
        where: {
          id: orderId,
        },

        include: {
          items: true,
        },
      });
    }

    // Devolver los productos al stock.
    for (const item of order.items) {
      await tx.product.update({
        where: {
          id: item.productId,
        },

        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    return await tx.order.findUnique({
      where: {
        id: orderId,
      },

      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  });
};

module.exports = {
  create,
  getAll,
  getById,
  updatePaymentInfo,
  updateStatus,
  getPendingQrOrders,
  closeUnpaidOrder,
};