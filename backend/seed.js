require("dotenv").config();
const mongoose = require("mongoose");
const XLSX = require("xlsx");

function pickRequire(paths) {
  for (const p of paths) {
    try {
      return require(p);
    } catch {}
  }
  throw new Error(`No pude cargar ninguno de estos módulos:\n${paths.join("\n")}`);
}

function toModelCode(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isFinite(n)) return String(Math.trunc(n));
  return s;
}

function parseMoney(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v);
  const digits = s.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  return null;
}

// series único por (modelCode + series) usando identifier tipo: E504-1466375-010 -> 504010
function seriesFromIdentifier(identifier) {
  const id = String(identifier || "").trim();
  const m = id.match(/^[A-Za-z]+(\d+)-\d+-(\d+)$/);
  if (m) {
    const prefixNum = Number(m[1]);
    const suffix = Number(m[2]);
    if (Number.isFinite(prefixNum) && Number.isFinite(suffix)) return prefixNum * 1000 + suffix;
  }
  const m2 = id.match(/-(\d+)$/);
  if (m2) return Number(m2[1]);
  return null;
}

async function main() {
  const Unit = pickRequire(["./models/Unit", "./Unit"]);
  const ToolModel = pickRequire(["./models/ToolModel", "./ToolModel"]);
  const Movement = pickRequire(["./models/Movement", "./Movement"]);

  const file = process.argv[2] || "INVENTARIO_SEED_MODELS.xlsx";
  const wipe = process.argv.includes("--wipe");

  if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI en .env");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Mongo connected");

  const wb = XLSX.readFile(file, { cellDates: true });
  const getSheet = (name) => wb.Sheets[name] || null;

  const modelsSheet = getSheet("MODELS");
  const unitsSheet = getSheet("UNITS");
  const movementsSheet = getSheet("MOVEMENTS");

  const modelsRows = modelsSheet ? XLSX.utils.sheet_to_json(modelsSheet, { defval: null }) : [];
  const unitsRows = unitsSheet ? XLSX.utils.sheet_to_json(unitsSheet, { defval: null }) : [];
  const movementRows = movementsSheet ? XLSX.utils.sheet_to_json(movementsSheet, { defval: null }) : [];

  if (wipe) {
    await Promise.all([
      ToolModel.deleteMany({}),
      Unit.deleteMany({}),
      Movement.deleteMany({})
    ]);
    console.log("WIPED: ToolModel, Unit, Movement");
  }

  // -------- MODELS ----------
  const cleanModels = modelsRows
    .map((m) => ({
      modelCode: toModelCode(m.model_code),
      toolName: m.tool_name ? String(m.tool_name).trim() : "",
      brand: m.brand ? String(m.brand).trim() : "",
      rentalRate: parseMoney(m.rental_rate),
      warranty: parseMoney(m.warranty)
    }))
    .filter((m) => m.modelCode);

  const modelOps = cleanModels.map((m) => ({
    updateOne: {
      filter: { modelCode: m.modelCode },
      update: { $set: m },
      upsert: true
    }
  }));

  if (modelOps.length) {
    await ToolModel.bulkWrite(modelOps, { ordered: false });
    console.log(`MODELS seeded: ${cleanModels.length}`);
  } else {
    console.log("MODELS: 0 rows (nothing to seed)");
  }

  // -------- UNITS ----------
  const unitMap = new Map(); // dedupe por identifier
  for (const u of unitsRows) {
    const identifier = u.identifier ? String(u.identifier).trim() : "";
    const modelCode = toModelCode(u.model_code);

    if (!identifier || !modelCode) continue;

    const series = seriesFromIdentifier(identifier);
    if (!Number.isFinite(series)) continue;

    const status = u.status === "ARRENDADA" ? "ARRENDADA" : "DISPONIBLE";
    const lastOutAt = parseDate(u.last_out_at);

    unitMap.set(identifier, {
      identifier,
      modelCode,
      series,
      status,
      weekKey: "",
      weeklyOutCount: 0,
      outCountTotal: 0,
      lastOutAt: lastOutAt || null,
      lastInAt: null
    });
  }

  const cleanUnits = Array.from(unitMap.values());

  const unitOps = cleanUnits.map((u) => ({
    updateOne: {
      filter: { identifier: u.identifier }, // identifier es unique en tu schema
      update: { $set: u },
      upsert: true
    }
  }));

  if (unitOps.length) {
    await Unit.bulkWrite(unitOps, { ordered: false });
    console.log(`UNITS seeded: ${cleanUnits.length}`);
  } else {
    console.log("UNITS: 0 rows (nothing to seed)");
  }

  // -------- MOVEMENTS (opcional) ----------
  const cleanMovs = movementRows
    .map((m) => ({
      identifier: m.identifier ? String(m.identifier).trim() : "",
      type: m.type === "OUT" ? "OUT" : m.type === "IN" ? "IN" : "",
      user: m.user ? String(m.user).trim() : "",
      note: m.note ? String(m.note).trim() : "",
      timestamp: parseDate(m.timestamp)
    }))
    .filter((m) => m.identifier && m.type && m.timestamp);

  if (cleanMovs.length) {
    await Movement.insertMany(cleanMovs, { ordered: false });
    console.log(`MOVEMENTS seeded: ${cleanMovs.length}`);
  } else {
    console.log("MOVEMENTS: 0 rows (skipped)");
  }

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
