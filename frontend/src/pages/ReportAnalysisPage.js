// ReportAnalysisPage.jsx — Dashboard-styled analysis page (Cholesterol & Diabetes)
// Dependencies: react-router-dom, recharts
import "./ReportAnalysisPage.css";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";


const API_BASE = "http://localhost:5000/api";

/* -------------------------- tiny shared utilities -------------------------- */
const formatDistanceToNow = (d) => {
  const now = new Date();
  const diff = now - new Date(d);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
};
const showNum = (n) => (Number.isFinite(n) ? n : "—");

/* ----------------------------- Cholesterol logic --------------------------- */
const calcCholDerived = (v = {}) => {
  const { ldl = null, hdl = null, triglycerides = null } = v || {};
  const vldl = Number.isFinite(triglycerides) ? Math.round(triglycerides / 5) : null;
  const totalCholesterol = [ldl, hdl, vldl].every(Number.isFinite) ? ldl + hdl + vldl : null;
  return { ...v, vldl, totalCholesterol };
};
const cholRisk = (type, value) => {
  if (!Number.isFinite(value)) return "unknown";
  switch (type) {
    case "total": return value < 200 ? "desirable" : value <= 239 ? "borderline" : "high";
    case "ldl":   return value < 100 ? "optimal"    : value <= 129 ? "near-optimal" : value <= 159 ? "borderline" : value <= 189 ? "high" : "very-high";
    case "hdl":   return value >= 60 ? "protective" : value >= 40 ? "acceptable" : "low";
    case "triglycerides": return value < 150 ? "normal" : value <= 199 ? "borderline" : value <= 499 ? "high" : "very-high";
    case "vldl":  return value <= 30 ? "normal" : "high";
    default: return "unknown";
  }
};
const cholRiskMessage = ({ ldl, hdl, triglycerides }) => {
  if ([ldl, hdl, triglycerides].some((x) => !Number.isFinite(x))) return "—";
  if (ldl < 100 && hdl >= 60 && triglycerides < 150) return "Excellent cholesterol profile! Keep it up.";
  if (ldl <= 129 && hdl >= 40 && triglycerides <= 199) return "Good levels with room to improve.";
  return "Cholesterol needs attention. Consider lifestyle changes and consult your physician.";
};
const CHOL_RANGES = [
  { type: "Total Cholesterol", desirable: "<200 mg/dL", borderline: "200–239 mg/dL", high: "≥240 mg/dL" },
  { type: "LDL Cholesterol", optimal: "<100 mg/dL", nearOptimal: "100–129 mg/dL", borderline: "130–159 mg/dL", high: "160–189 mg/dL", veryHigh: "≥190 mg/dL" },
  { type: "HDL Cholesterol", low: "<40 mg/dL (men), <50 mg/dL (women)", acceptable: "40–59 mg/dL", protective: "≥60 mg/dL" },
  { type: "Triglycerides", normal: "<150 mg/dL", borderline: "150–199 mg/dL", high: "200–499 mg/dL", veryHigh: "≥500 mg/dL" },
  { type: "VLDL Cholesterol", normal: "≤30 mg/dL", high: ">30 mg/dL" },
];

/* -------------------------------- Diabetes -------------------------------- */
const eAGfromA1c = (a1c) => (Number.isFinite(a1c) ? Math.round(28.7 * a1c - 46.7) : null);
const diabetesRisk = (kind, value) => {
  if (!Number.isFinite(value)) return "unknown";
  switch (kind) {
    case "fasting": return value < 100 ? "normal" : value <= 125 ? "prediabetes" : "diabetes";
    case "pp":      return value < 140 ? "normal" : value <= 199 ? "prediabetes" : "diabetes";
    case "random":  return value < 140 ? "normal" : value <= 199 ? "elevated" : "diabetes";
    case "a1c":     return value < 5.7 ? "normal" : value < 6.5 ? "prediabetes" : "diabetes";
    default: return "unknown";
  }
};
const diabetesRiskMessage = ({ fastingGlucose, postPrandialGlucose, randomGlucose, hba1c }) => {
  const flags = [
    diabetesRisk("fasting", fastingGlucose),
    diabetesRisk("pp", postPrandialGlucose),
    diabetesRisk("random", randomGlucose),
    diabetesRisk("a1c", hba1c),
  ];
  if (flags.every((f) => f === "normal" || f === "unknown")) return "Excellent glucose control.";
  if (flags.some((f) => f === "diabetes")) return "Values in the diabetic range — please consult your clinician.";
  return "Prediabetes risk — lifestyle changes and monitoring recommended.";
};
const DIAB_RANGES = [
  { type: "Fasting (FPG)", normal: "<100 mg/dL", prediabetes: "100–125 mg/dL", diabetes: "≥126 mg/dL" },
  { type: "2-hr / Post-Prandial", normal: "<140 mg/dL", prediabetes: "140–199 mg/dL", diabetes: "≥200 mg/dL" },
  { type: "Random Glucose", normal: "<140 mg/dL", elevated: "140–199 mg/dL", diabetes: "≥200 mg/dL (with sx)" },
  { type: "HbA1c", normal: "<5.7%", prediabetes: "5.7–6.4%", diabetes: "≥6.5%" },
];

