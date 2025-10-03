import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import "../styles/CholesterolTrendPage.css";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

const API_BASE = "http://localhost:5000/api";

/* ---------------- helpers ---------------- */
const fmtMonth = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short" }) : "—");
const cap = (v, hi) => (Number.isFinite(v) ? Math.min(v, hi) : null);
const isNum = (v) => Number.isFinite(v);

const REF_TARGETS = { totalCholesterol: 200, triglycerides: 150, hdl: 50, ldl: 100 };
const makeFlatRef = (len, key) => Array.from({ length: len }, () => REF_TARGETS[key]);

function toChartData(series, key, hardCap) {
  const labels = series.map((s) => fmtMonth(s.date));
  const patient = series.map((s) => cap(Number(s[key]), hardCap));
  return { labels, patient };
}

function pickPeerSeries(apiData, key, fallbackLen) {
  const peer = apiData?.clinicAvg?.map((r) => Number(r[key]));
  if (Array.isArray(peer) && peer.some(isNum)) return peer;
  return makeFlatRef(fallbackLen, key);
}

/** Read any public file (e.g. /img/...) as a dataURL – avoids CORS headaches */
async function loadImageAsDataURL(path) {
  const res = await fetch(path);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

/** Hard circular mask → transparent PNG */
// Fits the entire logo inside the circle (no cropping), with small padding.
/**
 * Circular PNG with conservative "contain" fit.
 * - padding: extra inner rim so nothing touches the circle
 * - safetyScale: scales the whole logo down a bit even after contain-fit
 * - offsetX/offsetY: sub-pixel nudge to visually center marks with text tails
 */
async function makeCircularPng(src, outPx = 256, padding = 16, safetyScale = 0.90, offsetX = 0, offsetY = 1.5) {
  const img = await new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = src;
  });

  const size = outPx;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  // circular clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // white base to guarantee clean edge against the PDF badge
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // contain-fit WITH padding
  const target = size - padding * 2;
  const sx = target / img.naturalWidth;
  const sy = target / img.naturalHeight;
  const scale = Math.min(sx, sy) * safetyScale;

  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;

  // center + fine adjustment (offsetY positive moves image DOWN; negative = up)
  const dx = (size - dw) / 2 + offsetX;
  const dy = (size - dh) / 2 + offsetY;

  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  return c.toDataURL("image/png");
}



/* ---------------- page ---------------- */
export default function CholesterolTrendPage() {
  const { patientId = "" } = useParams();
  const { state } = useLocation() || {};
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ series: [] });

  const [pName, setPName] = useState(state?.displayName || "");
  const [pPid, setPPid]   = useState(state?.pidDisplay   || "");
  // add this next to pName / pPid
