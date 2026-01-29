const mongoose = require("mongoose");

const MovementSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, index: true },
    type: { type: String, enum: ["OUT", "IN"], required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    user: { type: String, default: "" },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movement", MovementSchema);
