const express = require("express");
const router = express.Router();
const Unit = require("../models/Unit");
const ToolModel = require("../models/ToolModel");
const { getDayKey } = require("../utils/weekKey");

router.get("/", async (req, res, next) => {
  try {
    const dk = getDayKey(new Date());
    const toolModelsCollection = ToolModel.collection.name;

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
          from: toolModelsCollection,
          localField: "_id",
          foreignField: "modelCode",
          as: "modelInfo"
        }
      },
      {
        $addFields: {
          modelCode: "$_id",
          toolName: { $ifNull: [{ $arrayElemAt: ["$modelInfo.toolName", 0] }, ""] }
        }
      },
      {
        $lookup: {
          from: "units",
          let: { modelCode: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$modelCode", "$$modelCode"] }, { $eq: ["$status", "DISPONIBLE"] }] } } },
            { $addFields: { usedToday: { $eq: ["$dayKey", dk] } } },
            { $sort: { usedToday: 1, dailyOutCount: 1, weeklyOutCount: 1, outCountTotal: 1, lastOutAt: 1, series: 1 } },
            { $limit: 1 },
            { $project: { _id: 0, identifier: 1, series: 1 } }
          ],
          as: "suggested"
        }
      },
      {
        $addFields: {
          suggestedSeries: { $ifNull: [{ $arrayElemAt: ["$suggested.series", 0] }, null] },
          suggestedIdentifier: { $ifNull: [{ $arrayElemAt: ["$suggested.identifier", 0] }, null] }
        }
      },
      {
        $project: {
          _id: 0,
          modelCode: 1,
          toolName: 1,
          stockTotal: 1,
          disponibles: 1,
          arrendadas: 1,
          suggestedSeries: 1,
          suggestedIdentifier: 1
        }
      },
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
    const dk = getDayKey(new Date());

    const tool = await ToolModel.findOne({ modelCode }).lean();

    const units = await Unit.aggregate([
      { $match: { modelCode } },
      {
        $addFields: {
          statusOrder: { $cond: [{ $eq: ["$status", "DISPONIBLE"] }, 0, 1] },
          usedToday: { $eq: ["$dayKey", dk] }
        }
      },
      {
        $sort: {
          statusOrder: 1,
          usedToday: 1,
          dailyOutCount: 1,
          weeklyOutCount: 1,
          outCountTotal: 1,
          lastOutAt: 1,
          series: 1
        }
      },
      { $project: { statusOrder: 0 } }
    ]);

    const available = units.filter((u) => u.status === "DISPONIBLE");
    const suggested = available.find((u) => !u.usedToday) || available[0] || null;

    res.json({
      modelCode,
      toolName: tool?.toolName || "",
      suggested: suggested ? { identifier: suggested.identifier, series: suggested.series } : null,
      units
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
