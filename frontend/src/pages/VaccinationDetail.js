import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Vaccination, openVaccinationPdfInNewTab } from "../vaccinationApi";

export default function VaccinationDetail() {
  const { id } = useParams();
  const [rec, setRec] = useState(null);
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState({ notes: "", site: "", route: "", voided: false, voidReason: "" });
  const actor = JSON.parse(localStorage.getItem("user") || "null"); // { userId, role }

  useEffect(() => {
    (async () => {
      try {
        const r = await Vaccination.getOne(id);
        setRec(r);
        setEdit({
          notes: r.notes || "",
          site: r.site || "",
          route: r.route || "",
          voided: !!r.voided,
          voidReason: r.voidReason || "",
        });
      } catch {
        setStatus("Load failed");
      }
    })();
  }, [id]);

  async function save() {
    try {
      setStatus("Saving...");
      await Vaccination.update(id, edit);
      setStatus("Saved");
    } catch {
      setStatus("Save failed");
    }
  }

  if (!rec) return <div style={{ padding: 24 }}>{status || "Loading..."}</div>;
  const canEdit = actor?.role === "Doctor";

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>Vaccination Detail</h2>
      <div><b>Patient:</b> {rec.patient?.firstName} {rec.patient?.lastName} ({rec.patient?.userId})</div>
      <div><b>Vaccine:</b> {rec.vaccineName} — Dose {rec.doseNumber}</div>
      <div><b>Batch:</b> {rec.batchLotNo}</div>
      <div><b>Date:</b> {new Date(rec.dateAdministered).toLocaleString()}</div>
      <div><b>Certificate:</b> {rec.certificateNumber}</div>
      <div style={{ margin: "8px 0" }}>
        {rec.certificatePdfFile
          ? <button onClick={() => openVaccinationPdfInNewTab(rec._id)}>Open PDF</button>
          : <i>PDF not ready</i>}
      </div>

      {canEdit && (
        <>
          <h3>Edit (Doctor)</h3>
          {status && <div>{status}</div>}
          <label>Route</label>
          <input value={edit.route} onChange={e=>setEdit(s=>({ ...s, route: e.target.value }))} />
          <label>Site</label>
          <input value={edit.site} onChange={e=>setEdit(s=>({ ...s, site: e.target.value }))} />
          <label>Notes</label>
          <textarea rows={3} value={edit.notes} onChange={e=>setEdit(s=>({ ...s, notes: e.target.value }))} />
          <label>
            <input type="checkbox" checked={edit.voided} onChange={e=>setEdit(s=>({ ...s, voided: e.target.checked }))} />
            Mark as void
          </label>
          {edit.voided && (
            <>
              <label>Void Reason</label>
              <input value={edit.voidReason} onChange={e=>setEdit(s=>({ ...s, voidReason: e.target.value }))} />
            </>
          )}
          <div style={{ marginTop: 8 }}>
            <button onClick={save}>Save</button>
          </div>
        </>
      )}
    </div>
  );
}
