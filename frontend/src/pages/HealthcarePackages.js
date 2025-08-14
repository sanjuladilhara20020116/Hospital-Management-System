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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setStatus('Loading packages...');
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/packages`);
      let data;
      try { data = await res.json(); } catch { data = []; }
      if (!res.ok) { setStatus((data && data.message) || `Failed to load (HTTP ${res.status})`); setLoading(false); return; }
      setList(Array.isArray(data) ? data : []);
      setStatus('');
    } catch (e) {
      console.error('Packages load error:', e);
      setStatus('Network error while loading packages.');
    } finally {
      setLoading(false);
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

  // Close modal with ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="hp-wrap">
      <UIStyles />

      {/* Top header */}
      <div className="hp-hero">
        <div className="hp-hero-inner">
          <h2 className="hp-title">Healthcare Packages</h2>
          <p className="hp-sub">Choose a package and book in seconds.</p>
        </div>
      </div>

      {/* toast-like status */}
      <div className={`hp-toast ${status ? 'show' : ''}`}>{status || ' '}</div>

      {/* Cards grid */}
      <div className="hp-grid">
        {/* Loading skeletons */}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={`sk-${i}`} className="hp-card hp-skeleton">
            <div className="hp-media" />
            <div className="hp-card-body">
              <div className="sk-line w-70" />
              <div className="sk-line w-40" />
              <div className="sk-line w-90" />
              <div className="sk-line w-80" />
              <div className="hp-actions">
                <div className="sk-btn" />
                <div className="sk-btn" />
              </div>
            </div>
          </div>
        ))}

        {!loading && list.map(p => (
          <div key={p._id} className="hp-card">
            {/* Photo */}
            <div className="hp-media">
              {p.photo ? (
                <img src={`${API_BASE}${p.photo}`} alt={p.name} />
              ) : (
                <div className="hp-media-empty">No photo</div>
              )}
              <div className="hp-price">Rs. {Number(p.price ?? 0).toFixed(2)}</div>
            </div>

            {/* Content */}
            <div className="hp-card-body">
              <h3 className="hp-card-title" title={p.name}>{p.name}</h3>

              <div className="hp-list">
                <ul>
                  {(p.tests || []).slice(0, 6).map((t, i) => <li key={i}>{t}</li>)}
                  {(p.tests || []).length > 6 && <li className="muted">+ {(p.tests || []).length - 6} more</li>}
                </ul>
              </div>

              <div className="hp-actions">
                <button className="btn primary" onClick={() => addToCart(p._id)} disabled={busy}>
                  {busy ? 'Adding…' : 'Add to Cart'}
                </button>
                <button className="btn ghost" onClick={() => openDetails(p)} disabled={busy}>View details</button>
              </div>
            </div>
          </div>
        ))}

        {!loading && !list.length && !status && (
          <div className="hp-empty">No packages available.</div>
        )}
      </div>

      {/* details modal */}
      {selected && (
        <div className="hp-modal-veil" onClick={() => setSelected(null)}>
          <div className="hp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="hp-modal-media">
              {selected.photo ? (
                <img src={`${API_BASE}${selected.photo}`} alt={selected.name} />
              ) : null}
            </div>
            <div className="hp-modal-body">
              <h3 className="hp-modal-title">{selected.name}</h3>
              <div className="hp-modal-price">Rs. {Number(selected.price ?? 0).toFixed(2)}</div>

              <div className="hp-modal-list">
                <strong>Included Tests</strong>
                <ul>
                  {(selected.tests || []).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>

              <div className="hp-modal-actions">
                <button className="btn primary lg" onClick={() => addToCart(selected._id)} disabled={busy}>
                  {busy ? 'Adding…' : 'Add to Cart'}
                </button>
                <button className="btn ghost" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartButton />
    </div>
  );
}

function UIStyles() {
  return (
    <style>{`
      :root {
        --bg: #f8fafc;            /* light page background */
        --card: #ffffff;          /* card surfaces */
        --muted: #64748b;         /* slate-500 */
        --text: #0f172a;          /* slate-900 */
        --accent: #2563eb;        /* blue-600 */
        --accent-2: #059669;      /* emerald-600 */
        --ring: rgba(37,99,235,.35);
        --border: rgba(15,23,42,.08);
        --shadow: 0 10px 30px rgba(2,6,23,0.08);
      }

      .hp-wrap{
        min-height:100vh;
        background:
          radial-gradient(1200px 600px at 80% -10%, rgba(37,99,235,.08), transparent 60%),
          radial-gradient(800px 500px at -10% 20%, rgba(5,150,105,.06), transparent 55%),
          var(--bg);
        color:var(--text);
        padding-bottom:96px;
      }

      .hp-hero{
        position:sticky;top:0;z-index:5;
        background: linear-gradient(135deg,#ffffff 0%, #f1f5f9 55%, #eef2ff 100%);
        border-bottom: 1px solid var(--border);
        box-shadow: 0 6px 18px rgba(2,6,23,.06);
      }
      .hp-hero-inner{
        max-width:1200px;margin:0 auto;
        padding:20px 20px 16px;
        display:flex;align-items:flex-end;justify-content:space-between;
      }
      .hp-title{margin:0;font-size:28px;letter-spacing:.2px}
      .hp-sub{margin:4px 0 0;color:var(--muted)}

      .hp-toast{
        position:fixed;right:20px;top:16px;
        background:#ecfdf5; /* emerald-50 */
        padding:10px 14px;border:1px solid #a7f3d0;border-radius:12px;
        color:#065f46;box-shadow:0 10px 30px rgba(2,6,23,.12);
        opacity:0;transform:translateY(-8px);transition:.25s
      }
      .hp-toast.show{opacity:1;transform:translateY(0)}

      .hp-grid{
        max-width:1200px;margin:20px auto;
        display:grid;gap:18px;padding:0 20px;
        grid-template-columns:repeat(auto-fill,minmax(300px,1fr))
      }

      .hp-card{
        background: var(--card);
        border: 1px solid var(--border);
        border-radius:16px;overflow:hidden;
        box-shadow: var(--shadow);
        transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease
      }
      .hp-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(2,6,23,.12);border-color:rgba(15,23,42,.14)}

      .hp-media{
        position:relative;height:190px;
        background:
          radial-gradient(120% 120% at 10% 10%, rgba(37,99,235,.10), transparent 50%),
          radial-gradient(120% 120% at 90% 20%, rgba(5,150,105,.10), transparent 50%),
          #f1f5f9;
        display:flex;align-items:center;justify-content:center
      }
      .hp-media img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.02)}
      .hp-media-empty{color:var(--muted)}
      .hp-price{
        position:absolute;left:12px;bottom:12px;
        background:#ffffff; border:1px solid var(--border);
        padding:6px 10px;border-radius:10px;font-weight:700;color:var(--text);
        box-shadow: 0 6px 18px rgba(2,6,23,.08);
      }

      .hp-card-body{padding:14px 14px 16px}
      .hp-card-title{margin:0 0 8px;font-size:18px;line-height:1.2}

      .hp-list{max-height:108px;overflow:auto;padding-right:4px}
      .hp-list ul{margin:0;padding-left:18px}
      .hp-list li{margin:2px 0}
      .muted{color:var(--muted)}

      .hp-actions{display:flex;gap:10px;margin-top:12px}
      .btn{
        appearance:none;border:1px solid rgba(15,23,42,.14);color:var(--text);
        background:#ffffff;padding:10px 12px;border-radius:12px;font-weight:600;cursor:pointer;
        transition:transform .08s ease, box-shadow .15s ease, background .2s ease, border-color .2s ease
      }
      .btn:disabled{opacity:.6;cursor:not-allowed}
      .btn:active{transform:translateY(1px)}
      .btn.primary{
        background: linear-gradient(180deg, rgba(37,99,235,.12), rgba(37,99,235,.08));
        border-color: rgba(37,99,235,.45);
        box-shadow: 0 6px 20px rgba(37,99,235,.18);
        color:#1e3a8a;
      }
      .btn.primary:hover{background: linear-gradient(180deg, rgba(37,99,235,.18), rgba(37,99,235,.10));}
      .btn.ghost{background:#ffffff}
      .btn.lg{padding:12px 16px;font-size:15px}

      .hp-empty{
        grid-column:1 / -1;color:var(--muted);text-align:center;padding:28px;
        border:1px dashed rgba(15,23,42,.18);border-radius:16px;background:#fff
      }

      /* Skeletons (light) */
      .hp-skeleton{position:relative;overflow:hidden}
      .hp-skeleton::after{
        content:'';position:absolute;inset:0;
        background:linear-gradient(90deg, transparent, rgba(2,6,23,.04), transparent);
        transform:translateX(-100%);animation:shimmer 1.6s infinite
      }
      .sk-line{height:12px;background:rgba(2,6,23,.06);border-radius:8px;margin:8px 0}
      .sk-line.w-70{width:70%}
      .sk-line.w-40{width:40%}
      .sk-line.w-90{width:90%}
      .sk-btn{height:36px;width:120px;background:rgba(2,6,23,.06);border-radius:12px}
      @keyframes shimmer{to{transform:translateX(100%)}}

      /* Modal (light) */
      .hp-modal-veil{
        position:fixed;inset:0;background:rgba(15,23,42,.35);
        backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;
        padding:20px;z-index:1000;animation:veil .2s ease both
      }
      @keyframes veil{from{opacity:0}to{opacity:1}}
      .hp-modal{
        width:min(880px,100%);background:#ffffff;
        border:1px solid var(--border);border-radius:18px;overflow:hidden;
        box-shadow:0 24px 80px rgba(2,6,23,.20);
        transform:scale(.98);animation:pop .18s ease both
      }
      @keyframes pop{to{transform:scale(1)}}
      .hp-modal-media{height:240px;background:#f1f5f9}
      .hp-modal-media img{width:100%;height:100%;object-fit:cover}
      .hp-modal-body{padding:20px}
      .hp-modal-title{margin:0}
      .hp-modal-price{margin:8px 0 14px;font-weight:700}
      .hp-modal-list ul{margin:8px 0 0;padding-left:18px;max-height:220px;overflow:auto}
      .hp-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
    `}</style>
  );
}
