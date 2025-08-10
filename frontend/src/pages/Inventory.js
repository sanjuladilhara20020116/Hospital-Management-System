
import React, { useEffect, useState } from 'react';

export default function Inventory() {
  const [meds, setMeds] = useState([]);
  const [onlyLow, setOnlyLow] = useState(false);
  const [expDays, setExpDays] = useState(30);

  const load = async () => {
    const qs = new URLSearchParams();
    if (onlyLow) qs.append('lowStock', 'true');
    if (expDays) qs.append('expiringInDays', String(expDays));
    const res = await fetch(`/api/inventory/medicines?${qs.toString()}`);
    const data = await res.json();
    setMeds(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); /* run on filter change */ }, [onlyLow, expDays]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Inventory</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <label>
          <input type="checkbox" checked={onlyLow} onChange={e => setOnlyLow(e.target.checked)} /> Low stock only
        </label>
        <label>
          Expiring in (days):
          <input type="number" value={expDays} onChange={e => setExpDays(Number(e.target.value || 0))} style={{ marginLeft: 8, width: 80 }} />
        </label>
        <button onClick={load}>Refresh</button>
      </div>

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Code</th><th>Name</th><th>Total Qty</th><th>Reorder</th><th>Batches</th>
          </tr>
        </thead>
        <tbody>
          {meds.map(m => (
            <tr key={m._id || m.code} style={{ background: (m.totalQty <= (m.reorderLevel || 0)) ? '#ffe5e5' : undefined }}>
              <td>{m.code}</td>
              <td>{m.name}</td>
              <td>{m.totalQty}</td>
              <td>{m.reorderLevel ?? 0}</td>
              <td>
                {(m.batches || []).map(b => (
                  <div key={b.batchNo}>
                    <strong>{b.batchNo}</strong> — {b.qty} units — exp {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
                  </div>
                ))}
              </td>
            </tr>
          ))}
          {!meds.length && <tr><td colSpan="5">No medicines found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
