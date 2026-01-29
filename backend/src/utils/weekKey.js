const { DateTime } = require("luxon");

function getIsoWeekKey(date = new Date()) {
  const dt = DateTime.fromJSDate(date).setZone("America/Sao_Paulo");
  const weekYear = dt.weekYear;
  const weekNumber = String(dt.weekNumber).padStart(2, "0");
  return `${weekYear}-W${weekNumber}`;
}

module.exports = { getIsoWeekKey };
