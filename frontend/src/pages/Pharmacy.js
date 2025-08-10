
import React, { useState } from 'react';

export default function Pharmacy() {
  const [id, setId] = useState('');
  const [pres, setPres] = useState(null);
  const [status, setStatus] = useState('');

  // This requires a GET /api/pharmacy/prescriptions/:id endpoint (I showed how to add it earlier)
  const load = async () => {
    if (!id) return;
    setStatus('Loading...');
    const res = await fetch(`/api/pharmacy/prescriptions/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPres(data);
      setStatus('');
    } else {
      setPres(null);
      const err = await res.json().catch(() => ({}));
      setStatus(err.message || 'Prescription not found');
    }
  };

  const dispense = async () => {
    if (!id) return;
    setStatus('Dispensing...');
    const res = await fetch(`/api/pharmacy/prescriptions/${id}/dispense`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus('Dispensed!');
      setPres(data.prescription || pres);
    } else {
      setStatus(data.message || 'Dispense failed');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Pharmacy</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Prescription ID" value={id} onChange={e => setId(e.target.value)} />
        <button onClick={load} disabled={!id}>Load</button>
        <button onClick={dispense} disabled={!id}>Dispense</button>
        <div>{status}</div>
      </div>

      {pres && (
        <div>
          <h3>Prescription</h3>
          <div>Patient: {pres.patientId}</div>
          <div>Doctor: {pres.doctorId}</div>
          <div>Status: {pres.status}</div>
          <ul>
            {(pres.items || []).map((it, idx) => (
              <li key={idx}>
                {it.medicineCode} — qty {it.qty} {it.dose ? `(${it.dose})` : ''} {it.frequency ? ` ${it.frequency}` : ''} {it.durationDays ? ` for ${it.durationDays} days` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
