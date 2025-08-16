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
  // unknown units -> assume mg/dL
  return n;
};

/* ---------- safe date parsing ---------- */
/**
 * Accepts common report date formats:
 *  - YYYY-MM-DD
 *  - DD/MM/YYYY or D/M/YYYY
 *  - MM/DD/YYYY or M/D/YYYY
 *  - DD-MM-YYYY or MM-DD-YYYY
 *  - "Aug 6, 2025" / "6 Aug 2025"
 *
 * Returns a valid Date or fallback.
 */
function safeReportDate(input, fallback) {
  if (!input || typeof input !== "string") return fallback;

  const s = input.trim();
  // ISO-like first
  const iso = /^\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*$/;
  const dmy = /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*$/;

  let d = null;

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(iso);
  if (m) {
    const [_, y, mo, da] = m;
    d = new Date(Number(y), Number(mo) - 1, Number(da));
  } else {
    // DD/MM/YYYY or MM/DD/YYYY (disambiguate using > 12 as day)
    m = s.match(dmy);
    if (m) {
      let [_, a, b, y] = m;
      a = Number(a); b = Number(b);
      if (a > 12 && b <= 12) { // DD/MM/YYYY
        d = new Date(Number(y), b - 1, a);
      } else if (b > 12 && a <= 12) { // MM/DD/YYYY
        d = new Date(Number(y), a - 1, b);
      } else {
        // ambiguous 05/06/2025 → assume DD/MM/YYYY is common in reports
        d = new Date(Number(y), b - 1, a);
      }
    }
  }

  // Natural language parse fallback
  if (!d || isNaN(d.getTime())) {
    const parsed = Date.parse(s);
    if (Number.isFinite(parsed)) d = new Date(parsed);
  }

  // If still invalid, use fallback (uploadDate or now)
  if (!d || isNaN(d.getTime())) return fallback;
  return d;
}

/* ---------- main snapshot saver ---------- */
module.exports = async function saveCholesterolSnapshot(reportDoc) {
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

    // robust test date
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
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (e) {
    // Don’t crash the main analyze flow if history write fails.
    console.error("saveCholesterolSnapshot error:", e.message);
  }
};
