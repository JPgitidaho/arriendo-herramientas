const express = require("express");
const router = express.Router();
const Unit = require("../models/Unit");
const Movement = require("../models/Movement");
const { getIsoWeekKey } = require("../utils/weekKey");

router.post("/out", async (req, res, next) => {
  try {
    const { identifier, user = "", note = "" } = req.body;
    if (!identifier) return res.status(400).json({ error: "identifier is required" });

    const now = new Date();
    const wk = getIsoWeekKey(now);

    const updated = await Unit.findOneAndUpdate(
      { identifier, status: "DISPONIBLE" },
      [
        {
          $set: {
            weekKey: wk,
            weeklyOutCount: {
              $cond: [{ $ne: ["$weekKey", wk] }, 0, { $ifNull: ["$weeklyOutCount", 0] }]
            }
          }
        },
        { $set: { status: "ARRENDADA", lastOutAt: now } },
        {
          $set: {
            outCountTotal: { $add: [{ $ifNull: ["$outCountTotal", 0] }, 1] },
            weeklyOutCount: { $add: ["$weeklyOutCount", 1] }
          }
        }
      ],
      { new: true }
    );

    if (!updated) {
      const unit = await Unit.findOne({ identifier });
      if (!unit) return res.status(404).json({ error: "unit not found" });

      const alternatives = await Unit.find({
        modelCode: unit.modelCode,
        status: "DISPONIBLE"
      }).sort({ weeklyOutCount: 1, outCountTotal: 1, lastOutAt: 1, series: 1 });

      return res.status(409).json({
        error: "unit is not available",
        unit: { identifier: unit.identifier, modelCode: unit.modelCode, series: unit.series, status: unit.status },
        alternatives: alternatives.map((u) => ({
          identifier: u.identifier,
          series: u.series,
          weeklyOutCount: u.weeklyOutCount,
          outCountTotal: u.outCountTotal,
          lastOutAt: u.lastOutAt
        }))
      });
    }

    await Movement.create({ identifier, type: "OUT", timestamp: now, user, note });

    res.json({ ok: true, unit: updated });
  } catch (e) {
    next(e);
  }
});

router.post("/in", async (req, res, next) => {
  try {
    const { identifier, user = "", note = "" } = req.body;
    if (!identifier) return res.status(400).json({ error: "identifier is required" });

    const now = new Date();

    const unit = await Unit.findOne({ identifier });
    if (!unit) return res.status(404).json({ error: "unit not found" });

    if (unit.status === "DISPONIBLE") {
      return res.json({ ok: true, unit });
    }

    unit.status = "DISPONIBLE";
    unit.lastInAt = now;
    await unit.save();

    await Movement.create({ identifier, type: "IN", timestamp: now, user, note });

    res.json({ ok: true, unit });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
