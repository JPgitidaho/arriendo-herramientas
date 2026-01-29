require("dotenv").config();
const express = require("express");
const cors = require("cors");

const modelsRoutes = require("./routes/models");
const unitsRoutes = require("./routes/units");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/models", modelsRoutes);
app.use("/units", unitsRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
});

module.exports = app;
