const { DateTime } = require("luxon");

const ZONE = "America/Sao_Paulo";

function getIsoWeekKey(date = new Date()) {
  const dt = DateTime.fromJSDate(date).setZone(ZONE);
  const weekYear = dt.weekYear;
  const weekNumber = String(dt.weekNumber).padStart(2, "0");
  return `${weekYear}-W${weekNumber}`;
}

function getDayKey(date = new Date()) {
  return DateTime.fromJSDate(date).setZone(ZONE).toISODate();
}

module.exports = { getIsoWeekKey, getDayKey };
