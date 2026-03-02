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
  console.log("ERROR:", err);
  res.status(500).json({ error: err.message });
});

module.exports = app;
