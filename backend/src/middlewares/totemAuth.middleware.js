const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const authenticateTotem = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        error: "El tótem no inició sesión",
      });
    }

    const token = authorization.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (
      decoded.type !== "totem" ||
      !decoded.totemId
    ) {
      return res.status(401).json({
        error: "El token del tótem no es válido",
      });
    }

    const totem = await prisma.totem.findUnique({
      where: {
        id: Number(decoded.totemId),
      },
    });

    if (!totem) {
      return res.status(401).json({
        error: "El tótem no existe",
      });
    }

    if (!totem.active) {
      return res.status(403).json({
        error: "El tótem está desactivado",
      });
    }

    req.totem = {
      id: totem.id,
      username: totem.username,
      name: totem.name,
    };

    next();
  } catch (error) {
    console.error(
      "Error validando el tótem:",
      error.message
    );

    return res.status(401).json({
      error: "La sesión del tótem no es válida o venció",
    });
  }
};

module.exports = authenticateTotem;