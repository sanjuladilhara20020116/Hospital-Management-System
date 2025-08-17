// backend/utils/aiExtract.js
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

/* ---------------- helpers ---------------- */
async function readPdfText(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const buf = fs.readFileSync(abs);
  const data = await pdfParse(buf);
  return (data.text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const pickStr = (m) => (m && m[1] ? String(m[1]).trim() : "");

// numeric cleaner that NEVER returns NaN (returns null if no digits)
function cleanNumber(s) {
  if (s == null) return null;
  const only = String(s).replace(/[^\d.]/g, "");
  if (!/\d/.test(only)) return null;
  const n = parseFloat(only);
  return Number.isFinite(n) ? n : null;
}

// get first number token in a line
function firstNumberInLine(line) {
  if (!line) return null;
  const m = line.match(/([0-9]+(?:\.[0-9]+)?)/);
  return cleanNumber(m && m[1]);
}

const looksLikeRange = (line) => /\d\s*[-–]\s*\d/.test(line || "");
const isSingleNumberLine = (line) => /^\s*\d+(?:\.\d+)?\s*$/.test(line || "");

/* ---------------- extractors ---------------- */
function extractCommon(text) {
  const labName = pickStr(text.match(/(?:Lab|Laboratory|flabs)\s*[:\-]?\s*(.+)$/mi));

  const dateRe =
    /(\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*\d{4}\b)/i;
  const testDate = pickStr(text.match(dateRe));

  const patientName =
    pickStr(text.match(/\b(Name|Patient Name)\s*[:\-]\s*([^\n]+)/i)) ||
    pickStr(text.match(/\bMr\.?\s+[A-Z][^\n]+/i));

  return { testDate, labName, patientName };
}

function extractCholesterol(text) {
  const units = /mg\/dL/i.test(text) ? "mg/dL" : /mmol\/L/i.test(text) ? "mmol/L" : "mg/dL";

  const totalCholesterol = cleanNumber(
    (text.match(/\bTotal\s*Chol(?:esterol)?\b.*?([0-9.]+)\s*(?:mg\/dL|mmol\/L)?/i) || [])[1]
  );
  const ldl = cleanNumber((text.match(/\bLDL\b[^0-9]*([0-9.]+)/i) || [])[1]);
  const hdl = cleanNumber((text.match(/\bHDL\b[^0-9]*([0-9.]+)/i) || [])[1]);
  const triglycerides = cleanNumber((text.match(/\bTriglycerides?\b[^0-9]*([0-9.]+)/i) || [])[1]);

  return { totalCholesterol, ldl, hdl, triglycerides, units };
}

/* ------- Diabetes (line-aware table parser for HbA1c) ------- */
function extractDiabetes(text) {
  const glucoseUnits = /mmol\/L/i.test(text) ? "mmol/L" : "mg/dL";
  const hba1cUnits = "%";

  const fastingGlucose = cleanNumber((text.match(/\b(Fasting(?:\s*Blood)?\s*Glucose|FBS|Fasting)\b[^0-9]*([0-9.]+)/i) || [])[2]);
  const postPrandialGlucose = cleanNumber((text.match(/\b(Post[\s\-]?Prandial|PP\s*2h|2\s*hours?)\b[^0-9]*([0-9.]+)/i) || [])[2]);
  const randomGlucose = cleanNumber((text.match(/\b(Random(?:\s*Blood)?\s*Glucose|RBS)\b[^0-9]*([0-9.]+)/i) || [])[2]);
  const ogtt2h = cleanNumber((text.match(/\b(OGTT|GTT)\b[^0-9]*(?:2\s*hour|2h)?[^0-9]*([0-9.]+)/i) || [])[2]);

  // -------- HbA1c robust extraction ----------
  // Strategy:
  // 1) Work inside the "TEST DESCRIPTION" table window until "Interpretation".
  // 2) Find a line matching /^HbA1c\b(?!\s*%)/i.
  // 3) The next few lines will be: value, ref-range, unit. We take the first
  //    line that looks like a single number; else, the first number that is NOT a range.
  const lines = text.split("\n").map((s) => s.trim());

  const tableStart = lines.findIndex((l) => /TEST\s+DESCRIPTION/i.test(l));
  const tableEnd = lines.findIndex((l, i) => i > tableStart && /Interpretation/i.test(l));
  const startIdx = tableStart >= 0 ? tableStart : 0;
  const endIdx = tableEnd > startIdx ? tableEnd : Math.min(lines.length, startIdx + 80); // guard window

  let hba1c = null;

  for (let i = startIdx; i < endIdx; i++) {
    const l = lines[i];
    if (/^HbA1c\b(?!\s*%)/i.test(l)) {
      // Look ahead up to 6 lines to find the value cell
      for (let j = i + 1; j <= i + 6 && j < endIdx; j++) {
        const look = lines[j];
        // skip empty lines and obvious headers/captions
        if (!look) continue;
        if (/REF\.?\s*RANGE/i.test(look) || /UNIT/i.test(look)) continue;

        // Accept if it's a single numeric cell (most PDFs)
        if (isSingleNumberLine(look)) {
          hba1c = firstNumberInLine(look);
          break;
        }

        // Otherwise, take the first number on the line that is NOT a range like "4.0 - 6.0"
        if (!looksLikeRange(look)) {
          const n = firstNumberInLine(look);
          if (n != null) {
            hba1c = n;
            break;
          }
        }
      }
      break; // stop after we processed the HbA1c row
    }
  }

  // Fallback (joined row) — covers "HbA1c 5 4.0-6.0 %"
  if (hba1c == null) {
    const joined = text.replace(/\n/g, " ");
    const m = joined.match(/\bHbA1c\b(?!\s*%)[^\d]{0,20}(\d+(?:\.\d+)?)[^\d]+[0-9.\-]+\s*%/i);
    hba1c = cleanNumber(m && m[1]);
  }

  // eAG note
  const eAG = cleanNumber((text.match(/Estimated\s+Average\s+Glucose[^0-9]*([0-9.]+)/i) || [])[1]);
  const notes = eAG != null ? `Estimated Average Glucose ${eAG} ${glucoseUnits}` : "";
  if ((hba1c == null || Number.isNaN(hba1c)) && eAG != null) {
    const inferred = (eAG + 46.7) / 28.7;      // ADA formula
    // round sensibly (most labs show 1 decimal; yours shows whole % for 5)
    const rounded = Math.abs(inferred - Math.round(inferred)) < 0.05
      ? Math.round(inferred)
      : Math.round(inferred * 10) / 10;
    hba1c = rounded;
  }
  
  return {
    fastingGlucose,
    postPrandialGlucose,
    randomGlucose,
    ogtt2h,
    hba1c,
    glucoseUnits,
    hba1cUnits,
    notes,
  };
}

/* ---------------- public API ---------------- */
async function extractFromReport({ filePath, reportType = "Cholesterol" }) {
  const text = await readPdfText(filePath);
  const common = extractCommon(text);

  if (String(reportType).toLowerCase() === "diabetes") {
    return { ...common, reportType, ...extractDiabetes(text) };
  }
  return { ...common, reportType, ...extractCholesterol(text) };
}

/* ---------------- analyzers (bucketization) ---------------- */
const CHOL_REFS = {
  ldl: "LDL (mg/dL): optimal <100 · near-opt 100–129 · borderline 130–159 · high 160–189 · very high ≥190",
  hdl: "HDL (mg/dL): low <40 · acceptable 40–59 · protective ≥60",
  tg: "Triglycerides (mg/dL): normal <150 · borderline 150–199 · high 200–499 · very high ≥500",
  total: "Total (mg/dL): desirable <200 · borderline 200–239 · high ≥240",
};
function catCholLDL(v) { if (v == null) return "unknown"; if (v < 100) return "good"; if (v < 160) return "moderate"; return "bad"; }
function catCholHDL(v) { if (v == null) return "unknown"; if (v < 40) return "bad"; if (v < 60) return "moderate"; return "good"; }
function catCholTG(v)  { if (v == null) return "unknown"; if (v < 150) return "good"; if (v < 200) return "moderate"; return "bad"; }
function catCholTotal(v){ if (v == null) return "unknown"; if (v < 200) return "good"; if (v < 240) return "moderate"; return "bad"; }

const DM_REFS = {
  fasting:      "Fasting Plasma Glucose (mg/dL): normal <100 · prediabetes 100–125 · diabetes ≥126",
  postprandial: "Post-prandial 2h (mg/dL): normal <140 · prediabetes 140–199 · diabetes ≥200",
  random:       "Random Glucose (mg/dL): diabetes likely ≥200 with symptoms",
  ogtt2h:       "OGTT 2-hour (mg/dL): normal <140 · prediabetes 140–199 · diabetes ≥200",
  hba1c:        "HbA1c (%): normal <5.7 · prediabetes 5.7–6.4 · diabetes ≥6.5",
};
function catDmFasting(v){ if (v == null) return "unknown"; if (v < 100) return "good"; if (v < 126) return "moderate"; return "bad"; }
function catDmPP(v){      if (v == null) return "unknown"; if (v < 140) return "good"; if (v < 200) return "moderate"; return "bad"; }
function catDmRandom(v){  if (v == null) return "unknown"; if (v >= 200) return "bad"; return "unknown"; }
function catDmOgtt(v){    if (v == null) return "unknown"; if (v < 140) return "good"; if (v < 200) return "moderate"; return "bad"; }
function catDmHba1c(v){   if (v == null) return "unknown"; if (v < 5.7) return "good"; if (v < 6.5) return "moderate"; return "bad"; }

async function analyzeValues(input) {
  const type = (input.reportType || "").toLowerCase();

  if (type === "diabetes") {
    const gUnits = input.glucoseUnits || "mg/dL";
    const aUnits = input.hba1cUnits || "%";
    return {
      fastingGlucose:      { value: input.fastingGlucose ?? null,      category: catDmFasting(input.fastingGlucose),     reference: DM_REFS.fasting,      units: gUnits },
      postPrandialGlucose: { value: input.postPrandialGlucose ?? null, category: catDmPP(input.postPrandialGlucose),    reference: DM_REFS.postprandial, units: gUnits },
      randomGlucose:       { value: input.randomGlucose ?? null,       category: catDmRandom(input.randomGlucose),       reference: DM_REFS.random,       units: gUnits },
      ogtt2h:              { value: input.ogtt2h ?? null,              category: catDmOgtt(input.ogtt2h),                reference: DM_REFS.ogtt2h,       units: gUnits },
      hba1c:               { value: input.hba1c ?? null,               category: catDmHba1c(input.hba1c),                reference: DM_REFS.hba1c,        units: aUnits },
      notes: input.notes || "",
      nextSteps: [],
    };
  }

  const units = input.units || "mg/dL";
  return {
    ldl:              { value: input.ldl ?? null,              category: catCholLDL(input.ldl),              reference: CHOL_REFS.ldl,   units },
    hdl:              { value: input.hdl ?? null,              category: catCholHDL(input.hdl),              reference: CHOL_REFS.hdl,   units },
    triglycerides:    { value: input.triglycerides ?? null,    category: catCholTG(input.triglycerides),     reference: CHOL_REFS.tg,    units },
    totalCholesterol: { value: input.totalCholesterol ?? null, category: catCholTotal(input.totalCholesterol), reference: CHOL_REFS.total, units },
    notes: input.notes || "",
    nextSteps: [],
  };
}

module.exports = { extractFromReport, analyzeValues };