/* ------------------------------ Normalizers ------------------------------- */
function normalizeCholesterol(analysis, extracted = {}) {
  const a = analysis || {};
  const ex = extracted || {};
  const alreadyBuckets =
    a && typeof a === "object" && ("ldl" in a || "hdl" in a || "triglycerides" in a || "totalCholesterol" in a);
  if (alreadyBuckets) {
    return {
      ldl: a.ldl || { value: ex.ldl ?? null, category: "unknown", reference: "" },
      hdl: a.hdl || { value: ex.hdl ?? null, category: "unknown", reference: "" },
      triglycerides: a.triglycerides || { value: ex.triglycerides ?? null, category: "unknown", reference: "" },
      totalCholesterol: a.totalCholesterol || { value: ex.totalCholesterol ?? null, category: "unknown", reference: "" },
      notes: a.notes || a.summary || "",
      nextSteps: Array.isArray(a.nextSteps) ? a.nextSteps : Array.isArray(a.tips) ? a.tips : [],
    };
  }
  const REFS = {
    ldl: "LDL (mg/dL): optimal <100 · near-opt 100–129 · borderline 130–159 · high 160–189 · very high ≥190",
    hdl: "HDL (mg/dL): low <40 · acceptable 40–59 · protective ≥60",
    tg: "Triglycerides (mg/dL): normal <150 · borderline 150–199 · high 200–499 · very high ≥500",
    total: "Total (mg/dL): desirable <200 · borderline 200–239 · high ≥240",
  };
  const toCategory = (s = "") => {
    const t = String(s).toLowerCase();
    if (!t || t.includes("unknown")) return "unknown";
    if (/(optimal|protective|desirable|normal|good)/.test(t)) return "good";
    if (/(near|borderline)/.test(t)) return "moderate";
    if (/high/.test(t)) return "bad";
    return "unknown";
  };
  return {
    ldl: { value: ex.ldl ?? null, category: toCategory(a.ldlStatus), reference: REFS.ldl },
    hdl: { value: ex.hdl ?? null, category: toCategory(a.hdlStatus), reference: REFS.hdl },
    triglycerides: { value: ex.triglycerides ?? null, category: toCategory(a.triglycerideStatus), reference: REFS.tg },
    totalCholesterol: { value: ex.totalCholesterol ?? null, category: toCategory(a.totalCholesterolStatus), reference: REFS.total },
    notes: a.summary || "",
    nextSteps: Array.isArray(a.tips) ? a.tips : [],
  };
}
function normalizeDiabetes(analysis, extracted = {}) {
  const a = analysis || {};
  const ex = extracted || {};
  const alreadyBuckets =
    a && typeof a === "object" && ("fastingGlucose" in a || "postPrandialGlucose" in a || "randomGlucose" in a || "ogtt2h" in a || "hba1c" in a);
  const unknown = { value: null, category: "unknown", reference: "" };
  if (alreadyBuckets) {
    return {
      fastingGlucose: a.fastingGlucose || { ...unknown, value: ex.fastingGlucose ?? null },
      postPrandialGlucose: a.postPrandialGlucose || { ...unknown, value: ex.postPrandialGlucose ?? null },
      randomGlucose: a.randomGlucose || { ...unknown, value: ex.randomGlucose ?? null },
      ogtt2h: a.ogtt2h || { ...unknown, value: ex.ogtt2h ?? null },
      hba1c: a.hba1c || { ...unknown, value: ex.hba1c ?? null },
      notes: a.notes || "",
      nextSteps: Array.isArray(a.nextSteps) ? a.nextSteps : [],
    };
  }
  return {
    fastingGlucose: { ...unknown, value: ex.fastingGlucose ?? null },
    postPrandialGlucose: { ...unknown, value: ex.postPrandialGlucose ?? null },
    randomGlucose: { ...unknown, value: ex.randomGlucose ?? null },
    ogtt2h: { ...unknown, value: ex.ogtt2h ?? null },
    hba1c: { ...unknown, value: ex.hba1c ?? null },
    notes: a.summary || "",
    nextSteps: Array.isArray(a.tips) ? a.tips : [],
  };
}

