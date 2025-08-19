// src/pages/CholesterolDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./CholesterolDashboard.css";

/* ================== API helpers ================== */
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, raw: text };
  }
}

/* ================== local helpers ================== */
function getRiskLevelColor(label, value) {
  if (value == null || Number.isNaN(Number(value))) return "moderate";
  const v = Number(value);
  if (label === "ldl") {
    if (v < 100) return "low";
    if (v < 160) return "moderate";
    return "high";
  }
  if (label === "hdl") {
    if (v >= 60) return "low";
    if (v >= 40) return "moderate";
    return "high";
  }
  if (label === "triglycerides") {
    if (v < 150) return "low";
    if (v < 200) return "moderate";
    return "high";
  }
  return "moderate";
}

function getRiskMessage(values = {}) {
  const { ldl, hdl, triglycerides } = values;
  const l = Number(ldl);
  const h = Number(hdl);
  const t = Number(triglycerides);

  const ldlOk = !Number.isNaN(l) && l < 130;
  const hdlOk = !Number.isNaN(h) && h >= 40;
  const triOk = !Number.isNaN(t) && t < 150;

  if (ldlOk && hdlOk && triOk) return "All cholesterol values are within healthy range.";
  if (!ldlOk && triOk) return "LDL is elevated; consider lifestyle changes.";
  if (!hdlOk) return "HDL is low; improving physical activity may help.";
  return "Some values need attention; consider lifestyle changes.";
}

function pickLatestAndPrevious(rows = []) {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(b.completedAt || b.uploadDate || 0) -
      new Date(a.completedAt || a.uploadDate || 0)
  );
  return { latest: sorted[0] || null, previous: sorted[1] || null };
}

