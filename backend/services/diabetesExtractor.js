// backend/services/diabetesExtractor.js
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

// ===== Mini-project constants (unchanged) =====
const VISION_MODEL = 'openai/gpt-4o-mini';
const TEXT_MODEL   = 'openai/gpt-4o-mini';

const clamp = (v, hi = 10000) =>
  Number.isFinite(Number(v)) ? Math.max(0, Math.min(Number(v), hi)) : undefined;

const normalizeUnitsStr = (u) => {
  if (!u) return u;
  if (typeof u !== 'string') return u;
  const s = u.replace(/\s+/g, '');
  if (/mgdl/i.test(s)) return 'mg/dL';
  if (/mmoll/i.test(s)) return 'mmol/L';
  if (/%/.test(s)) return '%';
  return u;
};

const normalizeUnitsObj = (units) => {
  if (!units) return {};
  if (typeof units === 'string') {
    const norm = normalizeUnitsStr(units);
    if (norm === '%') return { hba1c: '%', glucose: 'mg/dL' };
    return { lipids: norm, glucose: norm, hba1c: '%' };
  }
  return {
    lipids:  normalizeUnitsStr(units.lipids)  || 'mg/dL',
    glucose: normalizeUnitsStr(units.glucose) || 'mg/dL',
    hba1c:   normalizeUnitsStr(units.hba1c)   || '%',
  };
};

const toMgDl = (val, unit) => {
  if (val == null) return undefined;
  if (unit === 'mmol/L') return clamp(Number(val) * 18, 10000);
  return clamp(Number(val), 10000);
};

const EXTRACT_SYSTEM = `
You are an information extractor. Return ONLY valid minified JSON (no markdown, no prose).
Schema (omit keys you can't find):
{
  "testDate": string,
  "labName": string,
  "patientName": string,

  "totalCholesterol": number,
  "ldl": number,
  "hdl": number,
  "triglycerides": number,

  "fastingGlucose": number,
  "ppGlucose": number,
  "randomGlucose": number,
  "ogtt_2hr": number,
  "hba1c": number,
  "eAG": number,

  "units": {
    "lipids": "mg/dL|mmol/L",
    "glucose": "mg/dL|mmol/L",
    "hba1c": "%"
  },

  "notes": string
}
Numbers may be integers or decimals. Prefer FINAL verified values when multiple tables exist.
Use exact field names as above.
`.trim();

const EXTRACT_USER_IMAGE = `
Extract lipid and/or diabetes panel values from the attached image.
Map synonyms: (FBS/Fasting), (PP/2 hr/2-hr/OGTT 2 hr), (RBS/Random), (HbA1c/Glycosylated Hemoglobin), (Estimated Average Glucose/eAG).
Return JSON ONLY as per schema.
`.trim();

const EXTRACT_USER_TEXT = `
Here is plain text from a PDF lab report (cholesterol and/or diabetes). Extract per schema.
Choose FINAL verified values when multiple appear. Return JSON ONLY.

<<PDF_TEXT>>
`.trim();

const classify = {
  fasting(mgdl) {
    if (mgdl == null) return undefined;
    if (mgdl >= 126) return 'Diabetes';
    if (mgdl >= 100) return 'Prediabetes';
    return 'Normal';
  },
  pp2hr(mgdl) {
    if (mgdl == null) return undefined;
    if (mgdl >= 200) return 'Diabetes';
    if (mgdl >= 140) return 'Prediabetes';
    return 'Normal';
  },
  random(mgdl) {
    if (mgdl == null) return undefined;
    if (mgdl >= 200) return 'Diabetes';
    if (mgdl >= 140) return 'Prediabetes';
    return 'Normal';
  },
  hba1c(pct) {
    if (pct == null) return undefined;
    if (pct >= 6.5) return 'Diabetes';
    if (pct >= 5.7) return 'Prediabetes';
    return 'Normal';
  },
};
const worst = (labels) => {
  const rank = { Normal: 0, Prediabetes: 1, Diabetes: 2 };
  let w = 'Normal';
  for (const l of labels) if (l && rank[l] > rank[w]) w = l;
  return w;
};

const safeParseJSON = (txt) => {
  try { return JSON.parse(txt); } catch {
    const m = String(txt || '').match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
    return {};
  }
};

async function callOpenRouterJSON(payload) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }
  const resp = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Lab Report Extraction',
    },
    body: JSON.stringify(payload),
  });
  const ej = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(ej?.error?.message || `OpenRouter error ${resp.status}`);
  }
  return ej?.choices?.[0]?.message?.content ?? '{}';
}

