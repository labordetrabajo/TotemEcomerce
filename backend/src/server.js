const app = require("./app");

const PORT = 3000;

const {
  startPendingOrdersReviewer,
} = require("./jobs/pendingOrdersReviewer");

app.listen(PORT, () => {
  console.log(
    `Servidor corriendo en puerto ${PORT}`
  );

  startPendingOrdersReviewer();
});