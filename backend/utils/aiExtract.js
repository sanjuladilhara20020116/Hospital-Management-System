// backend/utils/aiExtract.js
// Node 18+ (global fetch)
// - PDF with text layer -> pdf-parse + TEXT model
// - Image or scanned PDF -> VISION model
// Supports reportType: 'Cholesterol' | 'Diabetes'

const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

/* ---------------------- ENV / MODELS ---------------------- */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

const VISION_MODEL = process.env.VISION_MODEL || "openai/gpt-4o-mini"; // images
const TEXT_MODEL   = process.env.TEXT_MODEL   || "openai/gpt-4o-mini"; // PDF text

const APP_URL  = process.env.APP_URL  || process.env.APP_BASE_URL || "http://localhost:3000";
const APP_NAME = process.env.APP_NAME || "Lab Report Analyzer";

/* ---------------------- HELPERS ---------------------- */
const isPdf   = (p) => /\.pdf$/i.test(p);
const isImage = (p) => /\.(png|jpe?g|webp|gif|tiff?)$/i.test(p);

const clamp = (v, lo = 0, hi = 1000) =>
  typeof v === "number" && !Number.isNaN(v) ? Math.max(lo, Math.min(v, hi)) : v;

const normalizeUnits = (u) =>
  typeof u === "string"
    ? u.replace(/\s+/g, "")
        .replace(/mgdl/i, "mg/dL")
        .replace(/mmoll/i, "mmol/L")
        .replace(/%/g, "%")
    : u;

function toDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"  ? "image/png"  :
    ext === ".jpg"  ? "image/jpeg" :
    ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    ext === ".gif"  ? "image/gif"  :
    "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function safeParseLoose(s) {
  if (!s) return {};
  try { return typeof s === "string" ? JSON.parse(s) : s; }
  catch {
    const m = String(s).match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return {};
  }
}

