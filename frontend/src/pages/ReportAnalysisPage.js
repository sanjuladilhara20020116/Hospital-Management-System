// ReportAnalysisPage.jsx — Pixel-matched "Report Overview" with numeric deltas & AI coach
import "./ReportAnalysisPage.css";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

const API_BASE = "http://localhost:5000/api";

/* -------------------------- tiny shared utilities -------------------------- */
const timeAgo = (d, nowTs = Date.now()) => {
  const t = new Date(d).getTime();
  const diff = Math.max(0, nowTs - t);
  if (diff < 60 * 1000) return "just now";
  if (diff < 60 * 60 * 1000) {
    const m = Math.floor(diff / 60000);
    return `${m} min${m !== 1 ? "s" : ""} ago`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const h = Math.floor(diff / 3600000);
    return `${h} hour${h !== 1 ? "s" : ""} ago`;
  }
  const dys = Math.floor(diff / 86400000);
  return dys === 1 ? "1 day ago" : `${dys} days ago`;
};
const showNum = (n) => (Number.isFinite(n) ? n : "—");

// pretty delta like "↑ 24 mg/dL" / "↓ 12 mg/dL" / "no change"
const deltaText = (curr, prev, unit) => {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return "—";
  const d = Math.round((curr - prev) * 10) / 10; // 1 decimal
  if (d === 0) return "no change";
  return `${d > 0 ? "↑" : "↓"} ${Math.abs(d)} ${unit}`;
};