// ===== Main extractor: returns mini-project "data" object =====
async function extractDiabetesFromFile(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  let data = {};

  if (ext === '.pdf') {
    // PDF text layer path
    let pdfText = '';
    try {
      const buf = fs.readFileSync(absPath);
      const pdfRes = await pdfParse(buf);
      pdfText = (pdfRes.text || '').trim();
    } catch (e) {
      throw new Error('bad XRef entry'); // keep the same error string you observed
    }

    if (!pdfText || pdfText.length < 30) {
      throw new Error('This PDF looks scanned (no text layer). Export as a text PDF or upload an image.');
    }

    const content = await callOpenRouterJSON({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user',   content: EXTRACT_USER_TEXT.replace('<<PDF_TEXT>>', pdfText) },
      ],
      temperature: 0,
    });
    data = safeParseJSON(content);
  } else {
    // Image path
    const mime =
      ext === '.png' ? 'image/png' :
      (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${fs.readFileSync(absPath).toString('base64')}`;

    const content = await callOpenRouterJSON({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user', content: [
          { type: 'text', text: EXTRACT_USER_IMAGE },
          { type: 'image_url', image_url: dataUrl },
        ]},
      ],
      temperature: 0,
    });
    data = safeParseJSON(content);
  }

  // ---- sanitize & normalize (exactly like mini project) ----
  if (!data) data = {};
  // lipid
  if (data.ldl != null)               data.ldl = clamp(data.ldl, 1000);
  if (data.hdl != null)               data.hdl = clamp(data.hdl, 300);
  if (data.triglycerides != null)     data.triglycerides = clamp(data.triglycerides, 5000);
  if (data.totalCholesterol != null)  data.totalCholesterol = clamp(data.totalCholesterol, 2000);
  // diabetes
  if (data.fastingGlucose != null)    data.fastingGlucose = clamp(data.fastingGlucose, 2000);
  if (data.ppGlucose != null)         data.ppGlucose = clamp(data.ppGlucose, 2000);
  if (data.randomGlucose != null)     data.randomGlucose = clamp(data.randomGlucose, 2000);
  if (data.ogtt_2hr != null)          data.ogtt_2hr = clamp(data.ogtt_2hr, 2000);
  if (data.hba1c != null)             data.hba1c = clamp(data.hba1c, 25);
  if (data.eAG != null)               data.eAG = clamp(data.eAG, 2000);

  data.units = normalizeUnitsObj(data.units);

  // lipids LLM analysis (unchanged)
  if (data.ldl != null || data.hdl != null || data.triglycerides != null || data.totalCholesterol != null) {
    const vals = {
      ldl: data.ldl ?? null,
      hdl: data.hdl ?? null,
      triglycerides: data.triglycerides ?? null,
      totalCholesterol: data.totalCholesterol ?? null,
      units: data.units.lipids || 'mg/dL',
    };
    try {
      const content = await callOpenRouterJSON({
        model: TEXT_MODEL,
        messages: [
          { role: 'system', content: `
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
}`.trim() },
          { role: 'user', content: `Values: ${JSON.stringify(vals)}` },
        ],
        temperature: 0,
      });
      const lip = safeParseJSON(content);
      data.analysis = { ...(data.analysis || {}), lipids: lip };
    } catch { /* ignore LLM failure */ }
  }

  // diabetes rule-based (unchanged)
  const gUnit = data.units.glucose || 'mg/dL';
  const fastingMg = toMgDl(data.fastingGlucose, gUnit);
  const ppMg      = toMgDl(data.ppGlucose ?? data.ogtt_2hr, gUnit);
  const randomMg  = toMgDl(data.randomGlucose, gUnit);
  const a1c       = data.hba1c != null ? Number(data.hba1c) : undefined;

  if (fastingMg != null || ppMg != null || randomMg != null || a1c != null) {
    const fastingStatus = classify.fasting(fastingMg);
    const ppStatus      = classify.pp2hr(ppMg);
    const randomStatus  = classify.random(randomMg);
    const hba1cStatus   = classify.hba1c(a1c);
    const overall       = worst([fastingStatus, ppStatus, randomStatus, hba1cStatus]);

    const lines = [];
    if (fastingStatus) lines.push(`Fasting: ${fastingStatus}${fastingMg != null ? ` (${fastingMg} mg/dL)` : ''}`);
    if (ppStatus)      lines.push(`2-hr/PP: ${ppStatus}${ppMg != null ? ` (${ppMg} mg/dL)` : ''}`);
    if (randomStatus)  lines.push(`Random: ${randomStatus}${randomMg != null ? ` (${randomMg} mg/dL)` : ''}`);
    if (hba1cStatus)   lines.push(`HbA1c: ${hba1cStatus}${a1c != null ? ` (${a1c} %)` : ''}`);

    const tips = [];
    if (overall !== 'Normal') {
      tips.push('Confirm with a clinician; repeat testing may be advised.');
      tips.push('Aim for balanced meals (plate method), regular activity, and sleep consistency.');
      tips.push('Discuss individualized targets, medications, and follow-up testing.');
    } else {
      tips.push('Maintain healthy diet, physical activity, and regular screening.');
    }

    data.analysis = {
      ...(data.analysis || {}),
      diabetes: { fastingStatus, ppStatus, randomStatus, hba1cStatus, overall, summary: lines.join(' • '), tips },
    };
  }

  return data || {};
}

module.exports = { extractDiabetesFromFile };
