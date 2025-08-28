import React, { useEffect, useState } from "react";
import { Vaccination, openVaccinationPdfInNewTab } from "../vaccinationApi";

export default function DoctorVaccinations() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState({ patientUserId: "", from: "", to: "" });
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading...");
    try {
      const data = await Vaccination.listForDoctor({
        patientUserId: q.patientUserId || undefined,
        from: q.from || undefined,
        to: q.to || undefined,
      });
      setList(data);
      setStatus("");
    } catch {
      setStatus("Failed to load");
    }
  }
  useEffect(() => { load(); }, []);

  async function resend(id) {
    setStatus("Resending...");
    try {
      await Vaccination.resendEmail(id);
      setStatus("Email sent");
    } catch {
      setStatus("Resend failed");
    }
  }
  async function del(id) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await Vaccination.remove(id);
      setList(s => s.filter(x => x._id !== id));
    } catch {
      alert("Delete failed");
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto" }}>
      <h2>Doctor Vaccinations</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 12 }}>
        <input placeholder="Patient ID" value={q.patientUserId} onChange={e=>setQ({...q, patientUserId: e.target.value})} />
        <input type="date" value={q.from} onChange={e=>setQ({...q, from: e.target.value})} />
        <input type="date" value={q.to} onChange={e=>setQ({...q, to: e.target.value})} />
        <button onClick={load}>Filter</button>
      </div>
      {status && <div>{status}</div>}
      <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Date</th><th>Patient</th><th>Vaccine</th><th>Dose</th><th>Cert#</th><th>PDF</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(r => (
            <tr key={r._id}>
              <td>{new Date(r.dateAdministered).toLocaleString()}</td>
              <td>{r.patient?.firstName} {r.patient?.lastName} ({r.patient?.userId})</td>
              <td>{r.vaccineName}</td>
              <td>{r.doseNumber}</td>
              <td>{r.certificateNumber}</td>
              <td>
                {r.certificatePdfFile
                  ? <button onClick={() => openVaccinationPdfInNewTab(r._id)}>Open PDF</button>
                  : <i>Not ready</i>}
              </td>
              <td>
                <button onClick={() => resend(r._id)}>Resend</button>
                <button onClick={() => del(r._id)} style={{ marginLeft: 6, color: "crimson" }}>Delete</button>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan="7" align="center">No records</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
