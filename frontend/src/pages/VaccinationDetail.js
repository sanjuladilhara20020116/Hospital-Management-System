import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Vaccination, openVaccinationPdfInNewTab } from "../vaccinationApi";

export default function VaccinationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rec, setRec] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [edit, setEdit] = useState({
    notes: "",
    site: "",
    route: "",
    voided: false,
    voidReason: "",
    manufacturer: "",
    batchLotNo: "",
  });

  const actor = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    loadVaccinationRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadVaccinationRecord() {
    try {
      setLoading(true);
      const r = await Vaccination.getOne(id);
      setRec(r);
      setEdit({
        notes: r.notes || "",
        site: r.site || "",
        route: r.route || "",
        voided: !!r.voided,
        voidReason: r.voidReason || "",
        manufacturer: r.manufacturer || "",
        batchLotNo: r.batchLotNo || "",
      });
    } catch (e) {
      setStatus("Failed to load vaccination record");
    } finally {
      setLoading(false);
    }
  }

  // keep Site sensible while editing if Route changes
  useEffect(() => {
    if (!editMode) return;
    if (edit.route === "Oral" || edit.route === "Nasal") {
      if (edit.site !== "N/A") setEdit((p) => ({ ...p, site: "N/A" }));
    } else {
      if (edit.site === "N/A") setEdit((p) => ({ ...p, site: "Left Deltoid" }));
    }
  }, [edit.route, edit.site, editMode]);

  function classifyStatus(s) {
    const t = String(s || "").toLowerCase();
    if (t.includes("fail") || t.includes("error")) return "error";
    if (t.includes("success")) return "success";
    return "info";
  }

  async function handleSave() {
    try {
      // require reason if marking void
      if (edit.voided && !String(edit.voidReason).trim()) {
        setStatus("Reason is required to void a record");
        return;
      }

      setLoading(true);
      setStatus("Saving...");
      const payload = {
        notes: (edit.notes || "").trim(),
        site: edit.site,
        route: edit.route,
        voided: !!edit.voided,
        voidReason: (edit.voidReason || "").trim(),
        manufacturer: (edit.manufacturer || "").trim(),
        batchLotNo: (edit.batchLotNo || "").trim(),
      };
      await Vaccination.update(id, payload);
      setStatus("Changes saved successfully");
      setEditMode(false);
      await loadVaccinationRecord();
    } catch (e) {
      setStatus("Failed to save changes");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Are you sure you want to delete this vaccination record?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setStatus("Deleting...");
      // keep consistent with the rest of your app
      await Vaccination.remove(id);
      setStatus("Vaccination record deleted successfully");
      setTimeout(() => navigate("/vaccinations/home"), 1000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete vaccination record";
      setStatus(`Failed to delete vaccination record: ${msg}`);
      console.error("Delete failed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !rec) {
    return (
      <div className="vaccination-detail-container">
        <div className="loading">Loading vaccination record...</div>
      </div>
    );
  }

  if (!rec) {
    return (
      <div className="vaccination-detail-container">
        <div className="error-message">Vaccination record not found</div>
      </div>
    );
  }

  const canEdit = actor?.role === "Doctor";

  return (
    <div className="vaccination-detail-container">
      <div className="vaccination-detail-card">
        <div className="card-header">
          <h2>Vaccination Record Details</h2>
          {rec.voided && <span className="voided-badge">VOIDED</span>}
        </div>

        {status && (
          <div className={`status-message ${classifyStatus(status)}`}>
            {status}
          </div>
        )}

        <div className="detail-grid">
          <div className="detail-section">
            <h3>Patient Information</h3>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">
                {rec.patient?.firstName} {rec.patient?.lastName}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Patient ID:</span>
              <span className="detail-value">{rec.patient?.userId}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Vaccine Details</h3>
            <div className="detail-row">
              <span className="detail-label">Vaccine:</span>
              <span className="detail-value">{rec.vaccineName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Dose Number:</span>
              <span className="detail-value">{rec.doseNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Batch/Lot No:</span>
              <span className="detail-value">
                {editMode ? (
                  <input
                    className="edit-input"
                    type="text"
                    value={edit.batchLotNo}
                    onChange={(e) =>
                      setEdit({ ...edit, batchLotNo: e.target.value })
                    }
                    placeholder="Enter batch/lot number"
                  />
                ) : (
                  rec.batchLotNo
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Manufacturer:</span>
              <span className="detail-value">
                {editMode ? (
                  <input
                    className="edit-input"
                    type="text"
                    value={edit.manufacturer}
                    onChange={(e) =>
                      setEdit({ ...edit, manufacturer: e.target.value })
                    }
                    placeholder="Enter manufacturer"
                  />
                ) : (
                  rec.manufacturer || "Not specified"
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Expiry Date:</span>
              <span className="detail-value">
                {rec.expiryDate
                  ? new Date(rec.expiryDate).toLocaleDateString()
                  : "Not specified"}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Administration Details</h3>
            <div className="detail-row">
              <span className="detail-label">Date/Time:</span>
              <span className="detail-value">
                {new Date(rec.dateAdministered).toLocaleString()}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Route:</span>
              <span className="detail-value">
                {editMode ? (
                  <select
                    value={edit.route}
                    onChange={(e) =>
                      setEdit({ ...edit, route: e.target.value })
                    }
                    className="edit-input"
                  >
                    <option value="IM">Intramuscular (IM)</option>
                    <option value="SC">Subcutaneous (SC)</option>
                    <option value="ID">Intradermal (ID)</option>
                    <option value="Oral">Oral</option>
                    <option value="Nasal">Nasal</option>
                  </select>
                ) : (
                  rec.route
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Site:</span>
              <span className="detail-value">
                {editMode ? (
                  <select
                    value={edit.site}
                    onChange={(e) =>
                      setEdit({ ...edit, site: e.target.value })
                    }
                    className="edit-input"
                    disabled={edit.route === "Oral" || edit.route === "Nasal"}
                  >
                    <option value="Left Deltoid">Left Deltoid</option>
                    <option value="Right Deltoid">Right Deltoid</option>
                    <option value="Left Thigh">Left Thigh</option>
                    <option value="Right Thigh">Right Thigh</option>
                    <option value="Left Gluteus">Left Gluteus</option>
                    <option value="Right Gluteus">Right Gluteus</option>
                    <option value="Oral">Oral</option>
                    <option value="Nasal">Nasal</option>
                    <option value="N/A">N/A</option>
                  </select>
                ) : (
                  rec.site
                )}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Certificate Information</h3>
            <div className="detail-row">
              <span className="detail-label">Certificate Number:</span>
              <span className="detail-value">
                {rec.certificateNumber || "Not generated"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">PDF Certificate:</span>
              <span className="detail-value">
                {rec.certificatePdfFile ? (
                  <button
                    className="pdf-button"
                    onClick={() =>
                      !rec.voided && openVaccinationPdfInNewTab(rec._id)
                    }
                    disabled={rec.voided}
                  >
                    {rec.voided
                      ? "Certificate disabled (voided)"
                      : "View PDF Certificate"}
                  </button>
                ) : (
                  <span className="no-pdf">Not available</span>
                )}
              </span>
            </div>
          </div>

          <div className="detail-section full-width">
            <h3>Clinical Notes</h3>
            {editMode ? (
              <textarea
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                className="edit-textarea"
                placeholder="Enter clinical notes or observations"
                rows={4}
              />
            ) : (
              <div className="notes-content">
                {rec.notes || "No notes provided"}
              </div>
            )}
          </div>

          {editMode && (
            <div className="detail-section full-width">
              <h3>Void Record</h3>
              <div className="void-section">
                <label className="void-checkbox">
                  <input
                    type="checkbox"
                    checked={edit.voided}
                    onChange={(e) =>
                      setEdit({ ...edit, voided: e.target.checked })
                    }
                  />
                  Mark this record as void
                </label>
                {edit.voided && (
                  <div className="void-reason">
                    <label>Reason for voiding:</label>
                    <input
                      type="text"
                      value={edit.voidReason}
                      onChange={(e) =>
                        setEdit({ ...edit, voidReason: e.target.value })
                      }
                      className="edit-input"
                      placeholder="Provide reason for voiding this record"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="action-buttons">
            {editMode ? (
              <>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditMode(false);
                    // Reset edit state to original values
                    setEdit({
                      notes: rec.notes || "",
                      site: rec.site || "",
                      route: rec.route || "",
                      voided: !!rec.voided,
                      voidReason: rec.voidReason || "",
                      manufacturer: rec.manufacturer || "",
                      batchLotNo: rec.batchLotNo || "",
                    });
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-primary"
                  onClick={() => setEditMode(true)}
                >
                  Edit Details
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete Record
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .vaccination-detail-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
        }

        .vaccination-detail-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .card-header {
          background: linear-gradient(135deg, #2C69F0 0%, #4D8DF7 100%);
          color: white;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h2 {
          margin: 0;
          font-weight: 600;
        }

        .voided-badge {
          background: #ff4757;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
        }

        .status-message {
          padding: 12px 24px;
          margin: 0;
          font-weight: 500;
        }

        .status-message.success {
          background-color: #d4edda;
          color: #155724;
        }

        .status-message.error {
          background-color: #f8d7da;
          color: #721c24;
        }

        .status-message.info {
          background-color: #eef3ff;
          color: #2C69F0;
        }

        .detail-grid {
          padding: 24px;
        }

        .detail-section {
          margin-bottom: 28px;
        }

        .detail-section.full-width {
          grid-column: 1 / -1;
        }

        .detail-section h3 {
          color: #2C69F0;
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          padding-bottom: 8px;
          border-bottom: 1px solid #eaeaea;
        }

        .detail-row {
          display: flex;
          margin-bottom: 12px;
        }

        .detail-label {
          font-weight: 600;
          min-width: 160px;
          color: #555;
        }

        .detail-value {
          flex: 1;
        }

        .notes-content {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #4D8DF7;
          white-space: pre-wrap;
        }

        .edit-input,
        .edit-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
        }

        .edit-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .pdf-button {
          background: #2C69F0;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .pdf-button:hover {
          background: #1a56e6;
        }

        .no-pdf {
          color: #888;
          font-style: italic;
        }

        .void-section {
          background: #fff9f9;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #ffecec;
        }

        .void-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .void-checkbox input {
          width: 18px;
          height: 18px;
        }

        .void-reason {
          margin-top: 12px;
        }

        .void-reason label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #d63031;
        }

        .action-buttons {
          padding: 20px 24px;
          background: #f8f9fa;
          border-top: 1px solid #eaeaea;
          display: flex;
          gap: 12px;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #2C69F0;
          color: white;
        }

        .btn-primary:hover {
          background: #1a56e6;
        }

        .btn-secondary {
          background: #f1f3f5;
          color: #495057;
          border: 1px solid #dee2e6;
        }

        .btn-secondary:hover {
          background: #e9ecef;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled,
        .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading,
        .error-message {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }

        .error-message {
          color: #dc3545;
        }

        @media (max-width: 768px) {
          .vaccination-detail-container {
            padding: 16px;
          }

          .detail-row {
            flex-direction: column;
            gap: 4px;
            margin-bottom: 16px;
          }

          .detail-label {
            min-width: unset;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
