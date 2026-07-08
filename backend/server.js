const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// rutas
const reportesRoutes = require("./routes/reportes");
app.use("/api/reportes", reportesRoutes);

app.listen(5173, () => {
  console.log("Servidor corriendo en puerto 5173");
});
