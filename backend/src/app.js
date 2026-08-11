const express = require("express");
const cors = require("cors");

const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const totemRoutes = require("./routes/totem.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Servir imágenes subidas
app.use("/uploads", express.static("uploads"));
app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/totems", totemRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "TOTEM API funcionando"
  });
});

module.exports = app;