async function callOpenRouter(body) {
  if (!OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY");

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": APP_URL,
      "X-Title": APP_NAME,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.choices?.[0]?.message?.content ?? "{}";
}

/* ---------------------- PROMPTS ---------------------- */
// Cholesterol extractor
const CHOL_EXTRACT_SYSTEM = `
You are an information extractor. Return ONLY minified JSON (no markdown).
Schema (omit keys you can't find):
{"testDate":string,"labName":string,"patientName":string,"totalCholesterol":number,"ldl":number,"hdl":number,"triglycerides":number,"units":string,"notes":string}
`.trim();

const CHOL_EXTRACT_USER_TEXT = `
Here is the plain text from a cholesterol report. Extract the FINAL verified values.
Units may be mg/dL or mmol/L. Return JSON ONLY.

<<TEXT>>
`.trim();

const CHOL_EXTRACT_USER_IMAGE = `
Extract the lipid profile (cholesterol) values from the attached image.
If multiple tables/entries exist, choose the FINAL verified values.
Units may be mg/dL or mmol/L.
Return JSON ONLY.
`.trim();

// Diabetes extractor
const DM_EXTRACT_SYSTEM = `
You are an information extractor. Return ONLY minified JSON (no markdown).
Schema (omit keys you can't find):
{"testDate":string,"labName":string,"patientName":string,
 "fastingGlucose":number,"postPrandialGlucose":number,"randomGlucose":number,"ogtt2h":number,
 "hba1c":number,"estimatedAverageGlucose":number,
 "glucoseUnits":string,"hba1cUnits":string,"notes":string}
`.trim();

const DM_EXTRACT_USER_TEXT = `
Here is the plain text from a DIABETES (glycemic) report.
Extract FINAL verified values if present. Return JSON ONLY.

- Glucose values may appear as: Fasting, Post-Prandial (2h), Random, OGTT 2-hour, etc.
- HbA1c may appear as "HbA1C", "HBA1C", "A1c", etc.
- Estimated Average Glucose may appear as "EAG" or "Estimated Average Glucose".

<<TEXT>>
`.trim();

const DM_EXTRACT_USER_IMAGE = `
Extract diabetes values from the image (Fasting/PP/Random/OGTT if present),
plus HbA1c and Estimated Average Glucose (EAG) if present.
Return JSON ONLY with the schema you were given.
`.trim();

/* ---------------------- ANALYSIS PROMPTS (Cholesterol only needs LLM help) ---------------------- */
const CHOL_ANALYSIS_SYSTEM = `
You are a medical data explainer (not a doctor).
Classify ranges using common adult guidelines (mg/dL unless specified):
- LDL: optimal <100; near optimal 100–129; borderline high 130–159; high 160–189; very high ≥190
- HDL: low <40; acceptable 40–59; protective ≥60
- Triglycerides: normal <150; borderline-high 150–199; high 200–499; very high ≥500
- Total Cholesterol: desirable <200; borderline high 200–239; high ≥240
Return JSON ONLY:
{"ldlStatus":string,"hdlStatus":string,"triglycerideStatus":string,"totalCholesterolStatus":string,"summary":string,"tips":string[]}
`.trim();

/* ---------------------- CORE EXTRACT ---------------------- */
async function extractCore({ filePath, reportType = "Cholesterol" }) {
  if (!fs.existsSync(filePath)) throw new Error("File not found on disk");

  const isDM = String(reportType).toLowerCase().startsWith("diab");
  let data = {};

  if (isPdf(filePath)) {
    const buf = fs.readFileSync(filePath);
    const pdfRes = await pdfParse(buf);
    const pdfText = (pdfRes.text || "").trim();

    if (!pdfText || pdfText.length < 30) {
      return isDM
        ? {
            testDate: null, labName: null, patientName: null,
            fastingGlucose: null, postPrandialGlucose: null, randomGlucose: null, ogtt2h: null,
            hba1c: null, estimatedAverageGlucose: null,
            glucoseUnits: "mg/dL", hba1cUnits: "%",
            notes: "PDF looks scanned (no text layer). Upload an image for best results."
          }
        : {
            testDate: null, labName: null, patientName: null,
            totalCholesterol: null, ldl: null, hdl: null, triglycerides: null,
            units: "mg/dL",
            notes: "PDF looks scanned (no text layer). Upload an image for best results."
          };
    }

    const system = isDM ? DM_EXTRACT_SYSTEM : CHOL_EXTRACT_SYSTEM;
    const user   = (isDM ? DM_EXTRACT_USER_TEXT : CHOL_EXTRACT_USER_TEXT).replace("<<TEXT>>", pdfText);

    const content = await callOpenRouter({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
    });
    data = safeParseLoose(content);
  } else if (isImage(filePath)) {
    const dataUrl = toDataUrl(filePath);
    const system = isDM ? DM_EXTRACT_SYSTEM : CHOL_EXTRACT_SYSTEM;
    const user   = isDM ? DM_EXTRACT_USER_IMAGE : CHOL_EXTRACT_USER_IMAGE;

    const content = await callOpenRouter({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image_url", image_url: dataUrl },
          ],
        },
      ],
      temperature: 0,
    });
    data = safeParseLoose(content);
  } else {
    throw new Error("Unsupported file type (PDF, PNG, JPG, JPEG, WEBP, GIF)");
  }

  // ---------- sanitize ----------
  if (!isDM) {
    if (data) {
      if (data.ldl != null)              data.ldl = clamp(Number(data.ldl));
      if (data.hdl != null)              data.hdl = clamp(Number(data.hdl));
      if (data.triglycerides != null)    data.triglycerides = clamp(Number(data.triglycerides));
      if (data.totalCholesterol != null) data.totalCholesterol = clamp(Number(data.totalCholesterol));
      if (data.units)                    data.units = normalizeUnits(data.units);
      if (!data.units)                   data.units = "mg/dL";
    }
    return {
      testDate: data.testDate ?? null,
      labName: data.labName ?? null,
      patientName: data.patientName ?? null,
      totalCholesterol: data.totalCholesterol ?? null,
      ldl: data.ldl ?? null,
      hdl: data.hdl ?? null,
      triglycerides: data.triglycerides ?? null,
      units: data.units || "mg/dL",
      notes: data.notes || "",
    };
  }

  // Diabetes sanitize
  if (data) {
    const num = (v) => (v == null ? null : Number(v));
    const gClamp = (v) => (v == null ? null : clamp(Number(v), 0, 1000));
    const a1cClamp = (v) => (v == null ? null : clamp(Number(v), 0, 20));

    data.fastingGlucose         = gClamp(num(data.fastingGlucose));
    data.postPrandialGlucose    = gClamp(num(data.postPrandialGlucose));
    data.randomGlucose          = gClamp(num(data.randomGlucose));
    data.ogtt2h                 = gClamp(num(data.ogtt2h));
    data.hba1c                  = a1cClamp(num(data.hba1c));
    data.estimatedAverageGlucose= gClamp(num(data.estimatedAverageGlucose));

    if (data.glucoseUnits) data.glucoseUnits = normalizeUnits(data.glucoseUnits);
    if (!data.glucoseUnits) data.glucoseUnits = "mg/dL";

    if (data.hba1cUnits) data.hba1cUnits = normalizeUnits(data.hba1cUnits);
    if (!data.hba1cUnits) data.hba1cUnits = "%";
  }

  return {
    testDate: data.testDate ?? null,
    labName: data.labName ?? null,
    patientName: data.patientName ?? null,

    fastingGlucose: data.fastingGlucose ?? null,
    postPrandialGlucose: data.postPrandialGlucose ?? null,
    randomGlucose: data.randomGlucose ?? null,
    ogtt2h: data.ogtt2h ?? null,

    hba1c: data.hba1c ?? null,
    estimatedAverageGlucose: data.estimatedAverageGlucose ?? null,

    glucoseUnits: data.glucoseUnits || "mg/dL",
    hba1cUnits: data.hba1cUnits || "%",

    notes: data.notes || "",
  };
}

