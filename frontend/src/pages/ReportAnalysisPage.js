// src/pages/ReportAnalysisPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

/* ---------- normalize whatever is in report.analysis into bucket shape ---------- */
function normalizeAnalysis(analysis, extracted = {}) {
  const a = analysis || {};
  const ex = extracted || {};

  // If already bucket-shaped, make sure all buckets exist
  const alreadyBuckets =
    a &&
    typeof a === "object" &&
    ("ldl" in a || "hdl" in a || "triglycerides" in a || "totalCholesterol" in a);

  if (alreadyBuckets) {
    return {
      ldl: a.ldl || { value: ex.ldl ?? null, category: "unknown", reference: "" },
      hdl: a.hdl || { value: ex.hdl ?? null, category: "unknown", reference: "" },
      triglycerides: a.triglycerides || { value: ex.triglycerides ?? null, category: "unknown", reference: "" },
      totalCholesterol:
        a.totalCholesterol || { value: ex.totalCholesterol ?? null, category: "unknown", reference: "" },
      notes: a.notes || "",
      nextSteps: Array.isArray(a.nextSteps) ? a.nextSteps : [],
    };
  }

  // Legacy “status” shape -> convert to buckets
  const toCategory = (s = "") => {
    const t = String(s).toLowerCase();
    if (!t || t.includes("unknown")) return "unknown";
    if (
      t.includes("optimal") ||
      t.includes("protective") ||
      t.includes("desirable") ||
      t.includes("normal") ||
      t.includes("good")
    )
      return "good";
    if (t.includes("near") || t.includes("borderline")) return "moderate";
    if (t.includes("high")) return "bad";
    return "unknown";
  };

  const REFS = {
    ldl: "LDL (mg/dL): optimal <100 · near-opt 100–129 · borderline 130–159 · high 160–189 · very high ≥190",
    hdl: "HDL (mg/dL): low <40 · acceptable 40–59 · protective ≥60",
    tg: "Triglycerides (mg/dL): normal <150 · borderline 150–199 · high 200–499 · very high ≥500",
    total: "Total (mg/dL): desirable <200 · borderline 200–239 · high ≥240",
  };

  return {
    ldl: { value: ex.ldl ?? null, category: toCategory(a.ldlStatus), reference: REFS.ldl },
    hdl: { value: ex.hdl ?? null, category: toCategory(a.hdlStatus), reference: REFS.hdl },
    triglycerides: { value: ex.triglycerides ?? null, category: toCategory(a.triglycerideStatus), reference: REFS.tg },
    totalCholesterol: {
      value: ex.totalCholesterol ?? null,
      category: toCategory(a.totalCholesterolStatus),
      reference: REFS.total,
    },
    notes: a.summary || "",
    nextSteps: Array.isArray(a.tips) ? a.tips : [],
  };
}

