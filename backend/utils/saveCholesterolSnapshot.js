// backend/utils/saveCholesterolSnapshot.js
const path = require("path");
const CholesterolResult = require("../models/CholesterolResult");

/* ---------- unit conversions ---------- */
const toMgDl = (val, units, kind) => {
  if (val == null || val === "") return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;

  const u = (units || "").toLowerCase();
  if (u === "mg/dl" || u === "mgdl" || u === "") return n;
  if (u === "mmol/l" || u === "mmoll") {
    if (kind === "triglycerides") return n * 88.57; // TG
    return n * 38.67;                               // total/LDL/HDL
  }
  return n; // assume mg/dL if unknown
};

/* ---------- safe date parsing ---------- */
function safeReportDate(input, fallback) {
  if (!input || typeof input !== "string") return fallback;

  const s = input.trim();
  const iso = /^\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*$/;
  const dmy = /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*$/;

  let d = null;
  let m = s.match(iso);
  if (m) {
    const [_, y, mo, da] = m;
    d = new Date(Number(y), Number(mo) - 1, Number(da));
  } else {
    m = s.match(dmy);
    if (m) {
      let [_, a, b, y] = m;
      a = Number(a); b = Number(b);
      if (a > 12 && b <= 12) d = new Date(Number(y), b - 1, a);      // DD/MM/YYYY
      else if (b > 12 && a <= 12) d = new Date(Number(y), a - 1, b); // MM/DD/YYYY
      else d = new Date(Number(y), b - 1, a);                        // assume DD/MM/YYYY
    }
  }
  if (!d || isNaN(d.getTime())) {
    const parsed = Date.parse(s);
    if (Number.isFinite(parsed)) d = new Date(parsed);
  }
  if (!d || isNaN(d.getTime())) return fallback;
  return d;
}

/* ---------- main snapshot saver ---------- */
async function saveCholesterolSnapshot(reportDoc) {
  try {
    if (!reportDoc?.patientId) return;

    const ex = reportDoc.extracted || {};
    const units = (ex.units || "mg/dL").trim();

    const total_mg = toMgDl(ex.totalCholesterol, units, "cholesterol");
    const ldl_mg   = toMgDl(ex.ldl,             units, "cholesterol");
    const hdl_mg   = toMgDl(ex.hdl,             units, "cholesterol");
    const tg_mg    = toMgDl(ex.triglycerides,   units, "triglycerides");

    const nonHDL = (total_mg != null && hdl_mg != null) ? (total_mg - hdl_mg) : null;
    const vldl   = (tg_mg != null) ? (tg_mg / 5) : null;

    const fallbackDate = reportDoc.uploadDate || new Date();
    const testDate = safeReportDate(ex.testDate, fallbackDate);

    await CholesterolResult.findOneAndUpdate(
      { reportId: reportDoc._id },
      {
        patientId: reportDoc.patientId,
        reportId: reportDoc._id,
        reportType: reportDoc.reportType || "Cholesterol",
        testDate,
        labName: ex.labName || "",
        sourceFile: path.basename(reportDoc.filePath || ""),
        unitsOriginal: units,
        valuesOriginal: {
          totalCholesterol: ex.totalCholesterol ?? null,
          ldl: ex.ldl ?? null,
          hdl: ex.hdl ?? null,
          triglycerides: ex.triglycerides ?? null,
        },
        unitsStd: "mg/dL",
        valuesStd: {
          totalCholesterol: total_mg,
          ldl: ldl_mg,
          hdl: hdl_mg,
          triglycerides: tg_mg,
        },
        derivedStd: { nonHDL, vldl },
        recordedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (e) {
    console.error("saveCholesterolSnapshot error:", e.message);
  }
}

module.exports = saveCholesterolSnapshot;