/* ----------------------------- Cholesterol logic ----------------------------- */
// put this near the top, replacing your current calcCholDerived
const calcCholDerived = (ex = {}) => {
  const ldl  = Number.isFinite(ex?.ldl)           ? Number(ex.ldl)           : null;
  const hdl  = Number.isFinite(ex?.hdl)           ? Number(ex.hdl)           : null;
  const tg   = Number.isFinite(ex?.triglycerides) ? Number(ex.triglycerides) : null;

  // Prefer extracted VLDL if present; else fall back to TG/5
  const vldl = Number.isFinite(ex?.vldl)
    ? Number(ex.vldl)
    : (Number.isFinite(tg) ? Math.round(tg / 5) : null);

  // Prefer extracted total if present; else fall back to LDL + HDL + VLDL
  const totalCholesterol = Number.isFinite(ex?.totalCholesterol)
    ? Number(ex.totalCholesterol)
    : ([ldl, hdl, vldl].every(Number.isFinite) ? ldl + hdl + vldl : null);

  return { ldl, hdl, triglycerides: tg, vldl, totalCholesterol };
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

/* ------------------------------ Normalizers ------------------------------ */
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
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");

  // preview & coach
  const [mini, setMini] = useState(null);
  const [miniErr, setMiniErr] = useState("");
  const [miniLoading, setMiniLoading] = useState(false);
  const [coach, setCoach] = useState({ loading: false, error: "", data: null });

  // compare
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
    setMiniErr(""); setMini(null); setMiniLoading(true);
    try {
      const r = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/diabetes/preview`, { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Preview failed");
      setMini(data.parsed || null);
    } catch (e) {
      setMiniErr(e.message); setMini(null);
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

  function normalizeAdvice(raw = {}) {
  const a = raw || {};
  return {
    healthStatus: a.healthStatus || a.summary || "",
    reasons: a.reasons || a.possibleReasons || a.causes || [],
    recommendations: a.recommendations || a.recs || a.suggestions || a.nextSteps || [],
    breakdown: a.breakdown || {},
  };
}


  useEffect(() => { fetchReport(); }, [id]);

  useEffect(() => {
    const t = (report?.reportType || "").toLowerCase();
    if (report?._id && !report?.isAnalyzed && (t === "diabetes" || t === "diabetic")) {
      fetchMiniPreview(report._id);
    } else {
      setMini(null); setMiniErr(""); setMiniLoading(false);
    }
  }, [report?._id, report?.isAnalyzed, report?.reportType]);

  // ✅ ALWAYS fetch AI advice once a report is loaded (no analyze gate)
  useEffect(() => {
    if (report?._id) fetchAdvice(report._id);
  }, [report?._id]);

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
        setCompare(null); setCompareErr(e.message);
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
    <div className="mock-wrap mock-match">

      <div className="topbar">
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
        {!loading && report && !report.isAnalyzed && (
          <div className="actions">
            <button className="cta" onClick={runAnalyze}>Analyze & Save</button>
            {isDia && <button className="cta ghost" onClick={() => fetchMiniPreview(report._id)}>Refresh Preview</button>}
          </div>
        )}
      </div>

      {loading && <p className="loading">Loading…</p>}
      {err && <div className="error">Error: {err}</div>}

      {!loading && report && (
        <>
          {isChol && (
            <CholesterolView
              report={report} ex={ex} ana={ana}
              compare={compare} compareErr={compareErr}
              coach={coach} nowTs={nowTs}
              navigate={navigate}
            />
          )}

          {isDia && (
            <DiabetesView
              report={report} ex={ex} ana={ana}
              compare={compare} compareErr={compareErr}
              mini={mini} miniErr={miniErr} miniLoading={miniLoading}
              coach={coach} nowTs={nowTs}
            />
          )}

          {!isChol && !isDia && (
            <div className="card">
              <p>Unsupported report type. Raw analysis:</p>
              <pre className="pre">{JSON.stringify(report?.analysis || {}, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================= Cholesterol View ============================ */
function CholesterolView({ report, ex, ana, compare, compareErr, coach, nowTs, navigate }) {
  const latest = calcCholDerived(ex || {});
const prev   = compare?.previousExtracted ? calcCholDerived(compare.previousExtracted) : null;

  const units = ex?.units || "mg/dL";

  const patientIdForTrends =
    (report?.patientId && typeof report.patientId === "object"
      ? report.patientId._id
      : report?.patientId) || null;

  const chartData = prev ? [
    { name: "Total Cho", Previous: prev.totalCholesterol, Current: latest.totalCholesterol },
    { name: "HDL",       Previous: prev.hdl,              Current: latest.hdl },
    { name: "LDL",       Previous: prev.ldl,              Current: latest.ldl },
    { name: "VLDL",      Previous: prev.vldl,             Current: latest.vldl },
    { name: "Triglycerides", Previous: prev.triglycerides, Current: latest.triglycerides },
  ] : [];

  const riskMsg = cholRiskMessage(latest).toLowerCase();
  const statusClass = riskMsg.includes("excellent") ? "safe" : riskMsg.includes("good") ? "warning" : "danger";

  // Prefer backend-friendly meta; fall back to populated/legacy shapes
const patientName =
  report?._patient?.name
  || (report?.patientId && typeof report.patientId === "object"
        ? `${report.patientId.firstName || ""} ${report.patientId.lastName || ""}`.trim() || report.patientId.userId
        : "")
  || "—";

const pid =
  report?._patient?.id
  || (report?.patientId && typeof report.patientId === "object"
        ? (report.patientId.userId || report.patientId._id)
        : report?.patientId)
  || "—";

  const uploaded = report?.uploadDate ? new Date(report.uploadDate).toLocaleDateString() : "—";

  function KPI({ label, value, unit, ring = "green", status }) {
    const tone =
      ["optimal","desirable","normal","protective","good"].includes(status) ? "good" :
      ["near-optimal","acceptable","borderline","prediabetes","elevated"].includes(status) ? "mid" :
      !status || status === "unknown" ? "neutral" : "bad";
    const pretty = (String(status || "").replace("-", " ") || "—").replace(/\b\w/g, m => m.toUpperCase());
    return (
      <div className="kpi kpi--row">
        <div className={`ring ${ring}`}><span className={`glyph ${ring}`} aria-hidden>💧</span></div>
        <div className="kpi-main">
          <div className="kpi-top"><span className="n">{showNum(value)}</span>{Number.isFinite(value) && <span className="u">{unit}</span>}</div>
          <div className={`pill ${tone}`}>{pretty}</div>
        </div>
        <div className="kpi-label kpi-label--big">{label}</div>
      </div>
    );
  }

  // chart y domain + ticks
  function buildYAxisTicks(values = [], step = 20, min = 0) {
    const max = Math.max(...values.filter(Number.isFinite), 0);
    const top = Math.ceil(max / step) * step || step;
    const ticks = [];
    for (let t = min; t <= top; t += step) ticks.push(t);
    return { domain: [min, top], ticks };
  }
  const yValues = prev ? [
    latest.totalCholesterol, latest.hdl, latest.ldl, latest.vldl, latest.triglycerides,
    prev.totalCholesterol,   prev.hdl,   prev.ldl,   prev.vldl,   prev.triglycerides,
  ] : [
    latest.totalCholesterol, latest.hdl, latest.ldl, latest.vldl, latest.triglycerides,
  ];
  const { domain: yDomain, ticks: yTicks } = buildYAxisTicks(yValues, 20, 0);

  // CholesterolView — put these 2 lines right above the `return (...)`
const reasonsList =
  (coach?.data?.reasons?.length ? coach.data.reasons : null) ||
  (Array.isArray(ana?.reasons) && ana.reasons.length ? ana.reasons : null) ||
  null;

const recsList =
  (coach?.data?.recommendations?.length ? coach.data.recommendations : null) ||
  (Array.isArray(ana?.nextSteps) && ana.nextSteps.length ? ana.nextSteps : null) ||
  null;


  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-title">Cholesterol Report Overview</div>
          <div className="hero-id">
            <div className="id-row"><span className="k">Name</span><span className="v">: {patientName}</span></div>
            <div className="id-row"><span className="k">PID</span><span className="v">: {pid || "—"}</span></div>
            <div className="id-row"><span className="k">Ref NO</span><span className="v">: {report?.referenceNo || "—"}</span></div>
            <div className="id-row"><span className="k">Uploaded date</span><span className="v">: {uploaded}</span></div>
          </div>
        </div>
        <div className="hero-right">
          <img src="/chol-hero.svg" alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
        </div>
      </div>

      {/* Latest */}
      <div className="latest-card">
        <div className="latest-head">
          <h2 className="latest-title">Latest Report</h2>
          <div className="latest-right">
            <span className="latest-time">{report?.uploadDate ? timeAgo(report.uploadDate, nowTs) : "—"}</span>
            <span className="latest-sparkle" aria-hidden>✦</span>
          </div>
        </div>
        <div className="kpi-row kpi-row--latest">
          <KPI label="Total Cholesterol" value={latest.totalCholesterol} unit={units} ring="green"  status={cholRisk("total", latest.totalCholesterol)} />
          <KPI label="LDL"               value={latest.ldl}              unit={units} ring="blue"   status={cholRisk("ldl", latest.ldl)} />
          <KPI label="HDL"               value={latest.hdl}              unit={units} ring="red"    status={cholRisk("hdl", latest.hdl)} />
          <KPI label="VLDL"              value={latest.vldl}             unit={units} ring="orange" status={cholRisk("vldl", latest.vldl)} />
          <KPI label="Triglycerides"     value={latest.triglycerides}    unit={units} ring="cyan"   status={cholRisk("triglycerides", latest.triglycerides)} />
        </div>
      </div>

      {/* Risk + Health + Compare */}
      <div className="triple">
        <div className="card">
          <div className="card-head"><div className="head-icon warn">⚠️</div><h3 className="head-title">Risk Summary</h3></div>
          <div className={`risk-chip ${statusClass}`}>
            {statusClass === "safe" ? "Excellent profile" : statusClass === "warning" ? "Good levels with room to improve" : "Needs attention"}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="head-icon heart">❤️</div><h3 className="head-title">Health Status</h3></div>
          <div className="info-pane">{coach?.data?.healthStatus || ana?.notes || "Cholesterol levels are generally within acceptable ranges, but triglycerides are elevated."}</div>
        </div>

        <div className="card card-compare" style={{ "--compare-h": "210px" }}>
          <div className="card-head">
            <div className="head-icon mag">🔍</div>
            <h3 className="head-title">Comparison with Previous Report</h3>
            <div className="legend-right">
              <span><i className="cur"></i> current</span>
              <span><i className="prev"></i> previous</span>
            </div>
          </div>

          <div className="compare-grid">
            <div className="mini-chart" aria-label="Comparison chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: 0 }} barCategoryGap={14} barGap={4}>
                  <CartesianGrid stroke="#E5EEF9" vertical={false} />
                  <XAxis dataKey="name" interval={0} axisLine={false} tickLine={false}
                         tick={{ fontSize: 11, fill: "#244E86", fontWeight: 700 }} />
                  <YAxis domain={yDomain} ticks={yTicks} allowDecimals={false} axisLine={false} tickLine={false}
                         width={30} tick={{ fontSize: 11, fill: "#244E86", fontWeight: 700 }} />
                  <Tooltip />
                  <Bar dataKey="Current"  fill="#1976D2" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Previous" fill="#BFD8FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bullet-pane">
              <ul>
                {[
                  { label: "Total Cholesterol", curr: latest.totalCholesterol, prev: prev?.totalCholesterol },
                  { label: "LDL",               curr: latest.ldl,              prev: prev?.ldl },
                  { label: "HDL",               curr: latest.hdl,              prev: prev?.hdl },
                  { label: "VLDL",              curr: latest.vldl,             prev: prev?.vldl },
                  { label: "Triglycerides",     curr: latest.triglycerides,    prev: prev?.triglycerides },
                ].map(({ label, curr, prev }, i) => (
                  <li key={i}>
                    {prev == null
                      ? `🆕 First ${label} reading: ${showNum(curr)} ${units}`
                      : `${label}: ${showNum(curr)} ${units} (${deltaText(curr, prev, units)} from ${showNum(prev)} ${units})`}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {compareErr && <p className="error tiny">Compare error: {compareErr}</p>}
        </div>
      </div>

      {/* Reasons & Recs (AI-backed with fallback) */}
      {/* Reasons & Recs (AI-backed with fallback) */}
<div className="double">
  <div className="card">
    <div className="card-head">
      <div className="head-icon brain">🧠</div>
      <h3 className="head-title">Possible Reasons</h3>
    </div>
    <div className="split-art">
      <img
        src="/reasons.png"
        alt=""
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <div className="blue-panel">
        {coach.loading && <p className="ra-muted">Generating…</p>}
        {coach.error && <p className="ra-error">Advice error: {coach.error}</p>}

        {reasonsList ? (
          <ul>
            {reasonsList.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        ) : (
          <p className="ra-muted">—</p>
        )}
      </div>
    </div>
  </div>

  <div className="card">
    <div className="card-head">
      <div className="head-icon apple">🍎</div>
      <h3 className="head-title">Recommendations</h3>
    </div>
    <div className="split-art">
      <img
        src="/recs.png"
        alt=""
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <div className="blue-panel">
        {coach.loading && <p className="ra-muted">Generating…</p>}
        {coach.error && <p className="ra-error">Advice error: {coach.error}</p>}

        {recsList ? (
          <ul>
            {recsList.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        ) : (
          <p className="ra-muted">—</p>
        )}
      </div>
    </div>
  </div>
</div>


      {/* CTA */}
      <div className="cta-row">
        <button
  className="cta big"
  onClick={()=>{
    if (!patientIdForTrends) { alert("No patient id on this report."); return; }

    const patientName =
      (report?.patientId && typeof report.patientId === "object")
        ? `${report.patientId.firstName || ""} ${report.patientId.lastName || ""}`.trim() || report.patientId.userId
        : report?.patientId || "—";

    const pidDisplay =
      (report?.patientId && typeof report.patientId === "object")
        ? (report.patientId.userId || report.patientId._id)
        : report?.patientId;

    navigate(`/cholesterol-trends/${patientIdForTrends}`, {
      state: { displayName: patientName, pidDisplay }
    });
  }}
>
  See full&nbsp;analysis
</button>

      </div>
    </>
  );
}

/* =============================== Diabetes View ============================ */
function DiabetesView({ report, ex, ana, compare, compareErr, mini, miniErr, miniLoading, coach, nowTs }) {
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

  const riskMsg = diabetesRiskMessage(cur).toLowerCase();
  const statusClass =
    riskMsg.includes("diabetic") || riskMsg.includes("consult") ? "danger"
    : riskMsg.includes("prediabetes") || riskMsg.includes("risk") ? "warning"
    : "safe";

    // Prefer backend-friendly meta; fallback to populated/legacy shapes
const patientNameDia =
  report?._patient?.name
  || (report?.patientId && typeof report.patientId === "object"
        ? `${report.patientId.firstName || ""} ${report.patientId.lastName || ""}`.trim()
        : (report?.patientId?.userId || ""))
  || "—";

const pidDia =
  report?._patient?.id
  || (report?.patientId && typeof report.patientId === "object"
        ? (report.patientId.userId || report.patientId._id)
        : report?.patientId)
  || "—";


  return (
    <>
      <div className="hero green">
        <div className="hero-left">
          <div className="hero-title">Diabetes Report Overview</div>
          <div className="hero-id">
           <div className="id-row"><span className="k">Name</span><span className="v">: {patientNameDia}</span></div>
           <div className="id-row"><span className="k">PID</span><span className="v">: {pidDia}</span></div>
            <div className="id-row"><span className="k">Ref NO</span><span className="v">: {report?.referenceNo || "—"}</span></div>
            <div className="id-row"><span className="k">Uploaded date</span><span className="v">: {report?.uploadDate ? new Date(report.uploadDate).toLocaleDateString() : "—"}</span></div>
          </div>
        </div>
        <div className="hero-right">
          <img src="/img/mock/diab-hero.png" alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
        </div>
      </div>

      {!report.isAnalyzed && (
        <div className="notice">
          {miniLoading ? "Extracting preview…" : miniErr ? `Preview Error: ${miniErr}` : "Preview mode — click Analyze & Save to persist."}
        </div>
      )}

      {/* Latest (Diabetes) — same shell as Cholesterol */}
<div className="latest-card">
  <div className="latest-head">
    <h2 className="latest-title">Latest Report</h2>
    <div className="latest-right">
      <span className="latest-time">{report?.uploadDate ? timeAgo(report.uploadDate, nowTs) : ""}</span>
      <span className="latest-sparkle" aria-hidden>✦</span>
    </div>
  </div>

  {/* identical 5-up grid spacing */}
  <div className="kpi-row kpi-row--latest">
    <KpiTile label="Fasting (FPG)" value={cur.fastingGlucose} unit={gUnits} ringTone="green"  status={diabetesRisk("fasting", cur.fastingGlucose)} />
    <KpiTile label="2-hr / PP"    value={cur.postPrandialGlucose} unit={gUnits} ringTone="blue"   status={diabetesRisk("pp", cur.postPrandialGlucose)} />
    <KpiTile label="Random"        value={cur.randomGlucose} unit={gUnits} ringTone="red"    status={diabetesRisk("random", cur.randomGlucose)} />
    <KpiTile label="HbA1c"         value={cur.hba1c} unit={a1cUnits} ringTone="orange" status={diabetesRisk("a1c", cur.hba1c)} />
    <KpiTile label="eAG"           value={eAG} unit="mg/dL" ringTone="cyan" status={Number.isFinite(eAG) ? (eAG < 154 ? "normal" : eAG < 183 ? "prediabetes" : "diabetes") : "unknown"} />
  </div>
</div>


      <div className="triple">
        <div className="card">
  <div className="card-head">
    <div className="head-icon warn">⚠️</div>
    <h3 className="head-title">Risk Summary</h3>
  </div>

  {/* unified banner: title + explanatory text inside one surface */}
  <div className={`risk-banner ${statusClass}`}>
    <div className="risk-banner__title">
      {statusClass === "safe" ? "Normal levels"
        : statusClass === "warning" ? "Prediabetes risk"
        : "Needs attention"}
    </div>
    <div className="risk-banner__msg">
      {diabetesRiskMessage(cur)}
    </div>
  </div>
</div>


        <div className="card card-compare" style={{ "--compare-h": "210px" }}>
  <div className="card-head">
    <div className="head-icon mag">🔍</div>
    <h3 className="head-title">Comparison with Previous Report</h3>
    <div className="legend-right">
      <span><i className="cur"></i> current</span>
      <span><i className="prev"></i> previous</span>
    </div>
  </div>

  {/* mirror cholesterol: chart left, bullets right, equal height */}
  <div className="compare-grid">
    <div className="mini-chart" aria-label="Comparison chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={prev ? [
          { name: "Fasting",   Previous: prev.fastingGlucose,                      Current: cur.fastingGlucose },
          { name: "2-hr / PP", Previous: prev.postPrandialGlucose ?? prev?.ogtt2h, Current: cur.postPrandialGlucose },
          { name: "Random",    Previous: prev.randomGlucose,                       Current: cur.randomGlucose },
          { name: "HbA1c",     Previous: prev.hba1c,                                Current: cur.hba1c },
        ] : []}>
          <CartesianGrid stroke="#E5EEF9" vertical={false} />
          <XAxis dataKey="name" interval={0} axisLine={false} tickLine={false}
                 tick={{ fontSize: 11, fill: "#244E86", fontWeight: 700 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false}
                 width={30} tick={{ fontSize: 11, fill: "#244E86", fontWeight: 700 }} />
          <Tooltip />
          <Bar dataKey="Current"  fill="#1976D2" radius={[6,6,0,0]} />
          <Bar dataKey="Previous" fill="#BFD8FF" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="bullet-pane">
      <ul>
        {[
          { label: "Fasting",   curr: cur.fastingGlucose,      prev: prev?.fastingGlucose,      unit: gUnits },
          { label: "2-hr / PP", curr: cur.postPrandialGlucose, prev: prev?.postPrandialGlucose ?? prev?.ogtt2h, unit: gUnits },
          { label: "Random",    curr: cur.randomGlucose,       prev: prev?.randomGlucose,       unit: gUnits },
          { label: "HbA1c",     curr: cur.hba1c,               prev: prev?.hba1c,               unit: a1cUnits },
        ].map(({label,curr,prev,unit},i)=>(
          <li key={i}>
            {prev == null
              ? `🆕 First ${label} reading: ${showNum(curr)} ${unit}`
              : `${label}: ${showNum(curr)} ${unit} (${deltaText(curr, prev, unit)} from ${showNum(prev)} ${unit})`}
          </li>
        ))}
      </ul>
    </div>
  </div>

  {compareErr && <p className="error tiny">Compare error: {compareErr}</p>}
</div>

      </div>

      {/* reasons + recs */}
      <div className="double">
        <div className="card">
          <div className="card-head"><div className="head-icon brain">🧠</div><h3 className="head-title">Possible Reasons</h3></div>
          <div className="split-art">
            <img src="/diab-reasons.png" alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
            <div className="blue-panel">
              <ul>
                {Array.isArray(coach?.data?.reasons) && coach.data.reasons.length
                  ? coach.data.reasons.map((r,i)=><li key={i}>{r}</li>)
                  : <li>—</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="head-icon apple">🍎</div><h3 className="head-title">Recommendations</h3></div>
          <div className="split-art">
            <img src="/diab-recs.png" alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
            <div className="blue-panel">
              <ul>
                {Array.isArray(coach?.data?.recommendations) && coach.data.recommendations.length
                  ? coach.data.recommendations.map((r,i)=><li key={i}>{r}</li>)
                  : <li>—</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------- UI atoms -------------------------------- */
function KpiTile({ label, value, unit, status, ringTone = "blue" }) {
  const tone =
    ["optimal","desirable","normal","protective","good"].includes(status) ? "good"
    : ["near-optimal","acceptable","borderline","prediabetes","elevated","moderate"].includes(status) ? "mid"
    : !status || status === "unknown" ? "neutral" : "bad";

  return (
    <div className="kpi">
      <div className={`drop-wrap ${ringTone}`}><div className="drop">&#128167;</div></div>
      <div className="kpi-val"><span className="n">{showNum(value)}</span>{Number.isFinite(value) && unit && <span className="u">{unit}</span>}</div>
      <div className={`chip ${tone}`}>{(status || "").replace("-", " ") || "—"}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
