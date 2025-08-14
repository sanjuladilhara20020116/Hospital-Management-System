// src/pages/ManagePackages.js
import React, { useEffect, useRef, useState } from 'react';

const API_BASE = 'http://localhost:5000';

export default function ManagePackages() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', testsText: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  // Warm cream theme
  const theme = {
    bg: '#fdf6ec',        // cream background
    panel: '#fffaf5',     // slightly lighter panel
    card: '#ffffff',
    muted: '#7c6f64',     // warm gray-brown
    text: '#3f3f3f',
    accent: '#d97706',    // warm amber
    accent2: '#fbbf24',   // lighter amber
    danger: '#dc2626',
    ok: '#16a34a',
    radius: 14,
    shadow: '0 6px 20px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderSubtle: '1px solid rgba(0,0,0,0.05)',
    ring: '0 0 0 3px rgba(217,119,6,0.25)',
  };

  const s = {
    page: {
      minHeight: '100vh',
      background: theme.bg,
      padding: '28px clamp(16px, 2.5vw, 40px)',
      color: theme.text,
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif',
    },
    h2Wrap: { display: 'flex', alignItems: 'center', gap: '.6rem', margin: '6px 0 18px', flexWrap: 'wrap' },
    h2: {
      fontWeight: 700,
      letterSpacing: '.2px',
      background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      margin: 0,
      fontSize: '1.5rem',
    },
    subtle: { color: theme.muted, fontSize: '.95rem' },

    grid: {
      display: 'grid',
      gap: 18,
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      alignItems: 'start',
    },

    card: {
      background: theme.card,
      border: theme.border,
      borderRadius: theme.radius,
      boxShadow: theme.shadow,
      overflow: 'hidden',
    },
    cardHead: {
      padding: '14px 18px',
      borderBottom: theme.borderSubtle,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: theme.panel,
    },
    cardBody: { padding: 18 },

    field: { display: 'grid', gap: 6, marginBottom: 10 },
    label: { fontSize: '.9rem', color: theme.muted, fontWeight: 500 },

    input: (isFocus) => ({
      width: '100%',
      background: '#fff',
      color: theme.text,
      border: theme.border,
      borderRadius: 10,
      padding: '10px 12px',
      outline: 'none',
      fontSize: '0.95rem',
      ...(isFocus
        ? { boxShadow: theme.ring, borderColor: theme.accent }
        : {}),
    }),
    textarea: (isFocus) => ({
      width: '100%',
      minHeight: 100,
      background: '#fff',
      color: theme.text,
      border: theme.border,
      borderRadius: 10,
      padding: '10px 12px',
      outline: 'none',
      fontSize: '0.95rem',
      resize: 'vertical',
      ...(isFocus
        ? { boxShadow: theme.ring, borderColor: theme.accent }
        : {}),
    }),

    btnRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    button: {
      border: 'none',
      cursor: 'pointer',
      background: theme.accent,
      color: '#fff',
      fontWeight: 600,
      padding: '9px 14px',
      borderRadius: 10,
      fontSize: '.95rem',
    },
    btnGhost: {
      border: theme.border,
      cursor: 'pointer',
      background: 'transparent',
      color: theme.text,
      fontWeight: 600,
      padding: '9px 14px',
      borderRadius: 10,
      fontSize: '.95rem',
    },
    btnDanger: {
      border: 'none',
      cursor: 'pointer',
      background: theme.danger,
      color: '#fff',
      fontWeight: 600,
      padding: '9px 14px',
      borderRadius: 10,
      fontSize: '.95rem',
    },

    statusWrap: { display: 'inline-flex', alignItems: 'center', gap: 8, color: theme.muted, fontSize: '.9rem' },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: theme.accent,
    },
    readyDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      background: editId ? theme.accent2 : theme.ok,
    },

    previewWrap: {
      marginTop: 6,
      display: 'inline-block',
      borderRadius: 10,
      overflow: 'hidden',
      border: theme.border,
    },
    previewImg: { display: 'block', maxWidth: 200, height: 'auto' },

    tableWrap: {
      overflow: 'auto',
      borderRadius: theme.radius,
      border: theme.border,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      color: theme.text,
      background: '#fff',
    },
    th: {
      textAlign: 'left',
      fontWeight: 600,
      fontSize: '.9rem',
      padding: '10px 12px',
      background: theme.panel,
      borderBottom: theme.border,
    },
    td: {
      padding: '10px 12px',
      verticalAlign: 'top',
      borderTop: theme.border,
      fontSize: '.93rem',
    },
    priceChip: {
      background: '#fef3c7',
      color: '#92400e',
      padding: '3px 7px',
      borderRadius: 999,
      fontWeight: 600,
      fontSize: '.85rem',
      display: 'inline-block',
    },
    empty: {
      padding: 18,
      textAlign: 'center',
      color: theme.muted,
      background: theme.panel,
    },
    ulTests: { margin: 0, paddingLeft: 16 },
    photoCellImg: {
      width: 90,
      height: 60,
      objectFit: 'cover',
      borderRadius: 8,
      border: theme.border,
      display: 'block',
    },
  };

  // logic unchanged
  const load = async () => {
    try {
      setStatus('Loading...');
      const res = await fetch(`${API_BASE}/api/packages`);
      const data = await res.json().catch(() => []);
      if (!res.ok) { setStatus(data.message || 'Failed to load'); return; }
      setList(Array.isArray(data) ? data : []);
      setStatus('');
    } catch {
      setStatus('Network error while loading packages.');
    }
  };
  useEffect(() => { load(); }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setPhotoFile(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  };

  const resetForm = () => {
    setForm({ name: '', price: '', testsText: '' });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async (e) => {
    e.preventDefault();
    const priceNum = Number(form.price);
    const tests = (form.testsText || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!form.name.trim()) return alert('Package name is required');
    if (Number.isNaN(priceNum) || priceNum < 0) return alert('Price must be a valid non-negative number');
    if (tests.length === 0) return alert('Add at least one medical test');

    setLoading(true);
    setStatus(editId ? 'Updating package...' : 'Adding package...');

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('price', String(priceNum));
      fd.append('testsText', tests.join('\n'));
      if (photoFile) fd.append('photo', photoFile);

      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/api/packages/${editId}` : `${API_BASE}/api/packages`;

      const res = await fetch(url, { method, body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || 'Failed to save package');
        setStatus('');
        setLoading(false);
        return;
      }

      resetForm();
      await load();
      setStatus('');
    } catch (err) {
      console.error(err);
      alert('Network error. Is the backend running?');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this package?')) return;
    setStatus('Deleting...');
    const res = await fetch(`${API_BASE}/api/packages/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || 'Delete failed');
      setStatus('');
      return;
    }
    await load();
    setStatus('');
  };

  const startEdit = (p) => {
    setEditId(p._id);
    setForm({
      name: p.name || '',
      price: String(p.price ?? ''),
      testsText: (p.tests || []).join('\n')
    });
    setPhotoFile(null);
    setPhotoPreview(p.photo ? `${API_BASE}${p.photo}` : null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const [focus, setFocus] = useState({ name: false, price: false, tests: false, file: false });

  return (
    <div style={s.page}>
      <div style={s.h2Wrap}>
        <h2 style={s.h2}>Manage Health Packages</h2>
        <span style={s.subtle}>Create, update, and curate your offerings</span>
      </div>

      <div style={s.grid}>
        {/* Form Card */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={s.readyDot} />
              <strong>{editId ? 'Edit Package' : 'Add New Package'}</strong>
            </div>
            {status ? (
              <span style={s.statusWrap}><span style={s.statusDot} />{status}</span>
            ) : (
              <span style={s.subtle}>Ready</span>
            )}
          </div>
          <div style={s.cardBody}>
            <form onSubmit={save}>
              <div style={s.field}>
                <label style={s.label}>Package name</label>
                <input
                  placeholder="e.g., Executive Full Body Checkup"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  onFocus={() => setFocus(f => ({ ...f, name: true }))}
                  onBlur={() => setFocus(f => ({ ...f, name: false }))}
                  required
                  type="text"
                  style={s.input(focus.name)}
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Price (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 12500"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  onFocus={() => setFocus(f => ({ ...f, price: true }))}
                  onBlur={() => setFocus(f => ({ ...f, price: false }))}
                  required
                  style={s.input(focus.price)}
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Medical tests (one per line)</label>
                <textarea
                  value={form.testsText}
                  onChange={e => setForm({ ...form, testsText: e.target.value })}
                  onFocus={() => setFocus(f => ({ ...f, tests: true }))}
                  onBlur={() => setFocus(f => ({ ...f, tests: false }))}
                  style={s.textarea(focus.tests)}
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Package Photo</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFile}
                  onFocus={() => setFocus(f => ({ ...f, file: true }))}
                  onBlur={() => setFocus(f => ({ ...f, file: false }))}
                  style={s.input(focus.file)}
                />
                {photoPreview && (
                  <div style={s.previewWrap}>
                    <img src={photoPreview} alt="preview" style={s.previewImg} />
                  </div>
                )}
              </div>

              <div style={s.btnRow}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...s.button,
                    ...(loading ? { opacity: .6, cursor: 'not-allowed' } : {})
                  }}
                >
                  {editId ? (loading ? 'Updating…' : 'Update Package') : (loading ? 'Adding…' : 'Add Package')}
                </button>
                {editId && (
                  <button type="button" onClick={resetForm} style={s.btnGhost}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Card */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <strong>Packages</strong>
            <span style={s.subtle}>{list.length} total</span>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Photo</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Price</th>
                  <th style={s.th}>Tests</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p._id}>
                    <td style={{ ...s.td, width: 120 }}>
                      {p.photo ? (
                        <img src={`${API_BASE}${p.photo}`} alt={p.name} style={s.photoCellImg} />
                      ) : (
                        <span style={s.subtle}>No photo</span>
                      )}
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{p.name}</td>
                    <td style={s.td}><span style={s.priceChip}>Rs. {Number(p.price ?? 0).toFixed(2)}</span></td>
                    <td style={s.td}>
                      <ul style={s.ulTests}>
                        {(p.tests || []).map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </td>
                    <td style={s.td}>
                      <div style={s.btnRow}>
                        <button onClick={() => startEdit(p)} style={s.btnGhost}>Edit</button>
                        <button onClick={() => del(p._id)} style={s.btnDanger}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan="5" style={s.empty}>No packages yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
