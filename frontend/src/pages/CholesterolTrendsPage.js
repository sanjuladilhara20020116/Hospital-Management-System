import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:5000/api";

/* -------------------- helpers -------------------- */
const takeLatest = (arr) => (arr.length ? arr[arr.length - 1] : null);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const isFiniteNum = (n) => Number.isFinite(n);

/** per-metric display ranges and outlier caps */
const METRIC_CFG = {
  ldl:   { label: "LDL",   min: 40,  max: 220, cap: 300 },
  hdl:   { label: "HDL",   min: 25,  max: 100, cap: 150 },
  triglycerides: { label: "Triglycerides", min: 50, max: 400, cap: 600 },
  totalCholesterol: { label: "Total Cholesterol", min: 120, max: 320, cap: 500 },
};

/** remove non-numeric and clamp wild OCR outliers */
function prepare(series, key, cap) {
  const pts = series
    .map((s) => ({ x: fmtDate(s.date), y: isFiniteNum(s[key]) ? s[key] : null }))
    .filter((p) => isFiniteNum(p.y));
  return pts.map((p) => ({ x: p.x, y: Math.min(p.y, cap) }));
}

/* Tiny metric header chip */
function Chip({ title, value, unit = "mg/dL" }) {
  const has = isFiniteNum(value);
  return (
    <div style={{
      padding: "10px 12px",
      borderRadius: 10,
      background: "#f8fafc",
      border: "1px solid #e5e7eb",
      minWidth: 150
    }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>
        {has ? `${value} ${unit}` : "—"}
      </div>
    </div>
  );
}

/* Reusable mini line chart */
function MiniLine({ title, points, yMin, yMax }) {
  const labels = points.map((p) => p.x);
  const data = points.map((p) => p.y);

  const chartData = useMemo(() => ({
    labels,
    datasets: [{
      label: title,
      data,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 3,
      fill: false,
    }],
  }), [labels, data, title]);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,.05)"
    }}>
      <Line
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: title },
            tooltip: { mode: "index", intersect: false },
          },
          scales: {
            x: { grid: { color: "rgba(148,163,184,0.15)" } },
            y: {
              min: yMin,
              max: yMax,
              grid: { color: "rgba(148,163,184,0.15)" },
              ticks: { stepSize: Math.round((yMax - yMin) / 4) }
            },
          },
          interaction: { intersect: false, mode: "index" },
        }}
      />
    </div>
  );
}

export default function CholesterolTrendsPage() {
  const params = useParams();
  const patientId = (params.patientId || params.pid || params.id || "").trim();

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    const isValid = /^[a-f0-9]{24}$/i.test(patientId);
    if (!isValid) {
      setErr("Invalid or missing patient id. Open this page from the analysis button so it includes a valid id.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await fetch(`${API_BASE}/reports/patients/${encodeURIComponent(patientId)}/series?type=Cholesterol`);
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to load time series");
        setSeries(Array.isArray(data.series) ? data.series : []);
      } catch (e) {
        setErr(e.message || "Failed to load time series");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  const latest = useMemo(() => takeLatest(series) || {}, [series]);

  // build cleaned points with caps
  const pts = useMemo(() => ({
    ldl: prepare(series, "ldl", METRIC_CFG.ldl.cap),
    hdl: prepare(series, "hdl", METRIC_CFG.hdl.cap),
    tg: prepare(series, "triglycerides", METRIC_CFG.triglycerides.cap),
    total: prepare(series, "totalCholesterol", METRIC_CFG.totalCholesterol.cap),
  }), [series]);

  return (
    <div style={{ maxWidth: 1080, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span role="img" aria-label="chart">📈</span> Cholesterol Trends
      </h1>

      {loading && <p>Loading…</p>}
      {err && (
        <div style={{
          background: "#fdecea",
          color: "#842029",
          border: "1px solid #f5c2c7",
          padding: "12px 16px",
          borderRadius: 8,
          marginTop: 12
        }}>
          Error: {err}
        </div>
      )}

      {!loading && !err && (
        <>
          {/* Latest summary chips */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0 20px" }}>
            <Chip title="Date" value={fmtDate(latest.date)} unit="" />
            <Chip title="LDL" value={latest.ldl} />
            <Chip title="HDL" value={latest.hdl} />
            <Chip title="Triglycerides" value={latest.triglycerides} />
            <Chip title="Total Cholesterol" value={latest.totalCholesterol} />
          </div>

          {/* 2 x 2 grid of mini charts */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}>
            <MiniLine
              title={METRIC_CFG.ldl.label}
              points={pts.ldl}
              yMin={METRIC_CFG.ldl.min}
              yMax={METRIC_CFG.ldl.max}
            />
            <MiniLine
              title={METRIC_CFG.hdl.label}
              points={pts.hdl}
              yMin={METRIC_CFG.hdl.min}
              yMax={METRIC_CFG.hdl.max}
            />
            <MiniLine
              title={METRIC_CFG.triglycerides.label}
              points={pts.tg}
              yMin={METRIC_CFG.triglycerides.min}
              yMax={METRIC_CFG.triglycerides.max}
            />
            <MiniLine
              title={METRIC_CFG.totalCholesterol.label}
              points={pts.total}
              yMin={METRIC_CFG.totalCholesterol.min}
              yMax={METRIC_CFG.totalCholesterol.max}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <Link to={-1}>← Back</Link>
          </div>
        </>
      )}
    </div>
  );
}
