const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, unique: true, index: true },
    modelCode: { type: String, required: true, index: true },
    series: { type: Number, required: true },

    status: { type: String, enum: ["DISPONIBLE", "ARRENDADA"], default: "DISPONIBLE", index: true },

    weekKey: { type: String, default: "" },
    weeklyOutCount: { type: Number, default: 0 },

    dayKey: { type: String, default: "" },
    dailyOutCount: { type: Number, default: 0 },

    outCountTotal: { type: Number, default: 0 },

    lastOutAt: { type: Date, default: null },
    lastInAt: { type: Date, default: null }
  },
  { timestamps: true }
);

UnitSchema.index({ modelCode: 1, series: 1 }, { unique: true });
UnitSchema.index({ modelCode: 1, status: 1, weekKey: 1, weeklyOutCount: 1 });
UnitSchema.index({ modelCode: 1, status: 1, dayKey: 1, dailyOutCount: 1 });

module.exports = mongoose.model("Unit", UnitSchema);
