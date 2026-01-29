const mongoose = require("mongoose");

const ToolModelSchema = new mongoose.Schema(
  {
    modelCode: { type: String, required: true, unique: true, index: true },
    toolName: { type: String, default: "" },
    brand: { type: String, default: "" },
    category: { type: String, default: "" },
    rentalRate: { type: Number, default: 0 },
    warranty: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ToolModel", ToolModelSchema);