export default function ReportAnalysisPage() {
  const { id } = useParams(); // Mongo _id of LabReport
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");

  // Optional AI coach (from /advice)
  const [coach, setCoach] = useState({ loading: false, error: "", data: null });

  const fetchReport = async () => {
    setErr("");
    try {
      const url = `${API_BASE}/reports/${encodeURIComponent(id)}`;
      console.log("Fetch report:", url);
      const r = await fetch(url);
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Failed to load report");
      setReport(data.report);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // OPTIONAL: fetch advice once the report is analyzed (ignore if 404 not mounted)
  const fetchAdvice = async (reportId) => {
    setCoach({ loading: true, error: "", data: null });
    try {
      const url = `${API_BASE}/reports/${encodeURIComponent(reportId)}/advice`;
      console.log("Fetch advice:", url);
      const r = await fetch(url);
      if (r.status === 404) {
        // route not mounted; just skip silently
        setCoach({ loading: false, error: "", data: null });
        return;
      }
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Advice failed");
      setCoach({ loading: false, error: "", data: data.advice });
    } catch (e) {
      setCoach({ loading: false, error: e.message, data: null });
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (report?._id && report?.isAnalyzed) {
      fetchAdvice(report._id);
    } else {
      setCoach({ loading: false, error: "", data: null });
    }
  }, [report?._id, report?.isAnalyzed]);

  const runAnalyze = async () => {
    setErr("");
    try {
      const url = `${API_BASE}/analyze`;
      console.log("Run analyze:", url, "payload:", { key: id });
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: id }),
      });

      // If already analyzed, backend may return 409 — treat as success and just refresh
      if (r.status === 409) {
        await fetchReport();
        return;
      }

      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.message || "Analyze failed");
      await fetchReport(); // refresh
    } catch (e) {
      setErr(e.message);
    }
  };

  const ex = report?.extracted || {};
  const ana = useMemo(() => normalizeAnalysis(report?.analysis, ex), [report, ex]);

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", fontFamily: "system-ui" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <h1>Report Analysis</h1>

      {loading && <p>Loading…</p>}
      {err && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          Error: {err}
        </div>
      )}

      {!loading && report && (
        <>
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Badge label="Report ID" value={report._id} mono />
              <Badge label="Type" value={report.reportType} />
              <Badge
                label="Uploaded"
                value={report.uploadDate ? new Date(report.uploadDate).toLocaleString() : "—"}
              />
              <Badge
                label="Analyzed"
                value={report.isAnalyzed ? "Yes" : "No"}
                color={report.isAnalyzed ? "#16a34a" : "#ea580c"}
              />
            </div>

            {!report.isAnalyzed && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={runAnalyze}
                  style={{
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Analyze Now
                </button>
                <p style={{ color: "#64748b", marginTop: 6 }}>
                  We’ll extract values from the original file and save the summary.
                </p>
              </div>
            )}
          </div>

          {/* Extracted metrics */}
          {report.isAnalyzed && (
            <>
              <section
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 16,
                  background: "#fff",
                  marginBottom: 16,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Extracted Values</h3>
                <Grid3>
                  <Metric title="Total Cholesterol" value={ex.totalCholesterol} unit={ex.units || "mg/dL"} />
                  <Metric title="LDL" value={ex.ldl} unit={ex.units || "mg/dL"} />
                  <Metric title="HDL" value={ex.hdl} unit={ex.units || "mg/dL"} />
                  <Metric title="Triglycerides" value={ex.triglycerides} unit={ex.units || "mg/dL"} />
                  <Metric title="Test Date" value={ex.testDate || "—"} />
                  <Metric title="Lab" value={ex.labName || "—"} />
                </Grid3>
                {ex.notes ? (
                  <p style={{ marginTop: 12, color: "#475569" }}>{ex.notes}</p>
                ) : null}
              </section>

              {/* AI analysis summary (normalized) */}
              <section
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <h3 style={{ marginTop: 0 }}>AI Summary</h3>
                <Grid2>
                  <Bucket title="LDL" obj={ana.ldl} />
                  <Bucket title="HDL" obj={ana.hdl} />
                  <Bucket title="Triglycerides" obj={ana.triglycerides} />
                  <Bucket title="Total Cholesterol" obj={ana.totalCholesterol} />
                </Grid2>
                {ana.notes && (
                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ marginBottom: 6 }}>Notes</h4>
                    <p style={{ margin: 0, color: "#475569" }}>{ana.notes}</p>
                  </div>
                )}
                {Array.isArray(ana.nextSteps) && ana.nextSteps.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ marginBottom: 6 }}>Next steps (not medical advice)</h4>
                    <ul style={{ margin: 0, color: "#475569" }}>
                      {ana.nextSteps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* OPTIONAL: AI Coach (from /advice endpoint) */}
              {coach.loading && <p style={{ color: "#64748b" }}>Generating guidance…</p>}
              {coach.error && <p style={{ color: "crimson" }}>Advice Error: {coach.error}</p>}
              {coach.data && (
                <section
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                    marginTop: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background: "#eef2ff",
                      }}
                    >
                      🧠
                    </span>
                    <h3 style={{ margin: 0 }}>AI Coach</h3>
                  </div>

                  {coach.data.healthStatus && (
                    <div style={{ marginBottom: 12, background: "#f8fafc", borderRadius: 10, padding: 12 }}>
                      <strong>Health Status</strong>
                      <p style={{ margin: "6px 0 0", color: "#475569" }}>{coach.data.healthStatus}</p>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    }}
                  >
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span>🧩</span>
                        <strong>Possible Reasons</strong>
                      </div>
                      {Array.isArray(coach.data.reasons) && coach.data.reasons.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, color: "#475569" }}>
                          {coach.data.reasons.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, color: "#94a3b8" }}>—</p>
                      )}
                    </div>

                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span>🍎</span>
                        <strong>Recommendations</strong>
                      </div>
                      {Array.isArray(coach.data.recommendations) && coach.data.recommendations.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, color: "#475569" }}>
                          {coach.data.recommendations.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, color: "#94a3b8" }}>—</p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span>📊</span>
                      <strong>Value Breakdown & Meaning</strong>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#475569" }}>
                      {report?.extracted?.ldl != null && (
                        <li>
                          <strong>
                            LDL ({report.extracted.ldl} {report.extracted.units || "mg/dL"})
                          </strong>{" "}
                          — {coach.data?.breakdown?.ldl || "—"}
                        </li>
                      )}
                      {report?.extracted?.hdl != null && (
                        <li>
                          <strong>
                            HDL ({report.extracted.hdl} {report.extracted.units || "mg/dL"})
                          </strong>{" "}
                          — {coach.data?.breakdown?.hdl || "—"}
                        </li>
                      )}
                      {report?.extracted?.triglycerides != null && (
                        <li>
                          <strong>
                            Triglycerides ({report.extracted.triglycerides} {report.extracted.units || "mg/dL"})
                          </strong>{" "}
                          — {coach.data?.breakdown?.triglycerides || "—"}
                        </li>
                      )}
                      {report?.extracted?.totalCholesterol != null && (
                        <li>
                          <strong>
                            Total Cholesterol ({report.extracted.totalCholesterol}{" "}
                            {report.extracted.units || "mg/dL"})
                          </strong>{" "}
                          — {coach.data?.breakdown?.totalCholesterol || "—"}
                        </li>
                      )}
                    </ul>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Badge({ label, value, color = "#334155", mono = false }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "6px 10px",
        background: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          color,
          fontWeight: 700,
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function Grid3({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      {children}
    </div>
  );
}

function Grid2({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      }}
    >
      {children}
    </div>
  );
}

function Metric({ title, value, unit }) {
  const show = value !== null && value !== undefined && value !== "";
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>
        {show ? value : "—"}{" "}
        {show && unit ? <span style={{ fontSize: 12, color: "#475569" }}>{unit}</span> : null}
      </div>
    </div>
  );
}

function Bucket({ title, obj }) {
  const safe = obj || {};
  const value = safe.value ?? null;
  const category = safe.category ?? "unknown";
  const ref = safe.reference || "";
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>
        {value ?? "—"} <span style={{ fontSize: 12, color: "#475569" }}>({category})</span>
      </div>
      {ref && <div style={{ fontSize: 12, color: "#475569" }}>{ref}</div>}
    </div>
  );
}
