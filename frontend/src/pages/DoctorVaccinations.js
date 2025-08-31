// src/pages/DoctorVaccinations.js
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Vaccination, openVaccinationPdfInNewTab } from "../vaccinationApi";
import "./DoctorVaccinatePage.css"; 

// Icons (using Material UI icons as example - you can use any icon library)
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon
} from "@mui/icons-material";

export default function DoctorVaccinations() {
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [q, setQ] = useState({ patientUserId: "", from: "", to: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  async function load() {
    setLoading(true);
    setStatus("Loading vaccination records…");
    try {
      const data = await Vaccination.listForDoctor({
        patientUserId: q.patientUserId || undefined,
        from: q.from || undefined,
        to: q.to || undefined,
      });
      setList(Array.isArray(data) ? data : []);
      setStatus("");
    } catch (e) {
      setStatus("Failed to load vaccination records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resend(id) {
    setStatus("Sending email notification…");
    try {
      await Vaccination.resendEmail(id);
      setStatus("Email sent successfully");
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("Failed to send email");
    }
  }

  async function del(id) {
    if (!window.confirm("Delete this vaccination record? This cannot be undone.")) return;
    try {
      await Vaccination.remove(id);
      setList((s) => s.filter((x) => x._id !== id));
      setStatus("Record deleted");
      setTimeout(() => setStatus(""), 1500);
    } catch {
      setStatus("Failed to delete record");
    }
  }

  function clearFilters() {
    setQ({ patientUserId: "", from: "", to: "" });
  }

  const statusTone = useMemo(() => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes("failed")) return "error";
    if (s.includes("sent") || s.includes("deleted") || s.includes("success")) return "success";
    return "info";
  }, [status]);

  return (
    <div className="doctor-vaccinations-page">
      {/* Header */}
      <div className="page-header">
        <div className="title-wrap">
          <h1>Vaccination Management</h1>
          <div className="subtitle">Doctor Panel · Review & administer records</div>
        </div>
        <button 
          className="btn-primary icon-btn"
          onClick={load}
          disabled={loading}
        >
          <RefreshIcon />
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

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
      <div className="filters-card card">
        <div 
          className="card-header"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="section-title">
            <FilterIcon />
            <span>Filter Records</span>
          </div>
          <span className={`toggle-icon ${showFilters ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        
        {showFilters && (
          <div className="filters-content">
            <div className="filter-grid">
              <div className="form-control">
                <label htmlFor="patientUserId">
                  <PersonIcon />
                  Patient ID
                </label>
                <input
                  id="patientUserId"
                  placeholder="e.g., P2025/898/16"
                  value={q.patientUserId}
                  onChange={(e) => setQ({ ...q, patientUserId: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="form-control">
                <label htmlFor="from">
                  <CalendarIcon />
                  From Date
                </label>
                <input
                  id="from"
                  type="date"
                  value={q.from}
                  onChange={(e) => setQ({ ...q, from: e.target.value })}
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
                  value={q.to}
                  onChange={(e) => setQ({ ...q, to: e.target.value })}
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
                Clear Filters
              </button>
              <button 
                className="btn-primary" 
                onClick={load}
                disabled={loading}
              >
                <SearchIcon />
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Records Card */}
      <div className="records-card card">
        <div className="card-header">
          <div className="section-title">
            Vaccination Records
          </div>
          <div className="results-count">
            {list.length} record{list.length !== 1 ? "s" : ""} found
          </div>
        </div>

        <div className="table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Date Administered</th>
                <th>Patient</th>
                <th>Vaccine</th>
                <th>Dose</th>
                <th>Certificate #</th>
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, idx) => (
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
                    className="patient-cell clickable"
                    onClick={() => navigate(`/vaccinations/${r._id}`)}
                  >
                    <div className="patient-name">
                      {(r.patient?.firstName || "") + " " + (r.patient?.lastName || "")}
                    </div>
                    <div className="patient-id">
                      ID: {r.patient?.userId}
                    </div>
                  </td>

                  <td>
                    <div className="vaccine-name">
                      {r.vaccineName}
                    </div>
                  </td>

                  <td>
                    <span className="dose-badge">
                      Dose {r.doseNumber}
                    </span>
                  </td>

                  <td>
                    <div className="cert-number">
                      {r.certificateNumber || <span className="empty-field">—</span>}
                    </div>
                  </td>

                  <td>
                    {r.certificatePdfFile ? (
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openVaccinationPdfInNewTab(r._id);
                        }}
                        title="Open PDF"
                      >
                        <PdfIcon />
                      </button>
                    ) : (
                      <span className="processing-text">Processing…</span>
                    )}
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon" 
                        onClick={() => navigate(`/vaccinations/${r._id}`)}
                        title="View details"
                      >
                        <ViewIcon />
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={() => resend(r._id)}
                        title="Resend email"
                      >
                        <EmailIcon />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => del(r._id)}
                        title="Delete record"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!list.length && !loading && (
                <tr className="no-data-row">
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <h3>No vaccination records found</h3>
                      <p>Try adjusting your filters or add new records.</p>
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