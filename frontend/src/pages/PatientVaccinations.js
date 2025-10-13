// src/pages/PatientVaccinations.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Vaccination,
  openVaccinationPdfInNewTab,
  downloadVaccinationPdfBlob,
} from "../vaccinationApi";
import "./PatientVaccinations.css";

// Icons
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  LocalHospital as VaccineIcon,
  Info as InfoIcon,
  Event as EventIcon,
  Email as EmailIcon
} from "@mui/icons-material";

const BLUE = { main: "#2C69F0", mid: "#4D8DF7", light: "#C7D9FE" };

function toOrdinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString("en-LK", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(dt || "");
  }
}

export default function PatientVaccinations() {
  const navigate = useNavigate();
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dose, setDose] = useState("any");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [orderBy, setOrderBy] = useState("dateAdministered");
  const [order, setOrder] = useState("desc");

  async function load() {
    setLoading(true);
    setStatus("Loading vaccination records...");
    try {
      const data = await Vaccination.listMine();
      setRaw(Array.isArray(data) ? data : []);
      setStatus("");
    } catch (e) {
      console.error(e);
      setStatus("Failed to load vaccination records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Derived list
  const list = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    const fromTs = from ? new Date(from + "T00:00:00").getTime() : null;
    const toTs = to ? new Date(to + "T23:59:59").getTime() : null;

    let arr = [...raw];

    // Filter: search
    if (qNorm) {
      arr = arr.filter((r) => {
        const hay = [
          r.vaccineName,
          r.manufacturer,
          r.batchLotNo,
          r.notes,
          r.certificateNumber,
          r.route,
          r.site,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(qNorm);
      });
    }

    // Filter: status
    if (statusFilter !== "all") {
      arr = arr.filter((r) =>
        statusFilter === "voided" ? !!r.voided : !r.voided
      );
    }

    // Filter: dose
    if (dose !== "any") {
      const d = Number(dose);
      arr = arr.filter((r) => Number(r.doseNumber) === d);
    }

    // Filter: date range
    if (fromTs || toTs) {
      arr = arr.filter((r) => {
        const t = new Date(r.dateAdministered).getTime();
        if (fromTs && t < fromTs) return false;
        if (toTs && t > toTs) return false;
        return true;
      });
    }

    // Sort
    arr.sort((a, b) => {
      const dir = order === "asc" ? 1 : -1;
      let va, vb;
      if (orderBy === "dateAdministered") {
        va = new Date(a.dateAdministered).getTime();
        vb = new Date(b.dateAdministered).getTime();
      } else if (orderBy === "vaccineName") {
        va = (a.vaccineName || "").toLowerCase();
        vb = (b.vaccineName || "").toLowerCase();
      } else if (orderBy === "manufacturer") {
        va = (a.manufacturer || "").toLowerCase();
        vb = (b.manufacturer || "").toLowerCase();
      } else {
        va = a[orderBy];
        vb = b[orderBy];
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return arr;
  }, [raw, q, statusFilter, dose, from, to, order, orderBy]);

  function handleSort(key) {
    if (orderBy === key) {
      setOrder((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(key);
      setOrder("desc");
    }
  }

  async function handleDownload(id, certNo) {
    setStatus("Downloading certificate...");
    try {
      const blob = await downloadVaccinationPdfBlob(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (certNo ? `${certNo}.pdf` : `vaccination-${id}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus("Download completed");
      setTimeout(() => setStatus(""), 2000);
    } catch (e) {
      console.error(e);
      setStatus("Download failed");
    }
  }

  async function handleOpenPdf(id) {
    setStatus("Opening certificate...");
    try {
      await openVaccinationPdfInNewTab(id);
      setStatus("");
    } catch (e) {
      setStatus("Failed to open certificate");
    }
  }

  function clearFilters() {
    setQ("");
    setStatusFilter("all");
    setDose("any");
    setFrom("");
    setTo("");
  }

  const statusTone = useMemo(() => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes("failed")) return "error";
    if (s.includes("completed") || s.includes("success") || s.includes("loaded")) return "success";
    return "info";
  }, [status]);

  const empty = !loading && !status && list.length === 0;

  return (
    <div className="patient-vaccinations-page">
      {/* Background */}
      <div
        className="background-layer"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
        }}
      >
        <div 
          className="background-pattern"
          style={{
            position: "absolute",
            inset: 0,
            background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1>Patient Vaccination Portal</h1>
            <div className="subtitle">Patient Panel · View your vaccination history and certificates</div>
          </div>
        </div> 
      </div> 
            <button 
              className="btn-primary icon-btn"
              onClick={load}
              disabled={loading}
            >
              <RefreshIcon />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          
        
      

      {/* Status Toast Notification */}
      {status && (
        <div className={`status-toast ${statusTone || "info"}`}>
          <div className="toast-content">
            {loading ? <div className="spinner"></div> : null}
            <span>{status}</span>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className="filters-card card glass-card">
        <div 
          className="card-header"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="section-title">
            <FilterIcon />
            <span>Filter & Search Vaccinations</span>
          </div>
          <span className={`toggle-icon ${showFilters ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        
        {showFilters && (
          <div className="filters-content">
            <div className="search-box">
              <div className="form-control full-width">
                <label htmlFor="search">
                  <SearchIcon />
                  Search Vaccinations
                </label>
                <input
                  id="search"
                  placeholder="Search by vaccine name, manufacturer, batch number, notes..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="filter-grid">
              <div className="form-control">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  disabled={loading}
                >
                  <option value="all">All Status</option>
                  <option value="valid">Valid</option>
                  <option value="voided">Voided</option>
                </select>
              </div>

              <div className="form-control">
                <label htmlFor="dose">Dose Number</label>
                <select
                  id="dose"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  disabled={loading}
                >
                  <option value="any">Any Dose</option>
                  <option value="1">1st Dose</option>
                  <option value="2">2nd Dose</option>
                  <option value="3">3rd Dose</option>
                  <option value="4">4th Dose</option>
                </select>
              </div>

              <div className="form-control">
                <label htmlFor="from">
                  <CalendarIcon />
                  From Date
                </label>
                <input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-control">
                <label htmlFor="to">
                  <CalendarIcon />
                  To Date
                </label>
                <input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="filter-actions">
              <button 
                className="btn-outline" 
                onClick={clearFilters}
                disabled={loading}
              >
                Clear All Filters
              </button>
              <div className="results-count">
                {list.length} of {raw.length} records
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Records Card */}
      <div className="records-card card glass-card">
        <div className="card-header">
          <div className="section-title">
            <VaccineIcon />
            Vaccination History
          </div>
          <div className="results-count">
            {list.length} record{list.length !== 1 ? "s" : ""} found
          </div>
        </div>

        <div className="table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th 
                  className="sortable"
                  onClick={() => handleSort("dateAdministered")}
                >
                  <div className="th-content">
                    <EventIcon fontSize="small" />
                    Date Administered
                    {orderBy === "dateAdministered" && (
                      <span className="sort-indicator">
                        {order === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort("vaccineName")}
                >
                  <div className="th-content">
                    Vaccine
                    {orderBy === "vaccineName" && (
                      <span className="sort-indicator">
                        {order === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort("manufacturer")}
                >
                  Manufacturer
                  {orderBy === "manufacturer" && (
                    <span className="sort-indicator">
                      {order === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th>Dose</th>
                <th>Batch Number</th>
                <th>Route / Site</th>
                <th>Certificate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, idx) => {
                const isVoided = !!r.voided;
                return (
                  <tr key={r._id} className={idx % 2 ? "even-row" : "odd-row"}>
                    <td>
                      <div className="date-cell">
                        <div className="date">
                          {new Date(r.dateAdministered).toLocaleDateString()}
                        </div>
                        <div className="time">
                          {new Date(r.dateAdministered).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>

                    <td 
                      className="vaccine-cell clickable"
                      onClick={() => navigate(`/vaccinations/${r._id}`)}
                    >
                      <div className="vaccine-name">
                        <VaccineIcon fontSize="small" />
                        {r.vaccineName || "-"}
                      </div>
                      <div className="cert-number">
                        Cert: {r.certificateNumber || "—"}
                      </div>
                    </td>

                    <td>
                      <div className="manufacturer">
                        {r.manufacturer || "—"}
                      </div>
                    </td>

                    <td>
                      <span className="dose-badge">
                        {toOrdinal(Number(r.doseNumber || 0) || 0)} Dose
                      </span>
                    </td>

                    <td>
                      <div className="batch-number">
                        {r.batchLotNo || "—"}
                      </div>
                    </td>

                    <td>
                      <div className="route-site">
                        {[r.route, r.site].filter(Boolean).join(" / ") || "—"}
                      </div>
                    </td>

                    <td>
                      {r.certificatePdfFile ? (
                        <span className="status-badge available">
                          <PdfIcon fontSize="small" />
                          Available
                        </span>
                      ) : (
                        <span className="status-badge processing">
                          Not generated
                        </span>
                      )}
                    </td>

                    <td>
                      {isVoided ? (
                        <span className="status-badge voided">VOIDED</span>
                      ) : (
                        <span className="status-badge valid">Valid</span>
                      )}
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon primary" 
                          onClick={() => handleOpenPdf(r._id)}
                          disabled={!r.certificatePdfFile || isVoided}
                          title="Open certificate"
                        >
                          <ViewIcon />
                        </button>
                        <button 
                          className="btn-icon success" 
                          onClick={() => handleDownload(r._id, r.certificateNumber)}
                          disabled={!r.certificatePdfFile || isVoided}
                          title="Download PDF"
                        >
                          <DownloadIcon />
                        </button>
                        <button 
                          className="btn-text" 
                          onClick={() => navigate(`/vaccinations/${r._id}`)}
                          title="View details"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {empty && (
                <tr className="no-data-row">
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-icon">💉</div>
                      <h3>No vaccination records found</h3>
                      <p>When your doctor records a vaccination, it will appear here with a downloadable certificate.</p>
                      <button className="btn-primary" onClick={load}>
                        <RefreshIcon />
                        Refresh Records
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}