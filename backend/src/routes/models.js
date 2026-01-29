const express = require("express");
const router = express.Router();
const Unit = require("../models/Unit");

router.get("/", async (req, res, next) => {
  try {
    const rows = await Unit.aggregate([
      {
        $group: {
          _id: "$modelCode",
          stockTotal: { $sum: 1 },
          disponibles: { $sum: { $cond: [{ $eq: ["$status", "DISPONIBLE"] }, 1, 0] } },
          arrendadas: { $sum: { $cond: [{ $eq: ["$status", "ARRENDADA"] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: "units",
          let: { modelCode: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$modelCode", "$$modelCode"] }, { $eq: ["$status", "DISPONIBLE"] }] } } },
            { $sort: { weeklyOutCount: 1, outCountTotal: 1, lastOutAt: 1, series: 1 } },
            { $limit: 1 },
            { $project: { _id: 0, identifier: 1, series: 1 } }
          ],
          as: "suggested"
        }
      },
      {
        $addFields: {
          modelCode: "$_id",
          suggestedSeries: { $ifNull: [{ $arrayElemAt: ["$suggested.series", 0] }, null] },
          suggestedIdentifier: { $ifNull: [{ $arrayElemAt: ["$suggested.identifier", 0] }, null] }
        }
      },
      { $project: { _id: 0, modelCode: 1, stockTotal: 1, disponibles: 1, arrendadas: 1, suggestedSeries: 1, suggestedIdentifier: 1 } },
      { $sort: { modelCode: 1 } }
    ]);

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.get("/:modelCode/units", async (req, res, next) => {
  try {
    const { modelCode } = req.params;

    const units = await Unit.find({ modelCode }).sort({
      status: 1,
      weeklyOutCount: 1,
      outCountTotal: 1,
      lastOutAt: 1,
      series: 1
    });

    const suggested = units.find((u) => u.status === "DISPONIBLE") || null;

    res.json({
      modelCode,
      suggested: suggested ? { identifier: suggested.identifier, series: suggested.series } : null,
      units
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
