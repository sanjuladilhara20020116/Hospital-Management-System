import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
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
import "../styles/CholesterolTrendPage.css";

// Register Chart.js bits once
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

/* ---------------- helpers ---------------- */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short" }) : "—";
const cap = (v, hi) => (Number.isFinite(v) ? Math.min(v, hi) : null);
const nz = (v) => Number.isFinite(v);

/** If backend doesn't send a peer/clinic series, draw a “reference” line. */
const REF_TARGETS = {
  totalCholesterol: 200,
  triglycerides: 150,
  hdl: 50,
  ldl: 100,
};
const makeFlatRef = (len, key) => Array.from({ length: len }, () => REF_TARGETS[key]);

/** Optional: if your backend later returns `clinicAvg` alongside `series`, we’ll use it. */
function pickPeerSeries(apiData, key, fallbackLen) {
  const peer = apiData?.clinicAvg?.map((r) => Number(r[key]));
  if (Array.isArray(peer) && peer.some(nz)) return peer;
  return makeFlatRef(fallbackLen, key);
}

/** convert db rows -> chart labels & series arrays */
function toChartData(series, key, hardCap) {
  const labels = series.map((s) => fmtDate(s.date));
  const patient = series.map((s) => cap(Number(s[key]), hardCap));
  return { labels, patient };
}

/* ---------------- page ---------------- */
export default function CholesterolTrendPage() {
  const { patientId = "" } = useParams();
  const location = useLocation();
  const displayName = location.state?.displayName || "";
  const pidDisplay = location.state?.pidDisplay || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ series: [] });
  const printRef = useRef(null);

  // fetch series
  useEffect(() => {
    const id = (patientId || "").trim();
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      setErr("Invalid patient id.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const r = await fetch(
          `${API_BASE}/reports/patients/${encodeURIComponent(
            id
          )}/series?type=Cholesterol`
        );
        const j = await r.json();
        if (!r.ok || !j?.ok)
          throw new Error(j?.message || "Failed to load time series");
        // expected: { ok:true, type:'Cholesterol', series:[{date, totalCholesterol, ldl, hdl, triglycerides}] }
        setData(j);
      } catch (e) {
        setErr(e.message || "Failed to load time series");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  const S = Array.isArray(data.series) ? data.series : [];

  // build chart packs (labels + both lines)
  const packs = useMemo(() => {
    const total = toChartData(S, "totalCholesterol", 500);
    const tg = toChartData(S, "triglycerides", 600);
    const hdl = toChartData(S, "hdl", 150);
    const ldl = toChartData(S, "ldl", 300);

    const peerTotal = pickPeerSeries(data, "totalCholesterol", S.length);
    const peerTg = pickPeerSeries(data, "triglycerides", S.length);
    const peerHdl = pickPeerSeries(data, "hdl", S.length);
    const peerLdl = pickPeerSeries(data, "ldl", S.length);

    return {
      total: {
        labels: total.labels,
        patient: total.patient,
        peer: peerTotal,
        title: "Total Cholesterol",
      },
      tg: {
        labels: tg.labels,
        patient: tg.patient,
        peer: peerTg,
        title: "Triglycerides",
      },
      hdl: {
        labels: hdl.labels,
        patient: hdl.patient,
        peer: peerHdl,
        title: "HDL",
      },
      ldl: {
        labels: ldl.labels,
        patient: ldl.patient,
        peer: peerLdl,
        title: "LDL",
      },
    };
  }, [S, data]);

  const ChartCard = ({ pack }) => {
    const { labels, patient, peer, title } = pack;

    const chartData = {
      labels,
      datasets: [
        {
          label: "you",
          data: patient,
          borderColor: "#1D70F7",
          backgroundColor: "transparent",
          pointRadius: 3,
          borderWidth: 3,
          tension: 0.35,
        },
        {
          label: "heart-patient trend",
          data: peer,
          borderColor: "#EF4444",
          backgroundColor: "transparent",
          pointRadius: 3,
          borderWidth: 3,
          tension: 0.35,
        },
      ],
    };

    return (
      <div className="trend-card">
        <div className="trend-card-head">
          <span className="droplet">💧</span>
          <h3>{title}</h3>
        </div>
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: { mode: "index", intersect: false },
            },
            interaction: { mode: "index", intersect: false },
            scales: {
              x: {
                grid: { color: "rgba(16,76,151,.08)" },
                ticks: { color: "#1351A8", font: { weight: 700 } },
              },
              y: {
                beginAtZero: false,
                grid: { color: "rgba(16,76,151,.08)" },
                ticks: { color: "#1351A8", font: { weight: 700 } },
              },
            },
          }}
        />
      </div>
    );
  };

  const onDownload = () => {
    // simplest approach: let the browser print dialog export to PDF
    window.print();
  };

  return (
    <div className="trend-wrap" ref={printRef}>
      {/* HERO */}
      <div className="trend-hero">
        <div className="hero-left">
          <div className="hero-title">Cholesterol Trend</div>

          {/* ID block */}
          <div className="hero-id">
            <div className="row">
              <span className="k">Name</span>
              <span className="v">
                : {displayName && displayName.trim().length ? displayName : "—"}
              </span>
            </div>

            <div className="row">
              <span className="k">PID</span>
              <span className="v">
                : {pidDisplay
                  ? pidDisplay
                  : patientId
                  ? `${patientId.slice(0, 8)}…`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <img
            src="/trend-hero.svg"
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>

      {loading && <p className="loading">Loading…</p>}
      {err && <div className="error">Error: {err}</div>}

      {!loading && !err && (
        <>
          {/* GRID 2x2 */}
          <div className="trend-grid">
            <ChartCard pack={packs.total} />
            <ChartCard pack={packs.tg} />
            <ChartCard pack={packs.hdl} />
            <ChartCard pack={packs.ldl} />
          </div>

          {/* LEGEND / EXPLANATION + CTA (mock-accurate) */}
<div className="legend-row">
  <div className="legend-art">
    <img
      src="/reasons.png"
      alt=""
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  </div>

  <div className="legend-note legend-note--mock">
    <div className="legend-lead">
  <span className="dot blue"></span>
  <span className="lead-strong">Shows you trend</span>
  <span className="gap" />
  <span className="dot red"></span>
  <span className="lead-strong">Shows heart patient Trends</span>
  <span className="lead-light">
    Use this view to track how your results change over time. The <b>blue line</b> is your results and the <b>red line</b> is a heart-healthy reference. Look for steady declines, plateaus, or spikes after changes in diet, exercise, illness, or medications, and discuss any patterns with your clinician.
  </span>
</div>


    
  </div>

  <button className="cta big" onClick={onDownload}>
    Download Trend
  </button>
</div>

{/* Back button pinned left like the mock */}
<div className="footer-actions">
  <Link to={-1} className="btn-back">Back</Link>
</div>

        </>
      )}
    </div>
  );
}
