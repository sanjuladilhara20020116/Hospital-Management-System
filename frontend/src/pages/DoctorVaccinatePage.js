// src/pages/DoctorVaccinatePage.js
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Vaccination } from "../vaccinationApi";

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

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>Create Vaccination Certificate (Doctor)</h2>

      {status && (
        <div
          style={{
            color:
              status.startsWith("Failed") ||
              status.toLowerCase().includes("error")
                ? "crimson"
                : "green",
            marginBottom: 8,
          }}
        >
          {status}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="grid"
        style={{ display: "grid", gap: 8 }}
      >
        <label>Patient ID*</label>
        <input
          value={form.patientUserId}
          onChange={(e) => setVal("patientUserId", e.target.value)}
          required
          disabled={loading}
        />

        <label>Vaccine Name*</label>
        <input
          value={form.vaccineName}
          onChange={(e) => setVal("vaccineName", e.target.value)}
          required
          disabled={loading}
        />

        <label>Manufacturer</label>
        <input
          value={form.manufacturer}
          onChange={(e) => setVal("manufacturer", e.target.value)}
          disabled={loading}
        />

        <label>Batch/Lot No*</label>
        <input
          value={form.batchLotNo}
          onChange={(e) => setVal("batchLotNo", e.target.value)}
          required
          disabled={loading}
        />

        <label>Expiry Date</label>
        <input
          type="date"
          value={form.expiryDate}
          onChange={(e) => setVal("expiryDate", e.target.value)}
          disabled={loading}
        />

        <label>Dose Number</label>
        <input
          type="number"
          min="1"
          max="10"
          value={form.doseNumber}
          onChange={(e) => setVal("doseNumber", e.target.value)}
          disabled={loading}
        />

        <label>Route</label>
        <select
          value={form.route}
          onChange={(e) => setVal("route", e.target.value)}
          disabled={loading}
        >
          <option>IM</option>
          <option>SC</option>
        </select>

        <label>Site</label>
        <input
          value={form.site}
          onChange={(e) => setVal("site", e.target.value)}
          disabled={loading}
        />

        <label>Date/Time Administered</label>
        <input
          type="datetime-local"
          value={form.dateAdministered}
          onChange={(e) => setVal("dateAdministered", e.target.value)}
          disabled={loading}
        />

        <label>Notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setVal("notes", e.target.value)}
          disabled={loading}
        />

        <button disabled={loading} type="submit">
          {loading ? "Saving..." : "Create & Email PDF"}
        </button>
      </form>
    </div>
  );
}