/* ---------------------------------- Page ---------------------------------- */
export default function ReportAnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");

  // Diabetes preview (no save)
  const [mini, setMini] = useState(null);
  const [miniErr, setMiniErr] = useState("");
  const [miniLoading, setMiniLoading] = useState(false);

  // Optional advice
  const [coach, setCoach] = useState({ loading: false, error: "", data: null });

  // Compare
  const [compare, setCompare] = useState(null);
  const [compareErr, setCompareErr] = useState("");

  const fetchReport = async () => {
    setErr("");
    try {
      const r = await fetch(`${API_BASE}/reports/${encodeURIComponent(id)}`);
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Failed to load report");
      setReport(data.report);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiniPreview = async (reportId) => {
    setMiniErr("");
    setMini(null);
    setMiniLoading(true);
    try {
      const r = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/diabetes/preview`, { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Preview failed");
      setMini(data.parsed || null);
    } catch (e) {
      setMiniErr(e.message);
      setMini(null);
    } finally {
      setMiniLoading(false);
    }
  };

  const fetchAdvice = async (reportId) => {
    setCoach({ loading: true, error: "", data: null });
    try {
      const r = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/advice`);
      if (r.status === 404) { setCoach({ loading: false, error: "", data: null }); return; }
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Advice failed");
      setCoach({ loading: false, error: "", data: data.advice });
    } catch (e) {
      setCoach({ loading: false, error: e.message, data: null });
    }
  };

  useEffect(() => { fetchReport(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    const t = (report?.reportType || "").toLowerCase();
    if (report?._id && !report?.isAnalyzed && (t === "diabetes" || t === "diabetic")) {
      fetchMiniPreview(report._id);
    } else {
      setMini(null); setMiniErr(""); setMiniLoading(false);
    }
  }, [report?._id, report?.isAnalyzed, report?.reportType]);

  useEffect(() => {
    if (report?._id && report?.isAnalyzed) fetchAdvice(report._id);
    else setCoach({ loading: false, error: "", data: null });
  }, [report?._id, report?.isAnalyzed]);

  useEffect(() => {
    if (!report?._id) return;
    (async () => {
      try {
        setCompareErr("");
        const r = await fetch(`${API_BASE}/reports/${encodeURIComponent(report._id)}/compare`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.message || "Compare failed");
        setCompare(j);
      } catch (e) {
        setCompare(null);
        setCompareErr(e.message);
      }
    })();
  }, [report?._id]);

  const runAnalyze = async () => {
    setErr("");
    try {
      const r = await fetch(`${API_BASE}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: id }),
      });
      if (r.status === 409) { await fetchReport(); return; }
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Analyze failed");
      await fetchReport();
    } catch (e) { setErr(e.message); }
  };

  const isChol = (report?.reportType || "").toLowerCase() === "cholesterol";
  const isDia = ["diabetes", "diabetic"].includes((report?.reportType || "").toLowerCase());

  const ex = report?.isAnalyzed ? (report?.extracted || {}) : {};
  const ana = useMemo(() => {
    if (!report) return null;
    return isChol ? normalizeCholesterol(report.analysis, ex)
         : isDia  ? normalizeDiabetes(report.analysis, ex)
                  : report.analysis || null;
  }, [report, ex, isChol, isDia]);

  return (
    <div className="ra-wrap">
      <button onClick={() => navigate(-1)} className="ra-back">← Back</button>

      <h1 className="ra-title">Report Analysis</h1>

      {loading && <p>Loading…</p>}
      {err && <div className="ra-error">Error: {err}</div>}

      {!loading && report && (
        <>
          {/* header badges */}
          <div className="ra-card ra-header">
            <div className="ra-badges">
              <Badge label="Report ID" value={report._id} mono />
              <Badge label="Type" value={report.reportType} />
              <Badge label="Uploaded" value={report.uploadDate ? new Date(report.uploadDate).toLocaleString() : "—"} />
              <Badge label="Analyzed" value={report.isAnalyzed ? "Yes" : "No"} color={report.isAnalyzed ? "#16a34a" : "#ea580c"} />
            </div>

            {!report.isAnalyzed && (
              <div className="ra-actions">
                <button className="ra-btn ra-btn-primary" onClick={runAnalyze}>Analyze & Save</button>
                {isDia && <button className="ra-btn ra-btn-cyan" onClick={() => fetchMiniPreview(report._id)}>Refresh Preview</button>}
                <p className="ra-hint">Preview shows extracted values without saving. Click <b>Analyze & Save</b> to persist.</p>
              </div>
            )}
          </div>

          {isChol && (
            <CholesterolView
              report={report} ex={ex} ana={ana}
              compare={compare} compareErr={compareErr}
              coach={coach}
            />
          )}

          {isDia && (
            <DiabetesView
              report={report} ex={ex} ana={ana}
              compare={compare} compareErr={compareErr}
              mini={mini} miniErr={miniErr} miniLoading={miniLoading}
              coach={coach}
            />
          )}

          {!isChol && !isDia && (
            <div className="ra-card">
              <p>Unsupported report type. Raw analysis:</p>
              <pre className="ra-pre">{JSON.stringify(report?.analysis || {}, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================= Cholesterol View ============================ */
function CholesterolView({ report, ex, ana, compare, compareErr, coach }) {
  const latest = calcCholDerived({ ldl: ex?.ldl, hdl: ex?.hdl, triglycerides: ex?.triglycerides });
  const prev = compare?.previousExtracted ? calcCholDerived(compare.previousExtracted) : null;
  const units = ex?.units || "mg/dL";

  const chartData = prev ? [
    { name: "Total", Previous: prev.totalCholesterol, Current: latest.totalCholesterol },
    { name: "LDL", Previous: prev.ldl, Current: latest.ldl },
    { name: "HDL", Previous: prev.hdl, Current: latest.hdl },
    { name: "VLDL", Previous: prev.vldl, Current: latest.vldl },
    { name: "Triglycerides", Previous: prev.triglycerides, Current: latest.triglycerides },
  ] : [];

  const riskMsg = cholRiskMessage(latest).toLowerCase();
  const statusClass = riskMsg.includes("excellent") ? "safe" : riskMsg.includes("good") ? "warning" : "danger";

  return (
    <>
      <div className="ra-split">
        {/* left */}
        <div className="ra-left">
          <img src="/heart.png" alt="Heart" className="ra-heart" />

          <Card icon="❤️" title="Health Status">
            <p className="ra-par">{coach?.data?.healthStatus || ana?.notes || "Your cholesterol summary will appear here."}</p>
          </Card>

          <Card icon="🧠" title="Possible Reasons">
            {Array.isArray(coach?.data?.reasons) && coach.data.reasons.length > 0 ? (
              <ul className="ra-list">{coach.data.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            ) : <p className="ra-muted">—</p>}
          </Card>

          <Card icon="🍎" title="Recommendations">
            {Array.isArray(coach?.data?.recommendations) && coach.data.recommendations.length > 0 ? (
              <ul className="ra-list">{coach.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            ) : <p className="ra-muted">—</p>}
          </Card>
        </div>

        {/* right */}
        <div className="ra-right">
          <Section title="Latest Report" badge={report?.uploadDate ? `${formatDistanceToNow(report.uploadDate)} ago` : null}>
            <div className="ra-metric-grid">
              {[
                { label: "Total Cholesterol", value: latest.totalCholesterol, type: "total" },
                { label: "LDL", value: latest.ldl, type: "ldl" },
                { label: "HDL", value: latest.hdl, type: "hdl" },
                { label: "VLDL", value: latest.vldl, type: "vldl" },
                { label: "Triglycerides", value: latest.triglycerides, type: "triglycerides" },
              ].map((item, i) => (
                <MetricChip
                  key={i}
                  label={item.label}
                  value={item.value}
                  unit={units}
                  risk={cholRisk(item.type, item.value)}
                />
              ))}
            </div>
          </Section>

          <Section title="Risk Summary" rightBadge={<RiskBadge mode={statusClass} />}>
            <div className={`ra-risk ${statusClass}`}>
              <div className="ra-risk__icon" aria-hidden>
                {statusClass === "danger" ? "🚨" : statusClass === "warning" ? "⚠️" : "🛡️"}
              </div>
              <div className="ra-risk__text">{cholRiskMessage(latest)}</div>
            </div>
          </Section>

          <Section title="Comparison with Previous Report">
            <div className="ra-compare">
              <ul className="ra-list">
                {[
                  { label: "Total Cholesterol", curr: latest.totalCholesterol, prev: prev?.totalCholesterol },
                  { label: "LDL", curr: latest.ldl, prev: prev?.ldl },
                  { label: "HDL", curr: latest.hdl, prev: prev?.hdl },
                  { label: "VLDL", curr: latest.vldl, prev: prev?.vldl },
                  { label: "Triglycerides", curr: latest.triglycerides, prev: prev?.triglycerides },
                ].map(({ label, curr, prev }, idx) => (
                  <li key={idx}>
                    {prev == null ? `🆕 First ${label} reading: ${showNum(curr)} ${units}` :
                     curr > prev ? `⬆️ ${label} increased by ${showNum(curr - prev)} ${units}` :
                     curr < prev ? `⬇️ ${label} decreased by ${showNum(prev - curr)} ${units}` :
                                   `➖ No change in ${label}`}
                  </li>
                ))}
              </ul>

              <div className="ra-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Previous" fill="#d0d0d0" />
                    <Bar dataKey="Current" fill="#4e8cff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {compareErr && <p className="ra-error">Compare error: {compareErr}</p>}
          </Section>

          <Section title="Enhanced Value Breakdown & Meaning">
            <ul className="ra-list">
              <li><strong>Total Cholesterol ({showNum(latest.totalCholesterol)} {units})</strong> — Overall cholesterol; LDL + HDL + VLDL.</li>
              {Number.isFinite(latest.ldl) && <li><strong>LDL ({latest.ldl} {units})</strong> — {coach.data?.breakdown?.ldl || "Higher values increase risk."}</li>}
              {Number.isFinite(latest.hdl) && <li><strong>HDL ({latest.hdl} {units})</strong> — {coach.data?.breakdown?.hdl || "Higher is generally protective."}</li>}
              {Number.isFinite(latest.vldl) && <li><strong>VLDL ({latest.vldl} {units})</strong> — Carries triglycerides (≈ TG ÷ 5).</li>}
              {Number.isFinite(latest.triglycerides) && <li><strong>Triglycerides ({latest.triglycerides} {units})</strong> — {coach.data?.breakdown?.triglycerides || "High levels can raise cardiovascular risk."}</li>}
            </ul>
          </Section>
        </div>
      </div>

      {/* full-width ranges card below the two-column layout */}
      <RangesSection items={CHOL_RANGES} />
    </>
  );
}


/* =============================== Diabetes View ============================ */
function DiabetesView({ report, ex, ana, compare, compareErr, mini, miniErr, miniLoading, coach }) {
  const gUnits = ex?.glucoseUnits || "mg/dL";
  const a1cUnits = ex?.hba1cUnits || "%";

  const cur = {
    fastingGlucose: Number.isFinite(ex?.fastingGlucose) ? ex.fastingGlucose : mini?.fastingGlucose ?? null,
    postPrandialGlucose: Number.isFinite(ex?.postPrandialGlucose) ? ex.postPrandialGlucose : mini?.ppGlucose ?? mini?.ogtt_2hr ?? null,
    randomGlucose: Number.isFinite(ex?.randomGlucose) ? ex.randomGlucose : mini?.randomGlucose ?? null,
    hba1c: Number.isFinite(ex?.hba1c) ? ex.hba1c : mini?.hba1c ?? null,
  };
  const eAG = eAGfromA1c(cur.hba1c);

  const prev = compare?.previousExtracted || null;
  const chartData = prev ? [
    { name: "Fasting", Previous: prev.fastingGlucose, Current: cur.fastingGlucose },
    { name: "2-hr/PP", Previous: prev.postPrandialGlucose ?? prev.ogtt2h, Current: cur.postPrandialGlucose },
    { name: "Random", Previous: prev.randomGlucose, Current: cur.randomGlucose },
    { name: "HbA1c", Previous: prev.hba1c, Current: cur.hba1c },
  ] : [];

  const riskMsg = diabetesRiskMessage(cur).toLowerCase();
  const statusClass =
    riskMsg.includes("diabetic") || riskMsg.includes("consult") ? "danger"
    : riskMsg.includes("prediabetes") || riskMsg.includes("risk") ? "warning"
    : "safe";

  return (
    <>
      <div className="ra-split">
        {/* left */}
        <div className="ra-left">
          {!report.isAnalyzed && (
            <Card icon="ℹ️" title="Preview Mode">
              {miniLoading ? <p className="ra-muted">Extracting preview…</p>
                : miniErr ? <p className="ra-error">Preview Error: {miniErr}</p>
                : <p className="ra-par">Showing extracted values without saving. Click <b>Analyze & Save</b> to persist.</p>}
            </Card>
          )}

          <Card icon="❤️" title="Health Status">
            <p className="ra-par">{coach?.data?.healthStatus || ana?.notes || "Your diabetes summary will appear here."}</p>
          </Card>

          <Card icon="🧠" title="Possible Reasons">
            {Array.isArray(coach?.data?.reasons) && coach.data.reasons.length > 0 ? (
              <ul className="ra-list">{coach.data.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            ) : <p className="ra-muted">—</p>}
          </Card>

          <Card icon="🍎" title="Recommendations">
            {Array.isArray(coach?.data?.recommendations) && coach.data.recommendations.length > 0 ? (
              <ul className="ra-list">{coach.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            ) : <p className="ra-muted">—</p>}
          </Card>
        </div>

        {/* right */}
        <div className="ra-right">
          <Section title="Latest Report" badge={report?.uploadDate ? `${formatDistanceToNow(report.uploadDate)} ago` : null}>
            <div className="ra-metric-grid">
              <MetricChip label="Fasting (FPG)" value={cur.fastingGlucose} unit={gUnits} risk={diabetesRisk("fasting", cur.fastingGlucose)} />
              <MetricChip label="2-hr / PP" value={cur.postPrandialGlucose} unit={gUnits} risk={diabetesRisk("pp", cur.postPrandialGlucose)} />
              <MetricChip label="Random" value={cur.randomGlucose} unit={gUnits} risk={diabetesRisk("random", cur.randomGlucose)} />
              <MetricChip label="HbA1c" value={cur.hba1c} unit={a1cUnits} risk={diabetesRisk("a1c", cur.hba1c)} />
              <MetricChip label="eAG" value={eAG} unit="mg/dL" risk={Number.isFinite(eAG) ? (eAG < 154 ? "normal" : eAG < 183 ? "prediabetes" : "diabetes") : "unknown"} />
            </div>
          </Section>

          <Section title="Risk Summary" rightBadge={<RiskBadge mode={statusClass} />}>
            <div className={`ra-risk ${statusClass}`}>
              <div className="ra-risk__icon" aria-hidden>
                {statusClass === "danger" ? "🚨" : statusClass === "warning" ? "⚠️" : "🛡️"}
              </div>
              <div className="ra-risk__text">{diabetesRiskMessage(cur)}</div>
            </div>
          </Section>

          <Section title="Comparison with Previous Report">
            <div className="ra-compare">
              <ul className="ra-list">
                {[
                  { label: "Fasting", curr: cur.fastingGlucose, prev: prev?.fastingGlucose },
                  { label: "2-hr/PP", curr: cur.postPrandialGlucose, prev: prev?.postPrandialGlucose ?? prev?.ogtt2h },
                  { label: "Random", curr: cur.randomGlucose, prev: prev?.randomGlucose },
                  { label: "HbA1c", curr: cur.hba1c, prev: prev?.hba1c, isPct: true },
                ].map(({ label, curr, prev, isPct }, idx) => (
                  <li key={idx}>
                    {prev == null ? `🆕 First ${label} reading: ${showNum(curr)} ${isPct ? "%" : gUnits}` :
                     curr > prev ? `⬆️ ${label} increased by ${showNum(curr - prev)} ${isPct ? "%" : gUnits}` :
                     curr < prev ? `⬇️ ${label} decreased by ${showNum(prev - curr)} ${isPct ? "%" : gUnits}` :
                                   `➖ No change in ${label}`}
                  </li>
                ))}
              </ul>

              <div className="ra-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Previous" fill="#d0d0d0" />
                    <Bar dataKey="Current" fill="#4e8cff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {compareErr && <p className="ra-error">Compare error: {compareErr}</p>}
          </Section>

          <Section title="Value Breakdown & Meaning">
            <ul className="ra-list">
              {Number.isFinite(cur.fastingGlucose) && <li><strong>Fasting ({cur.fastingGlucose} {gUnits})</strong> — Morning value after 8–12h fast; reflects baseline control.</li>}
              {Number.isFinite(cur.postPrandialGlucose) && <li><strong>2-hr / PP ({cur.postPrandialGlucose} {gUnits})</strong> — Post-meal response; high values suggest post-meal hyperglycemia.</li>}
              {Number.isFinite(cur.randomGlucose) && <li><strong>Random ({cur.randomGlucose} {gUnits})</strong> — Snapshot at any time; ≥200 mg/dL with symptoms suggests diabetes.</li>}
              {Number.isFinite(cur.hba1c) && <li><strong>HbA1c ({cur.hba1c} {a1cUnits})</strong> — 3-month average; ≥6.5% suggests diabetes.</li>}
              {Number.isFinite(eAG) && <li><strong>eAG ({eAG} mg/dL)</strong> — Estimated average glucose derived from HbA1c.</li>}
            </ul>
          </Section>
        </div>
      </div>

      {/* full-width ranges card below the two-column layout */}
      <RangesSection items={DIAB_RANGES} />
    </>
  );
}


/* -------------------------------- UI atoms -------------------------------- */
function Badge({ label, value, color = "#334155", mono = false }) {
  return (
    <div className="ra-badge">
      <div className="ra-badge__label">{label}</div>
      <div className="ra-badge__value" style={{ color, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}
function Card({ icon, title, children }) {
  return (
    <div className="ra-card">
      <div className="ra-section-head">
        <div className="ra-section-title">
          <span className="ra-dot">{icon}</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="ra-card-body">{children}</div>
    </div>
  );
}
function Section({ title, children, badge, rightBadge }) {
  return (
    <div className="ra-card">
      <div className="ra-section-head ra-justify">
        <div className="ra-section-title">
          <span className="ra-dot">📄</span>
          <h3>{title}</h3>
        </div>
        <div className="ra-rightbits">
          {rightBadge || null}
          {badge && <span className="ra-time">{badge}</span>}
        </div>
      </div>
      <div className="ra-card-body">{children}</div>
    </div>
  );
}
function MetricChip({ label, value, unit, risk }) {
  const tone =
    ["optimal", "desirable", "normal", "protective", "good"].includes(risk) ? "good" :
    ["near-optimal", "acceptable", "borderline", "prediabetes", "elevated", "moderate"].includes(risk) ? "mid" :
    !risk || risk === "unknown" ? "neutral" : "bad";
  return (
    <div className="ra-metric">
      <div className="ra-metric__title">{label}</div>
      <div className="ra-metric__inner">
        <div className={`ra-badge-pill ${tone}`}>{(risk || "").replace("-", " ") || "—"}</div>
        <div className="ra-metric__value">
          <span className="n">{showNum(value)}</span>
          {Number.isFinite(value) && unit && <span className="u">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
function RiskBadge({ mode }) {
  return (
    <div className={`ra-risk-badge ${mode}`}>
      <span>{mode === "danger" ? "✖" : mode === "warning" ? "⚠" : "✔"}</span>
    </div>
  );
}
function HorizontalRanges({ items }) {
  return (
    <div className="ranges-row">
      {items.map((range, i) => (
        <div className="range-card" key={i}>
          <div className="range-type">{range.type}</div>
          <div className="range-tags">
            {Object.entries(range).map(([k, v]) => {
              if (k === "type") return null;
              const tone = /optimal|protective|desirable|normal/i.test(k)
                ? "good"
                : /near|acceptable|borderline|elevated|prediabetes/i.test(k)
                ? "mid"
                : "bad";
              return (
                <span className={`range-tag ${tone}`} key={k}>
                  <b>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</b> {v}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RangesSection({ items, title = "Reference Ranges" }) {
  return (
    <div className="ra-card ra-ranges-outside">
      <div className="ra-section-head">
        <div className="ra-section-title">
          <span className="ra-dot">📋</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="ra-card-body ra-card-body--flat">
        <HorizontalRanges items={items} />
      </div>
    </div>
  );
}

