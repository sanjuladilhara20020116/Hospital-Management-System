// src/pages/DoctorVaccinatePage.js
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Vaccination } from "../vaccinationApi";
import "./DoctorVaccinatePage.css"; // ← add this line

const onlyLettersSpaces = /^[A-Za-z ]+$/;
const safeText = /^[A-Za-z0-9 \-_/.,]+$/;

export default function DoctorVaccinatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillId = searchParams.get("patientUserId") || "";

  const [form, setForm] = useState(() => ({
    patientUserId: prefillId,   // ✅ prefill from ?patientUserId=...
    vaccineName: "",
    manufacturer: "",
    batchLotNo: "",
    expiryDate: "",
    doseNumber: 1,
    route: "IM",
    site: "Left Deltoid",
    dateAdministered: "",
    notes: "",
  }));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function setVal(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function validate() {
    if (!form.patientUserId.trim()) return "Patient ID is required";
    if (!form.vaccineName.trim()) return "Vaccine name is required";
    if (!onlyLettersSpaces.test(form.vaccineName))
      return "Vaccine: letters/spaces only";
    if (form.manufacturer && !onlyLettersSpaces.test(form.manufacturer))
      return "Manufacturer: letters/spaces only";
    if (!form.batchLotNo.trim()) return "Batch/Lot is required";
    if (!safeText.test(form.batchLotNo))
      return "Batch/Lot: avoid special characters";
    if (form.notes && !safeText.test(form.notes))
      return "Notes: avoid special characters";
    if (Number(form.doseNumber) < 1 || Number(form.doseNumber) > 10)
      return "Dose number invalid";
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("");
    const err = validate();
    if (err) {
      setStatus(err);
      return;
    }

    setLoading(true);
    try {
      // Convert datetime-local (local time) -> ISO string for backend
      const isoDate = form.dateAdministered
        ? new Date(form.dateAdministered).toISOString()
        : undefined;

      const res = await Vaccination.create({
        patientUserId: form.patientUserId.trim(),
        vaccineName: form.vaccineName.trim(),
        manufacturer: form.manufacturer.trim() || undefined,
        batchLotNo: form.batchLotNo.trim(),
        expiryDate: form.expiryDate || undefined,
        doseNumber: Number(form.doseNumber) || 1,
        route: form.route || "IM",
        site: form.site || "Left Deltoid",
        dateAdministered: isoDate,
        notes: form.notes || undefined,
      });

      setStatus(res.message || "Created");

      // Nice UX: go to the record detail page
      if (res?._id) navigate(`/vaccinations/${res._id}`);
    } catch (e) {
      setStatus(e?.response?.data?.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  const isError =
    status &&
    (status.startsWith("Failed") || status.toLowerCase().includes("error"));

  return (
    <div className="vaccinate-page">
      <div className="page-header">
        <div className="title-wrap">
          <h2>Create Vaccination Certificate</h2>
          <span className="subtitle">Doctor Panel</span>
        </div>
      </div>

      {status && (
        <div className={`alert ${isError ? "error" : "success"}`} role="status">
          {status}
        </div>
      )}

      <div className="card">
        <form onSubmit={onSubmit} className="form-grid" noValidate>
          {/* Patient */}
          <div className="section two-col">
            <div className="form-control">
              <label htmlFor="patientUserId">Patient ID<span className="req">*</span></label>
              <input
                id="patientUserId"
                value={form.patientUserId}
                onChange={(e) => setVal("patientUserId", e.target.value)}
                required
                disabled={loading}
                placeholder="e.g., PAT-000123"
              />
            </div>

            <div className="form-control">
              <label htmlFor="dateAdministered">Date/Time Administered</label>
              <input
                id="dateAdministered"
                type="datetime-local"
                value={form.dateAdministered}
                onChange={(e) => setVal("dateAdministered", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Vaccine */}
          <div className="section">
            <div className="section-title">Vaccine Details</div>
            <div className="two-col">
              <div className="form-control">
                <label htmlFor="vaccineName">Vaccine Name<span className="req">*</span></label>
                <input
                  id="vaccineName"
                  value={form.vaccineName}
                  onChange={(e) => setVal("vaccineName", e.target.value)}
                  required
                  disabled={loading}
                  placeholder="e.g., Hepatitis B"
                />
              </div>

              <div className="form-control">
                <label htmlFor="manufacturer">Manufacturer</label>
                <input
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => setVal("manufacturer", e.target.value)}
                  disabled={loading}
                  placeholder="e.g., GSK"
                />
              </div>
            </div>

            <div className="two-col">
              <div className="form-control">
                <label htmlFor="batchLotNo">Batch/Lot No<span className="req">*</span></label>
                <input
                  id="batchLotNo"
                  value={form.batchLotNo}
                  onChange={(e) => setVal("batchLotNo", e.target.value)}
                  required
                  disabled={loading}
                  placeholder="e.g., BATCH-24-0912"
                />
              </div>

              <div className="form-control">
                <label htmlFor="expiryDate">Expiry Date</label>
                <input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setVal("expiryDate", e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Administration */}
          <div className="section">
            <div className="section-title">Administration</div>
            <div className="two-col">
              <div className="form-control">
                <label htmlFor="doseNumber">Dose Number</label>
                <input
                  id="doseNumber"
                  type="number"
                  min="1"
                  max="10"
                  value={form.doseNumber}
                  onChange={(e) => setVal("doseNumber", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-control">
                <label htmlFor="route">Route</label>
                <select
                  id="route"
                  value={form.route}
                  onChange={(e) => setVal("route", e.target.value)}
                  disabled={loading}
                >
                  <option>IM</option>
                  <option>SC</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label htmlFor="site">Site</label>
              <input
                id="site"
                value={form.site}
                onChange={(e) => setVal("site", e.target.value)}
                disabled={loading}
                placeholder="e.g., Left Deltoid"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="section">
            <div className="form-control">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setVal("notes", e.target.value)}
                disabled={loading}
                placeholder="Optional clinical notes"
              />
            </div>
          </div>

          <div className="actions">
            <button disabled={loading} type="submit" className="btn-primary">
              {loading ? "Saving..." : "Create & Email PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
