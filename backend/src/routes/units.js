const express = require("express");
const router = express.Router();
const Unit = require("../models/Unit");
const Movement = require("../models/Movement");
const { getIsoWeekKey, getDayKey } = require("../utils/weekKey");

router.post("/out", async (req, res, next) => {
  try {
    const { identifier, user = "", note = "" } = req.body;
    if (!identifier) return res.status(400).json({ error: "identifier is required" });

    const now = new Date();
    const wk = getIsoWeekKey(now);
    const dk = getDayKey(now);

    const unit = await Unit.findOne({ identifier });
    if (!unit) return res.status(404).json({ error: "unit not found" });

    if (unit.status !== "DISPONIBLE") {
      const base = { modelCode: unit.modelCode, status: "DISPONIBLE" };

      let alternatives = await Unit.find({ ...base, dayKey: { $ne: dk } }).sort({
        dailyOutCount: 1,
        weeklyOutCount: 1,
        outCountTotal: 1,
        lastOutAt: 1,
        series: 1
      });

      if (!alternatives.length) {
        alternatives = await Unit.find(base).sort({
          dailyOutCount: 1,
          weeklyOutCount: 1,
          outCountTotal: 1,
          lastOutAt: 1,
          series: 1
        });
      }

      return res.status(409).json({
        error: "unit is not available",
        unit: { identifier: unit.identifier, modelCode: unit.modelCode, series: unit.series, status: unit.status },
        alternatives: alternatives.map((u) => ({
          identifier: u.identifier,
          series: u.series,
          dailyOutCount: u.dailyOutCount,
          weeklyOutCount: u.weeklyOutCount,
          outCountTotal: u.outCountTotal,
          lastOutAt: u.lastOutAt,
          dayKey: u.dayKey
        }))
      });
    }

    if (unit.weekKey !== wk) {
      unit.weekKey = wk;
      unit.weeklyOutCount = 0;
    } else {
      unit.weeklyOutCount = unit.weeklyOutCount ?? 0;
    }

    if (unit.dayKey !== dk) {
      unit.dayKey = dk;
      unit.dailyOutCount = 0;
    } else {
      unit.dailyOutCount = unit.dailyOutCount ?? 0;
    }

    unit.status = "ARRENDADA";
    unit.lastOutAt = now;

    unit.outCountTotal = (unit.outCountTotal ?? 0) + 1;
    unit.weeklyOutCount = (unit.weeklyOutCount ?? 0) + 1;
    unit.dailyOutCount = (unit.dailyOutCount ?? 0) + 1;

    await unit.save();
    await Movement.create({ identifier, type: "OUT", timestamp: now, user, note });

    res.json({ ok: true, unit });
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

    if (unit.status === "DISPONIBLE") return res.json({ ok: true, unit });

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