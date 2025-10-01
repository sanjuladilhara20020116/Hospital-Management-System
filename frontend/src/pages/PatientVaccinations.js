import React, { useEffect, useState } from "react";
import { Vaccination, openVaccinationPdfInNewTab } from "../vaccinationApi";

export default function PatientVaccinations() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      setStatus("Loading...");
      try {
        const data = await Vaccination.listMine();
        setList(data);
        setStatus("");
      } catch {
        setStatus("Failed to load");
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "24px auto" }}>
      <h2>My Vaccinations</h2>
      {status && <div>{status}</div>}
      <ul>
        {list.map(item => (
          <li key={item._id} style={{ marginBottom: 12 }}>
            <b>{item.vaccineName}</b> — Dose {item.doseNumber} — {new Date(item.dateAdministered).toLocaleString()}
            {" · "}
            {item.certificatePdfFile
              ? <button onClick={() => openVaccinationPdfInNewTab(item._id)}>Open Certificate</button>
              : <i>Certificate not generated</i>}
          </li>
        ))}
      </ul>
      {!list.length && !status && <div>No vaccinations yet.</div>}
    </div>
  );
}
