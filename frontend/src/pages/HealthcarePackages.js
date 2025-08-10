// src/pages/HealthcarePackages.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartButton from '../components/CartButton';

const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1';

export default function HealthcarePackages() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setStatus('Loading packages...');
      const res = await fetch(`${API_BASE}/api/packages`);
      let data;
      try { data = await res.json(); } catch { data = []; }
      if (!res.ok) { setStatus((data && data.message) || `Failed to load (HTTP ${res.status})`); return; }
      setList(Array.isArray(data) ? data : []);
      setStatus('');
    } catch (e) {
      console.error('Packages load error:', e);
      setStatus('Network error while loading packages.');
    }
  };
  useEffect(() => { load(); }, []);

  const openDetails = (pkg) => setSelected(pkg);

  const addToCart = async (packageId) => {
    try {
      setBusy(true);
      setStatus('Adding to cart...');
      const res = await fetch(`${API_BASE}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID },
        body: JSON.stringify({ packageId, quantity: 1 })
      });
      let payload;
      try { payload = await res.json(); } catch { payload = { message: await res.text() }; }
      if (!res.ok) {
        const msg = payload?.message || `Add to cart failed (HTTP ${res.status})`;
        alert(msg);
        setStatus('');
        setBusy(false);
        return;
      }
      setStatus('Added to cart ✓');
      window.dispatchEvent(new Event('cart:updated'));
      setBusy(false);
      // navigate('/cart'); // uncomment to auto-jump
    } catch (e) {
      console.error('Network error adding to cart:', e);
      alert('Network error adding to cart.');
      setBusy(false); setStatus('');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Healthcare Packages</h2>
      {status && <div style={{ marginBottom: 10, color: '#555' }}>{status}</div>}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))' }}>
        {list.map(p => (
          <div key={p._id} style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            {/* Photo */}
            {p.photo ? (
              <img
                src={`${API_BASE}${p.photo}`}
                alt={p.name}
                style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: 160, background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                No photo
              </div>
            )}
            {/* Content */}
            <div style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>{p.name}</h3>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Rs. {Number(p.price ?? 0).toFixed(2)}
              </div>
              <div style={{ maxHeight: 110, overflow: 'auto', marginBottom: 8 }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(p.tests || []).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => addToCart(p._id)} disabled={busy}>
                  {busy ? 'Adding…' : 'Add to Cart'}
                </button>
                <button onClick={() => openDetails(p)} disabled={busy}>View details</button>
              </div>
            </div>
          </div>
        ))}
        {!list.length && !status && (
          <div style={{ gridColumn: '1 / -1', color: '#777' }}>No packages available.</div>
        )}
      </div>

      {/* details modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, maxWidth: 640, width: '100%', overflow: 'hidden' }}>
            {/* Modal photo */}
            {selected.photo && (
              <img
                src={`${API_BASE}${selected.photo}`}
                alt={selected.name}
                style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
              />
            )}
            <div style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
              <div style={{ marginBottom: 8 }}>
                <strong>Price:</strong> Rs. {Number(selected.price ?? 0).toFixed(2)}
              </div>
              <div>
                <strong>Included Tests:</strong>
                <ul>
                  {(selected.tests || []).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => addToCart(selected._id)} disabled={busy}>
                  {busy ? 'Adding…' : 'Add to Cart'}
                </button>
                <button onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartButton />
    </div>
  );
}
