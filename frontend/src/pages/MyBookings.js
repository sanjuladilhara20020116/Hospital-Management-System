import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1'; // <<< must match Cart & HealthcarePackages

export default function MyBookings() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setStatus('Loading your bookings…');
      const res = await fetch(`${API_BASE}/api/bookings/mine`, {
        headers: { 'x-user-id': USER_ID } // <<< IMPORTANT
      });

      let data;
      try { data = await res.json(); } catch { data = []; }

      if (!res.ok) {
        setStatus(data?.message || `Failed to load (HTTP ${res.status})`);
        return;
      }

      setList(Array.isArray(data) ? data : []);
      setStatus('');
    } catch (e) {
      console.error('my-bookings load error:', e);
      setStatus('Network error loading bookings.');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>My Health Packages</h2>
      {status && <div style={{ marginBottom: 10, color: '#555' }}>{status}</div>}

      {!list.length && !status && <div>No bookings yet.</div>}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))' }}>
        {list.map(b => (
          <div key={b._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, color: '#666' }}>
              Booking ID: <strong>{b._id}</strong>
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Date & Time:</strong> {new Date(b.appointmentDate).toLocaleString()}
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Status:</strong> {b.status}
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Total:</strong> Rs. {Number(b.totalAmount || 0).toFixed(2)}
            </div>
            <div style={{ marginTop: 10 }}>
              <strong>Packages:</strong>
              <ul style={{ margin: '6px 0 0 18px' }}>
                {(b.items || []).map((it, i) => (
                  <li key={i}>
                    {it.packageName} × {it.quantity} — Rs. {Number(it.unitPrice).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setSelected(b)}>View details</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, maxWidth: 700, width: '100%', padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>Booking details</h3>
            <div><strong>Booking ID:</strong> {selected._id}</div>
            <div><strong>Patient:</strong> {selected.patientName || '—'} ({selected.patientEmail})</div>
            <div><strong>Appointment:</strong> {new Date(selected.appointmentDate).toLocaleString()}</div>
            <div><strong>Payment:</strong> {selected.payment?.method} — {selected.payment?.status}</div>
            <div style={{ marginTop: 10 }}>
              <strong>Packages</strong>
              <ul>
                {(selected.items || []).map((it, i) => (
                  <li key={i}>
                    {it.packageName} × {it.quantity} — Rs. {Number(it.unitPrice).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Total:</strong> Rs. {Number(selected.totalAmount || 0).toFixed(2)}
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