const [patientInfo, setPatientInfo] = useState(null);

  const totalRef = useRef(null);
  const tgRef    = useRef(null);
  const hdlRef   = useRef(null);
  const ldlRef   = useRef(null);

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

        // 1) trend series
        const r = await fetch(`${API_BASE}/reports/patients/${encodeURIComponent(id)}/series?type=Cholesterol`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.message || "Failed to load time series");
        setData(j);

        // 2) patient mini — ALWAYS fetch to populate age/gender/contact/email for the PDF
       try {
         const rp = await fetch(`${API_BASE}/patients/${encodeURIComponent(id)}/mini`);
         const jp = await rp.json();
         if (rp.ok && jp?.ok && jp.patient) {
           // don’t override name/pid if already coming from router state
           if (!state?.displayName) setPName(jp.patient.name || pName);
           if (!state?.pidDisplay)  setPPid(jp.patient.pid  || pPid);
           setPatientInfo(jp.patient);
         }
       } catch { /* non-fatal */ }
        
      } catch (e) {
        setErr(e.message || "Failed to load time series");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const S = Array.isArray(data.series) ? data.series : [];

  const packs = useMemo(() => {
    const total = toChartData(S, "totalCholesterol", 500);
    const tg    = toChartData(S, "triglycerides",    600);
    const hdl   = toChartData(S, "hdl",              150);
    const ldl   = toChartData(S, "ldl",              300);

    const peerTotal = pickPeerSeries(data, "totalCholesterol", S.length);
    const peerTg    = pickPeerSeries(data, "triglycerides",    S.length);
    const peerHdl   = pickPeerSeries(data, "hdl",              S.length);
    const peerLdl   = pickPeerSeries(data, "ldl",              S.length);

    return {
      total: { labels: total.labels, patient: total.patient, peer: peerTotal, title: "Total Cholesterol", ref: totalRef },
      tg:    { labels: tg.labels,    patient: tg.patient,    peer: peerTg,    title: "Triglycerides",     ref: tgRef },
      hdl:   { labels: hdl.labels,   patient: hdl.patient,   peer: peerHdl,   title: "HDL",               ref: hdlRef },
      ldl:   { labels: ldl.labels,   patient: ldl.patient,   peer: peerLdl,   title: "LDL",               ref: ldlRef },
    };
  }, [S, data]);

  const ChartCard = ({ pack }) => {
    const { labels, patient, peer, title, ref } = pack;
    const chartData = {
      labels,
      datasets: [
        { label: "You", data: patient, borderColor: "#1D70F7", backgroundColor: "transparent", pointRadius: 3, borderWidth: 3, tension: 0.35 },
        { label: "Heart-patient trend", data: peer, borderColor: "#EF4444", backgroundColor: "transparent", pointRadius: 3, borderWidth: 3, tension: 0.35 },
      ],
    };
    return (
      <div className="trend-card">
        <div className="trend-card-head">
          <span className="droplet">💧</span><h3>{title}</h3>
        </div>
        <Line
          ref={ref}
          data={chartData}
          options={{
            responsive: true,
            plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
            interaction: { mode: "index", intersect: false },
            scales: {
              x: { grid: { color: "rgba(16,76,151,.08)" }, ticks: { color: "#1351A8", font: { weight: 700 } } },
              y: { grid: { color: "rgba(16,76,151,.08)" }, ticks: { color: "#1351A8", font: { weight: 700 } } },
            },
          }}
        />
      </div>
    );
  };

  /** PDF: fix logo mask + enforce spacing under “Trends” */
  /** Build the PDF with (1) circular-contained logo and (2) tuned Trends spacing */
const downloadPdf = async () => {
  // ---- local helpers (self-contained) ----
  const loadImageAsDataURL = async (path) => {
    const res = await fetch(path);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  };

  /**
   * Circular PNG with conservative "contain" fit.
   * padding: inner rim so nothing touches the edge
   * safetyScale: shrink a bit after contain-fit to avoid micro-clipping
   * offsetX/offsetY: tiny nudge to visually center (handles descenders)
   */
  const makeCircularPng = async (
    src,
    outPx = 256,
    padding = 16,
    safetyScale = 0.92,
    offsetX = 0,
    offsetY = 1.0
  ) => {
    const img = await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = src;
    });

    const size = outPx;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    // circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // white base to guarantee clean edges inside the circle
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // CONTAIN fit + padding + safety scale (no cropping)
    const target = size - padding * 2;
    const sx = target / img.naturalWidth;
    const sy = target / img.naturalHeight;
    const scale = Math.min(sx, sy) * safetyScale;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (size - dw) / 2 + offsetX;
    const dy = (size - dh) / 2 + offsetY;

    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    return c.toDataURL("image/png");
  };

  // ---- start PDF ----
  const pdf = new jsPDF("p", "pt", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Header bar
  const headerY = 24;
  const headerH = 120;
  pdf.setFillColor(25,118,210);
  pdf.rect(24, headerY, pageW - 48, headerH, "F");

  // Badge + logo (circle)
  const cx = 24 + 36 + 16;
  const cy = headerY + headerH / 2;
  const r  = 40;

  // badge: one outer stroke only (no inner hairline → no halo)
  pdf.setFillColor(255,255,255);
  pdf.circle(cx, cy, r, "F");
  pdf.setDrawColor(230,240,255);
  pdf.setLineWidth(2);
  pdf.circle(cx, cy, r, "S");

  // load → make circular (contain) → draw
  try {
    // use your path; you had /medicore.png in your project
    const raw = await loadImageAsDataURL("/medicore.png");
    const circularLogo = await makeCircularPng(raw, 256, 16, 0.92, 0, 1.0);

    // draw slightly inset so it sits under the badge stroke (no seam)
    const side = r * 2 - 10; // tweak to -9 if you see a seam on your renderer
    pdf.addImage(circularLogo, "PNG", cx - side / 2, cy - side / 2, side, side, undefined, "FAST");
  } catch {
    // fail-soft: leave badge without logo
  }

  // Title + date
  pdf.setTextColor("#ffffff");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(32);
  pdf.text("Cholesterol Trend", cx + r + 20, headerY + 52);

  pdf.setFontSize(13);
  pdf.text(`Date : ${new Date().toLocaleDateString()}`, cx + r + 20, headerY + 80);

  // Clinic info (right)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const headerRightX = pageW - 24 - 18;
  const baseY  = headerY + headerH - 16;
  const lineGap = 16;
  pdf.text("E-mail: medicore@gmail.com", headerRightX, baseY - lineGap*2, { align: "right" });
  pdf.text("Contact: +94-64356865",      headerRightX, baseY - lineGap*1, { align: "right" });
  pdf.text("No : 144, Wadduwa. Panadura",headerRightX, baseY - lineGap*0, { align: "right" });

  // Patient Info box
  // --- Patient Information box (bigger to fit more rows) ---
const pi = patientInfo || {};
const firstNonEmpty = (arr) =>
  (arr || []).find(v => v !== undefined && v !== null && String(v).trim() !== "") || "";

const age    = firstNonEmpty([pi.age, pi.Age, pi.dobAge]); // add any aliases you use
const gender = firstNonEmpty([pi.gender, pi.sex]);
const phone  = firstNonEmpty([pi.phone, pi.contact, pi.mobile, pi.tel, pi.phoneNumber]);
const email  = firstNonEmpty([pi.email, pi.mail, pi.emailAddress]);


const boxY = headerY + headerH + 20;
const boxH = 132; // was 96; taller to fit 6 rows

pdf.setFillColor(234,242,255);
pdf.roundedRect(24, boxY, pageW - 48, boxH, 10, 10, "F");
pdf.setTextColor("#0F4AA6");
pdf.setFont("helvetica", "bold");
pdf.setFontSize(16);
pdf.text("Patient Information", 42, boxY + 24);

const line = (label, value, x, y) => {
  pdf.setFont("helvetica", "bold"); pdf.setTextColor("#111"); pdf.setFontSize(12);
  pdf.text(`${label} :`, x, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(value || "—"), x + 70, y);
};

const leftX     = 42;
const colRightX = pageW / 2 + 10;
const rowY      = boxY + 48;

// Left column
line("Name",       (typeof pName === "string" ? pName : "—"), leftX, rowY);
line("Patient ID", (pPid || `${patientId.slice(0,8)}…`),      leftX, rowY + 20);
line("E-mail",     email,                                     leftX, rowY + 40);

// Right column
line("Age",        age,                                       colRightX, rowY);
line("Gender",     gender,                                    colRightX, rowY + 20);
line("Contact",    phone,                                     colRightX, rowY + 40);

// ---- Trends title + legend start a bit lower because the box is taller
let y = boxY + boxH + 32;
pdf.setFont("helvetica", "bold");
pdf.setFontSize(16);
pdf.setTextColor("#0F4AA6");
pdf.text("Trends", 42, y);


  const legendX = pageW - 24 - 240;
  const dot = (x,y, color) => { const [r,g,b] = color; pdf.setFillColor(r,g,b); pdf.rect(x,y-8, 10,10, "F"); };
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11); pdf.setTextColor("#222");
  dot(legendX, y, [29,112,247]);    pdf.text("Your trend", legendX + 16, y);
  dot(legendX+110, y, [239,68,68]); pdf.text("Heart-patient trend", legendX + 126, y);

  // Balanced spacing under “Trends” (no collision)
  y += 36;
  const imgYOffset = 24;

  // Charts (from canvas refs)
  const imgTotal = totalRef.current?.toBase64Image?.() || null;
  const imgTg    = tgRef.current?.toBase64Image?.()    || null;
  const imgHdl   = hdlRef.current?.toBase64Image?.()   || null;
  const imgLdl   = ldlRef.current?.toBase64Image?.()   || null;

  const cardW = (pageW - 48 - 24) / 2;
  const cardH = 184;
  const gutter = 12;
  const x1 = 36, x2 = 36 + cardW + gutter;

  // Row 1
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor("#1351A8");
  pdf.text("Total Cholesterol", x1, y + 16);
  pdf.text("Triglycerides",     x2, y + 16);
  if (imgTotal) pdf.addImage(imgTotal, "PNG", x1, y + imgYOffset, cardW, cardH, undefined, "FAST");
  if (imgTg)    pdf.addImage(imgTg,    "PNG", x2, y + imgYOffset, cardW, cardH, undefined, "FAST");

  // Row 2
  y += cardH + 36;
  pdf.text("HDL", x1, y + 16);
  pdf.text("LDL", x2, y + 16);
  if (imgHdl) pdf.addImage(imgHdl, "PNG", x1, y + imgYOffset, cardW, cardH, undefined, "FAST");
  if (imgLdl) pdf.addImage(imgLdl, "PNG", x2, y + imgYOffset, cardW, cardH, undefined, "FAST");

  // Footer
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor("#444");
  pdf.text(
    "This PDF summarizes your cholesterol trends alongside a clinic reference trend. It is not a diagnosis.",
    42, pageH - 32
  );

  pdf.save(`Cholesterol_Trend_${(pPid || patientId).toString().slice(0,8)}.pdf`);
};



  return (
    <div className="trend-wrap">
      {/* HERO */}
      <div className="trend-hero">
        <div className="hero-left">
          <div className="hero-title">Cholesterol Trend</div>
          <div className="hero-id">
            <div className="row"><span className="k">Name</span><span className="v">: {pName || "—"}</span></div>
            <div className="row"><span className="k">PID</span><span className="v">: {pPid || `${patientId.slice(0,8)}…`}</span></div>
          </div>
        </div>
        <div className="hero-right">
          <img src="/img/mock/trend-hero.png" alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
        </div>
      </div>

      {loading && <p className="loading">Loading…</p>}
      {err && <div className="error">Error: {err}</div>}

      {!loading && !err && (
        <>
          <div className="trend-grid">
            <ChartCard pack={packs.total} />
            <ChartCard pack={packs.tg} />
            <ChartCard pack={packs.hdl} />
            <ChartCard pack={packs.ldl} />
          </div>

          <div className="legend-row">
            <div className="legend-art">
              <img src="/reasons.png" alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
            </div>
            <div className="legend-note">
              <p>
                <span className="dot blue"></span> Shows <b>your trend</b>
                &nbsp;&nbsp;
                <span className="dot red"></span> Shows <b>heart-patient trend</b> (clinic reference/target)
              </p>
              <p className="muted">
                Use this panel to talk through progress month-to-month. Short spikes can come from diet, illness,
                or missed doses. The red line is a steady reference for comparison—not a diagnosis.
              </p>
            </div>
            <div className="cta-row">
              <button className="cta ghost" onClick={() => window.history.back()}>Back</button>
              <button className="cta big" onClick={downloadPdf}>Download Trend</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