/* ================== Component ================== */
export default function CholesterolDashboard() {
  const { id: routeId } = useParams(); // /cholesterol/:id (optional)
  const location = useLocation();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const userId =
    user?.userId || user?._id || user?.mongoId || user?.id || user?.patientId;

  /* -------- fetch one report by id and its advice -------- */
  const loadReportById = async (rid) => {
    const r = await fetch(`${API_BASE}/reports/${encodeURIComponent(rid)}`);
    const j = await safeJson(r);
    if (j?.ok && j.report) setReport(j.report);
  };

  const loadAdviceById = async (rid) => {
    try {
      const r = await fetch(
        `${API_BASE}/reports/${encodeURIComponent(rid)}/advice`
      );
      if (!r.ok) return;
      const j = await safeJson(r);
      if (j?.ok && j.advice) setAdvice(j.advice);
    } catch {}
  };

  /* -------- fetch latest report for a user (dashboard mode) -------- */
  const loadLatestForUser = async (uid) => {
    const r = await fetch(
      `${API_BASE}/users/${encodeURIComponent(
        uid
      )}/reports?testType=Cholesterol`
    );
    const j = await safeJson(r);
    const list = j?.items || j || [];
    const { latest, previous } = pickLatestAndPrevious(list);
    if (latest) {
      setReport(latest);
      setPrevious(previous || null);
      await loadAdviceById(latest._id);
    }
  };

  /* -------- if route has :id, try to analyze (handles 409) then load -------- */
  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        if (routeId) {
          // Analyze or confirm analyzed
          const res = await fetch(`${API_BASE}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: routeId }),
          });

          if (res.status === 409) {
            const j = await safeJson(res);
            const rid = j?.reportId || routeId;
            await loadReportById(rid);
            await loadAdviceById(rid);
          } else {
            const j = await safeJson(res);
            const rid = j?.reportId || routeId;
            await loadReportById(rid);
            await loadAdviceById(rid);
          }
        } else {
          // Dashboard mode: show latest analyzed for the logged-in user
          if (!userId) throw new Error("No userId in localStorage 'user'");
          await loadLatestForUser(userId);

          // Also set previous for comparison (already done inside loadLatestForUser)
          // But ensure we have it if report is pre-loaded
          if (!previous && report?.patientId) {
            const r = await fetch(
              `${API_BASE}/reports?patientId=${report.patientId}&type=Cholesterol`
            );
            const list = await safeJson(r);
            if (Array.isArray(list)) {
              const older = list
                .filter((x) => x.isAnalyzed && x._id !== report._id)
                .sort(
                  (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
                );
              if (older[0]) setPrevious(older[0]);
            }
          }
        }
      } catch (e) {
        // Fallback: try to load directly if :id is present
        if (routeId) {
          await loadReportById(routeId);
          await loadAdviceById(routeId);
        }
        console.error("CholesterolDashboard init error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, userId]);

  if (loading) return <div className="dashboard-container">Loading…</div>;
  if (!report)
    return (
      <div className="dashboard-container">
        No cholesterol report found.
      </div>
    );

  const latest = report;
  const ex = latest.extracted || {};
  const latestValues = {
    ldl: ex.ldl ?? null,
    hdl: ex.hdl ?? null,
    triglycerides: ex.triglycerides ?? null,
  };
  const prevValues = previous?.extracted || {};
  const chartData = previous
    ? [
        { name: "LDL", Previous: prevValues.ldl, Current: latestValues.ldl },
        { name: "HDL", Previous: prevValues.hdl, Current: latestValues.hdl },
        {
          name: "Triglycerides",
          Previous: prevValues.triglycerides,
          Current: latestValues.triglycerides,
        },
      ]
    : [];

  return (
    <div className="dashboard-container">
      <div className="dashboard-split">
        {/* LEFT */}
        <div className="dashboard-left">
          <img src="/heart.png" alt="Heart" className="heart-image" />

          <div className="dashboard-section">
            <div className="section-header">
              <span className="dot">❤️</span>
              <h3>Health Status</h3>
            </div>
            <div
              className="advice-box"
              dangerouslySetInnerHTML={{
                __html: `<p>${
                  advice?.healthStatus || getRiskMessage(latestValues)
                }</p>`,
              }}
            />
          </div>

          <div className="dashboard-section">
            <div className="section-header">
              <span className="dot">🧠</span>
              <h3>Possible Reasons</h3>
            </div>
            <div className="advice-box">
              {Array.isArray(advice?.reasons) && advice.reasons.length > 0 ? (
                <ul>
                  {advice.reasons.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p>No reasons available.</p>
              )}
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-header">
              <span className="dot">🍎</span>
              <h3>Recommendations</h3>
            </div>
            <div className="advice-box">
              {Array.isArray(advice?.recommendations) &&
              advice.recommendations.length > 0 ? (
                <ul>
                  {advice.recommendations.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="dashboard-right">
          <div className="dashboard-section full-width">
            <div className="section-header">
              <span className="dot">📄</span>
              <h3>Latest Report</h3>
              <span className="timestamp">
                {formatDistanceToNow(
                  new Date(latest.completedAt || latest.uploadDate || Date.now())
                )}{" "}
                ago
              </span>
            </div>

            <div className="metric-grid">
              {[
                { label: "LDL", value: latestValues.ldl, key: "ldl" },
                { label: "HDL", value: latestValues.hdl, key: "hdl" },
                {
                  label: "Triglycerides",
                  value: latestValues.triglycerides,
                  key: "triglycerides",
                },
              ].map((item) => {
                const status = getRiskLevelColor(item.key, item.value);
                return (
                  <div key={item.key} className="metric-box">
                    <div className="metric-title">{item.label}</div>
                    <div className="metric-inner">
                      <div className={`metric-badge ${status}`}>
                        {status[0].toUpperCase() + status.slice(1)}
                      </div>
                      <div className="metric-value-group">
                        <span className="metric-value">
                          {item.value ?? "—"}
                        </span>
                        <span className="metric-unit">mg/dL</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-row">
            <div className="dashboard-section half-width">
              <div className="section-header risk-summary-header">
                <div className="left-group">
                  <span className="dot">🛡️</span>
                  <h3>Risk Summary</h3>
                </div>
                <div
                  className={`risk-icon ${
                    getRiskMessage(latestValues)
                      .toLowerCase()
                      .includes("healthy")
                      ? "status-safe"
                      : getRiskMessage(latestValues)
                          .toLowerCase()
                          .includes("moderate")
                      ? "status-warning"
                      : "status-danger"
                  }`}
                >
                  <svg viewBox="0 0 512 512">
                    <circle cx="256" cy="256" r="100" fill="white" />
                  </svg>
                </div>
              </div>
              <div className="risk-message-box">
                {getRiskMessage(latestValues)}
              </div>
            </div>

            <div className="dashboard-section half-width">
              <div className="section-header">
                <span className="dot">🔁</span>
                <h3>Comparison with Previous Report</h3>
              </div>

              <div
                className="advice-box"
                style={{ display: "flex", gap: 20, alignItems: "center" }}
              >
                <ul style={{ flex: 1, margin: 0, paddingLeft: 20 }}>
                  {previous ? (
                    [
                      { label: "LDL", curr: latestValues.ldl, prev: prevValues.ldl },
                      { label: "HDL", curr: latestValues.hdl, prev: prevValues.hdl },
                      {
                        label: "Triglycerides",
                        curr: latestValues.triglycerides,
                        prev: prevValues.triglycerides,
                      },
                    ].map(({ label, curr, prev }, i) => (
                      <li key={i}>
                        {prev == null
                          ? null
                          : curr > prev
                          ? `⬆️ Your ${label} increased by ${curr - prev} mg/dL.`
                          : curr < prev
                          ? `⬇️ Your ${label} decreased by ${prev - curr} mg/dL.`
                          : `➖ No change in ${label}.`}
                      </li>
                    ))
                  ) : (
                    <li>No previous report to compare.</li>
                  )}
                </ul>

                <div style={{ flex: 1, minWidth: 220, height: 160 }}>
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
            </div>
          </div>

          <div className="dashboard-section full-width">
            <div className="section-header">
              <span className="dot">📊</span>
              <h3>Value Breakdown & Meaning</h3>
            </div>
            <div className="advice-box">
              <ul>
                <li>
                  <strong>LDL ({latestValues.ldl ?? "—"} mg/dL)</strong> —{" "}
                  {advice?.breakdown?.ldl || "—"}
                </li>
                <li>
                  <strong>HDL ({latestValues.hdl ?? "—"} mg/dL)</strong> —{" "}
                  {advice?.breakdown?.hdl || "—"}
                </li>
                <li>
                  <strong>
                    Triglycerides ({latestValues.triglycerides ?? "—"} mg/dL)
                  </strong>{" "}
                  — {advice?.breakdown?.triglycerides || "—"}
                </li>
              </ul>
            </div>
          </div>

          <div className="dashboard-footer">
            <button onClick={() => navigate(-1)}>← Back</button>
            {latest?._id && (
              <button
                onClick={() => navigate(`/reports/${latest._id}/analysis`)}
              >
                🔎 View Full Analysis
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
