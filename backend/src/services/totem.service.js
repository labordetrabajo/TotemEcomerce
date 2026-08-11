const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../config/prisma");

const normalizeUsername = (username) => {
  return String(username || "")
    .trim()
    .toUpperCase();
};

const getAll = async () => {
  return await prisma.totem.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,

      _count: {
        select: {
          orders: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

const getById = async (id) => {
  const totemId = Number(id);

  if (!Number.isInteger(totemId) || totemId <= 0) {
    return null;
  }

  return await prisma.totem.findUnique({
    where: {
      id: totemId,
    },

    select: {
      id: true,
      username: true,
      name: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,

      _count: {
        select: {
          orders: true,
        },
      },
    },
  });
};

const create = async ({ username, name, password }) => {
  const normalizedUsername =
    normalizeUsername(username);

  const normalizedName = String(name || "").trim();
  const normalizedPassword =
    String(password || "");

  if (!normalizedUsername) {
    throw new Error("El usuario es obligatorio");
  }

  if (!normalizedName) {
    throw new Error("El nombre del tótem es obligatorio");
  }

  if (normalizedPassword.length < 4) {
    throw new Error(
      "La contraseña debe tener al menos 4 caracteres"
    );
  }

  const existingTotem =
    await prisma.totem.findUnique({
      where: {
        username: normalizedUsername,
      },
    });

  if (existingTotem) {
    throw new Error(
      "Ya existe un tótem con ese usuario"
    );
  }

  const passwordHash = await bcrypt.hash(
    normalizedPassword,
    10
  );

  return await prisma.totem.create({
    data: {
      username: normalizedUsername,
      name: normalizedName,
      passwordHash,
      active: true,
    },

    select: {
      id: true,
      username: true,
      name: true,
      active: true,
      createdAt: true,
    },
  });
};

const update = async (
  id,
  { username, name, password, active }
) => {
  const totemId = Number(id);

  if (!Number.isInteger(totemId) || totemId <= 0) {
    throw new Error("El ID del tótem no es válido");
  }

  const existingTotem =
    await prisma.totem.findUnique({
      where: {
        id: totemId,
      },
    });

  if (!existingTotem) {
    throw new Error("Tótem no encontrado");
  }

  const data = {};

  if (username !== undefined) {
    const normalizedUsername =
      normalizeUsername(username);

    if (!normalizedUsername) {
      throw new Error(
        "El usuario no puede estar vacío"
      );
    }

    const usernameInUse =
      await prisma.totem.findFirst({
        where: {
          username: normalizedUsername,

          id: {
            not: totemId,
          },
        },
      });

    if (usernameInUse) {
      throw new Error(
        "Ya existe otro tótem con ese usuario"
      );
    }

    data.username = normalizedUsername;
  }

  if (name !== undefined) {
    const normalizedName =
      String(name || "").trim();

    if (!normalizedName) {
      throw new Error(
        "El nombre no puede estar vacío"
      );
    }

    data.name = normalizedName;
  }

  if (active !== undefined) {
    data.active = Boolean(active);
  }

  if (password) {
    if (String(password).length < 4) {
      throw new Error(
        "La contraseña debe tener al menos 4 caracteres"
      );
    }

    data.passwordHash = await bcrypt.hash(
      String(password),
      10
    );
  }

  return await prisma.totem.update({
    where: {
      id: totemId,
    },

    data,

    select: {
      id: true,
      username: true,
      name: true,
      active: true,
      lastLoginAt: true,
      updatedAt: true,
    },
  });
};

const login = async ({ username, password }) => {
  const normalizedUsername =
    normalizeUsername(username);

  const totem = await prisma.totem.findUnique({
    where: {
      username: normalizedUsername,
    },
  });

  if (!totem) {
    throw new Error(
      "Usuario o contraseña incorrectos"
    );
  }

  if (!totem.active) {
    throw new Error("Este tótem está desactivado");
  }

  const passwordIsValid = await bcrypt.compare(
    String(password || ""),
    totem.passwordHash
  );

  if (!passwordIsValid) {
    throw new Error(
      "Usuario o contraseña incorrectos"
    );
  }

  const updatedTotem = await prisma.totem.update({
    where: {
      id: totem.id,
    },

    data: {
      lastLoginAt: new Date(),
    },
  });

  const token = jwt.sign(
    {
      totemId: updatedTotem.id,
      username: updatedTotem.username,
      type: "totem",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );

  return {
    token,

    totem: {
      id: updatedTotem.id,
      username: updatedTotem.username,
      name: updatedTotem.name,
      active: updatedTotem.active,
      lastLoginAt: updatedTotem.lastLoginAt,
    },
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  login,
};