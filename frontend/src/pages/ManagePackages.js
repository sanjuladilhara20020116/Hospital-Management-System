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
      if (photoFile) fd.append('photo', photoFile); // send file

      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/api/packages/${editId}` : `${API_BASE}/api/packages`;

      // IMPORTANT: do not set Content-Type when sending FormData
      const res = await fetch(url, { method, body: fd /*, headers: { 'x-role': 'manager' } */ });
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
    const res = await fetch(`${API_BASE}/api/packages/${id}`, { method: 'DELETE' /*, headers: { 'x-role': 'manager' } */ });
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

  return (
    <div style={{ padding: 20 }}>
      <h2>Manage Health Packages</h2>

      <form onSubmit={save} style={{ display: 'grid', gap: 8, maxWidth: 520, marginBottom: 20 }}>
        <input
          placeholder="Package name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Price (Rs.)"
          value={form.price}
          onChange={e => setForm({ ...form, price: e.target.value })}
          required
        />
        <textarea
          rows={6}
          placeholder="One medical test per line"
          value={form.testsText}
          onChange={e => setForm({ ...form, testsText: e.target.value })}
        />

        <div>
          <label><strong>Package Photo</strong></label><br />
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} />
          {photoPreview && (
            <div style={{ marginTop: 8 }}>
              <img
                src={photoPreview}
                alt="preview"
                style={{ maxWidth: 220, height: 'auto', borderRadius: 6, border: '1px solid #ddd' }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>
            {editId ? (loading ? 'Updating...' : 'Update Package') : (loading ? 'Adding...' : 'Add Package')}
          </button>
          {editId && <button type="button" onClick={resetForm}>Cancel</button>}
        </div>
        {status && <div style={{ color: '#555' }}>{status}</div>}
      </form>

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Photo</th><th>Name</th><th>Price</th><th>Tests</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p._id}>
              <td style={{ width: 120 }}>
                {p.photo ? (
                  <img
                    src={`${API_BASE}${p.photo}`}
                    alt={p.name}
                    style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 6 }}
                  />
                ) : <span style={{ color: '#999' }}>No photo</span>}
              </td>
              <td>{p.name}</td>
              <td>Rs. {Number(p.price ?? 0).toFixed(2)}</td>
              <td><ul>{(p.tests || []).map((t, i) => <li key={i}>{t}</li>)}</ul></td>
              <td>
                <button onClick={() => startEdit(p)}>Edit</button>
                <button onClick={() => del(p._id)} style={{ marginLeft: 8 }}>Delete</button>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan="5">No packages yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
