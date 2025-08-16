// backend/utils/aiExtract.js
// CommonJS, Node 18+ (global fetch). Mirrors your mini project behavior exactly:
// - If file is PDF with text layer => use pdf-parse + TEXT model
// - If file is image (or scanned PDF with no text) => use VISION model

const fs = require("fs");
const path = require("path");
// Use the library entry to avoid any test/demo path quirks:
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
const isImage = (p) => /\.(png|jpe?g|webp|gif)$/i.test(p);

const clamp = (v) => (typeof v === "number" ? Math.max(0, Math.min(v, 1000)) : v);
const normalizeUnits = (u) =>
  typeof u === "string"
    ? u.replace(/\s/gi, "").replace(/mgdl/i, "mg/dL").replace(/mmoll/i, "mmol/L")
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

/* ---------------------- PROMPTS (same as mini project) ---------------------- */
const EXTRACT_SYSTEM = `
You are an information extractor. Return ONLY valid minified JSON (no markdown, no text).
Schema (omit any key you can't find):
{
  "testDate": string,
  "labName": string,
  "patientName": string,
  "totalCholesterol": number,
  "ldl": number,
  "hdl": number,
  "triglycerides": number,
  "units": string,
  "notes": string
}`.trim();

const EXTRACT_USER_IMAGE = `
Extract lipid profile (cholesterol) values from the attached image.
If multiple tables/entries exist, choose the FINAL verified values.
Units may be mg/dL or mmol/L.
Return JSON ONLY.`.trim();

const EXTRACT_USER_TEXT = `
Here is the plain text extracted from a PDF cholesterol report. 
Extract the lipid profile values. If multiple tables/entries exist, choose the FINAL verified values.
Units may be mg/dL or mmol/L.
Return JSON ONLY.

<<PDF_TEXT>>
`.trim();

const ANALYSIS_SYSTEM = `
You are a medical data explainer (not a doctor). 
Classify ranges using common adult guidelines (mg/dL unless specified):
- LDL: optimal <100; near optimal 100–129; borderline high 130–159; high 160–189; very high ≥190
- HDL: low <40; acceptable 40–59; protective ≥60
- Triglycerides: normal <150; borderline-high 150–199; high 200–499; very high ≥500
- Total Cholesterol: desirable <200; borderline high 200–239; high ≥240
Return JSON ONLY:
{
  "ldlStatus": string,
  "hdlStatus": string,
  "triglycerideStatus": string,
  "totalCholesterolStatus": string,
  "summary": string,
  "tips": string[]
}`.trim();

/* ---------------------- CORE EXTRACT (identical logic to mini) ---------------------- */
async function extractCore({ filePath }) {
  if (!fs.existsSync(filePath)) throw new Error("File not found on disk");

  let data = {};

  if (isPdf(filePath)) {
    // 1) PDF text path first (highest accuracy)
    const buf = fs.readFileSync(filePath);
    const pdfRes = await pdfParse(buf);
    const pdfText = (pdfRes.text || "").trim();

    if (!pdfText || pdfText.length < 30) {
      // scanned/no text layer -> tell caller to use image path instead (vision)
      return {
        testDate: null, labName: null, patientName: null,
        totalCholesterol: null, ldl: null, hdl: null, triglycerides: null,
        units: "mg/dL",
        notes: "PDF looks scanned (no text layer). Upload as image for best results."
      };
    }

    const content = await callOpenRouter({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        { role: "user", content: EXTRACT_USER_TEXT.replace("<<PDF_TEXT>>", pdfText) },
      ],
      temperature: 0,
    });

    data = safeParseLoose(content);
  } else if (isImage(filePath)) {
    // 2) Image path -> vision model
    const dataUrl = toDataUrl(filePath);

    const content = await callOpenRouter({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACT_USER_IMAGE },
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

  // sanitize
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

/* ---------------------- PUBLIC API ---------------------- */
// EXACT name your controllers should call in the big system:
async function extractFromReport({ filePath /* absolute or relative OK */ }) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return extractCore({ filePath: abs });
}

/* --------- UPDATED: analysis mapped to the UI shape your page expects --------- */
async function analyzeValues({ ldl, hdl, triglycerides, totalCholesterol, units = "mg/dL" }) {
  const vals = { ldl, hdl, triglycerides, totalCholesterol, units };

  const toCategory = (status = "") => {
    const s = String(status).toLowerCase();
    if (!s || s.includes("unknown")) return "unknown";
    if (s.includes("optimal") || s.includes("protective") || s.includes("desirable") || s.includes("normal") || s.includes("good")) return "good";
    if (s.includes("near") || s.includes("borderline")) return "moderate";
    if (s.includes("high")) return "bad"; // covers "high" and "very high"
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
        { role: "system", content: ANALYSIS_SYSTEM },
        { role: "user", content: `Values: ${JSON.stringify(vals)}` },
      ],
      temperature: 0,
    });
    const parsed = safeParseLoose(content) || {};

    return {
      ldl: {
        value: typeof ldl === "number" ? ldl : null,
        category: toCategory(parsed.ldlStatus),
        reference: refs.ldl,
      },
      hdl: {
        value: typeof hdl === "number" ? hdl : null,
        category: toCategory(parsed.hdlStatus),
        reference: refs.hdl,
      },
      triglycerides: {
        value: typeof triglycerides === "number" ? triglycerides : null,
        category: toCategory(parsed.triglycerideStatus),
        reference: refs.tg,
      },
      totalCholesterol: {
        value: typeof totalCholesterol === "number" ? totalCholesterol : null,
        category: toCategory(parsed.totalCholesterolStatus),
        reference: refs.total,
      },
      notes: parsed.summary || "",
      nextSteps: Array.isArray(parsed.tips) ? parsed.tips : [],
    };
  } catch {
    // fallback with unknowns, still matching UI shape
    return {
      ldl: { value: ldl ?? null, category: "unknown", reference: refs.ldl },
      hdl: { value: hdl ?? null, category: "unknown", reference: refs.hdl },
      triglycerides: { value: triglycerides ?? null, category: "unknown", reference: refs.tg },
      totalCholesterol: { value: totalCholesterol ?? null, category: "unknown", reference: refs.total },
      notes: "Unable to compute analysis right now.",
      nextSteps: [],
    };
  }
}

module.exports = {
  extractFromReport, // <- use this everywhere in controllers
  analyzeValues,
};