/* ---------------------- PUBLIC API ---------------------- */
async function extractFromReport({ filePath, reportType = "Cholesterol" }) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return extractCore({ filePath: abs, reportType });
}

/* --------- ANALYSIS (cholesterol via LLM; diabetes via rules) --------- */
async function analyzeValues(payload) {
  const type = String(payload?.reportType || "").toLowerCase();

  // ---------- Diabetes ----------
  if (type.startsWith("diab")) {
    const { fastingGlucose, postPrandialGlucose, randomGlucose, ogtt2h, hba1c,
            glucoseUnits = "mg/dL", hba1cUnits = "%" } = payload || {};

    // ADA-ish buckets (simplified; educational only)
    const catFG = (v) =>
      v == null ? "unknown" :
      v >= 126 ? "diabetes-range" :
      v >= 100 ? "prediabetes-range" : "normal";

    const catPP = (v) =>
      v == null ? "unknown" :
      v >= 200 ? "diabetes-range" :
      v >= 140 ? "prediabetes-range" : "normal";

    const catOGTT = (v) =>
      v == null ? "unknown" :
      v >= 200 ? "diabetes-range" :
      v >= 140 ? "prediabetes-range" : "normal";

    const catRandom = (v) =>
      v == null ? "unknown" :
      v >= 200 ? "high" : (v < 70 ? "low" : "normal");

    const catA1c = (v) =>
      v == null ? "unknown" :
      v >= 6.5 ? "diabetes-range" :
      v >= 5.7 ? "prediabetes-range" : "normal";

    const refFG = "Fasting glucose (mg/dL): normal <100 · prediabetes 100–125 · diabetes ≥126";
    const refPP = "2h post-prandial (mg/dL): normal <140 · prediabetes 140–199 · diabetes ≥200";
    const refOG = "OGTT 2h (mg/dL): normal <140 · prediabetes 140–199 · diabetes ≥200";
    const refRG = "Random glucose (mg/dL): ≥200 (with symptoms) suggests diabetes";
    const refA1 = "HbA1c (%): normal <5.7 · prediabetes 5.7–6.4 · diabetes ≥6.5";

    // Map to UI “bucket” shape used by your page
    return {
      fastingGlucose:      { value: fastingGlucose ?? null,      category: catFG(fastingGlucose),   reference: refFG, units: glucoseUnits },
      postPrandialGlucose: { value: postPrandialGlucose ?? null, category: catPP(postPrandialGlucose),reference: refPP, units: glucoseUnits },
      randomGlucose:       { value: randomGlucose ?? null,       category: catRandom(randomGlucose),  reference: refRG, units: glucoseUnits },
      ogtt2h:              { value: ogtt2h ?? null,              category: catOGTT(ogtt2h),          reference: refOG, units: glucoseUnits },
      hba1c:               { value: hba1c ?? null,               category: catA1c(hba1c),            reference: refA1, units: hba1cUnits },
      notes: "Educational summary only; not a diagnosis.",
      nextSteps: [
        "Discuss results with your clinician.",
        "Follow local testing instructions (fasting hours, meds).",
        "Maintain a balanced diet, regular activity, and adequate sleep."
      ],
    };
  }

  // ---------- Cholesterol (use LLM) ----------
  const vals = {
    ldl: payload?.ldl,
    hdl: payload?.hdl,
    triglycerides: payload?.triglycerides,
    totalCholesterol: payload?.totalCholesterol,
    units: payload?.units || "mg/dL",
  };

  const toCategory = (status = "") => {
    const s = String(status).toLowerCase();
    if (!s || s.includes("unknown")) return "unknown";
    if (s.includes("optimal") || s.includes("protective") || s.includes("desirable") || s.includes("normal") || s.includes("good")) return "good";
    if (s.includes("near") || s.includes("borderline")) return "moderate";
    if (s.includes("high")) return "bad"; // covers "high" & "very high"
    return "unknown";
  };

  const refs = {
    ldl:   "LDL (mg/dL): optimal <100 · near-opt 100–129 · borderline 130–159 · high 160–189 · very high ≥190",
    hdl:   "HDL (mg/dL): low <40 · acceptable 40–59 · protective ≥60",
    tg:    "Triglycerides (mg/dL): normal <150 · borderline 150–199 · high 200–499 · very high ≥500",
    total: "Total (mg/dL): desirable <200 · borderline 200–239 · high ≥240",
  };

  try {
    const content = await callOpenRouter({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: CHOL_ANALYSIS_SYSTEM },
        { role: "user", content: `Values: ${JSON.stringify(vals)}` },
      ],
      temperature: 0,
    });
    const parsed = safeParseLoose(content) || {};

    return {
      ldl:              { value: typeof vals.ldl === "number" ? vals.ldl : null, category: toCategory(parsed.ldlStatus),              reference: refs.ldl },
      hdl:              { value: typeof vals.hdl === "number" ? vals.hdl : null, category: toCategory(parsed.hdlStatus),              reference: refs.hdl },
      triglycerides:    { value: typeof vals.triglycerides === "number" ? vals.triglycerides : null, category: toCategory(parsed.triglycerideStatus), reference: refs.tg },
      totalCholesterol: { value: typeof vals.totalCholesterol === "number" ? vals.totalCholesterol : null, category: toCategory(parsed.totalCholesterolStatus), reference: refs.total },
      notes: parsed.summary || "",
      nextSteps: Array.isArray(parsed.tips) ? parsed.tips : [],
    };
  } catch {
    return {
      ldl:              { value: vals.ldl ?? null,              category: "unknown", reference: refs.ldl },
      hdl:              { value: vals.hdl ?? null,              category: "unknown", reference: refs.hdl },
      triglycerides:    { value: vals.triglycerides ?? null,    category: "unknown", reference: refs.tg },
      totalCholesterol: { value: vals.totalCholesterol ?? null, category: "unknown", reference: refs.total },
      notes: "Unable to compute analysis right now.",
      nextSteps: [],
    };
  }
}

module.exports = {
  extractFromReport,
  analyzeValues,
};
