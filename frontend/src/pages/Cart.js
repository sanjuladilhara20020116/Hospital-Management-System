// src/pages/Cart.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1'; // must match HealthcarePackages + CartButton + MyBookings

export default function Cart() {
  const navigate = useNavigate();
  const hdrs = { 'Content-Type': 'application/json', 'x-user-id': USER_ID };
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState('');

  // Booking form
  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' or 'ONLINE'

  const load = async () => {
    setStatus('Loading cart…');
    const res = await fetch(`${API_BASE}/api/cart`, { headers: hdrs });
    let data;
    try { data = await res.json(); } catch { data = { items: [], total: 0 }; }
    setCart(data || { items: [], total: 0 });
    setStatus('');
  };

  useEffect(() => { load(); }, []);

  const qty = async (itemId, q) => {
    const res = await fetch(`${API_BASE}/api/cart/item/${itemId}`, {
      method: 'PUT',
      headers: hdrs,
      body: JSON.stringify({ quantity: q })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCart(data.cart);
      window.dispatchEvent(new Event('cart:updated'));
    } else {
      alert(data.message || 'Failed to update quantity');
    }
  };

  const removeItem = async (itemId) => {
    const res = await fetch(`${API_BASE}/api/cart/item/${itemId}`, {
      method: 'DELETE',
      headers: hdrs
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCart(data.cart);
      window.dispatchEvent(new Event('cart:updated'));
    } else {
      alert(data.message || 'Failed to remove item');
    }
  };

  const checkout = async () => {
    if (!patientEmail || !appointmentDate) {
      alert('Please enter patient email and select date & time');
      return;
    }
    if (!cart.items || !cart.items.length) {
      alert('Cart is empty');
      return;
    }
    setStatus('Booking...');
    const res = await fetch(`${API_BASE}/api/bookings/checkout`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ patientEmail, patientName, appointmentDate, paymentMethod })
    });
    let data;
    try { data = await res.json(); } catch { data = { message: await res.text() }; }

    if (res.ok) {
      // Show accurate message from server (reflects whether email actually sent)
      setStatus(data.message || 'Booked!');
      // clear UI cart
      setCart({ items: [], total: 0 });
      window.dispatchEvent(new Event('cart:updated'));
      // reset form
      setPatientEmail(''); setPatientName(''); setAppointmentDate(''); setPaymentMethod('COD');
    } else {
      setStatus('');
      alert(data.message || 'Booking failed');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Cart</h2>

      {/* Quick access to user's bookings */}
      <div style={{ margin: '8px 0 16px' }}>
        <button onClick={() => navigate('/my-bookings')}>
          View My Health Packages
        </button>
      </div>

      {status && <div style={{ marginBottom: 10, color: '#555' }}>{status}</div>}

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead><tr><th>Package</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
        <tbody>
          {(cart.items || []).map(it => (
            <tr key={it._id}>
              <td>{it.packageName}</td>
              <td>Rs. {Number(it.unitPrice).toFixed(2)}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={e => qty(it._id, Math.max(1, Number(e.target.value || 1)))}
                  style={{ width: 70 }}
                />
              </td>
              <td>Rs. {Number(it.unitPrice * it.quantity).toFixed(2)}</td>
              <td><button onClick={() => removeItem(it._id)}>Remove</button></td>
            </tr>
          ))}
          {(!cart.items || !cart.items.length) && <tr><td colSpan="5">Cart is empty</td></tr>}
        </tbody>
      </table>

      <div style={{ marginBottom: 16 }}><strong>Total:</strong> Rs. {Number(cart.total || 0).toFixed(2)}</div>

      {/* Booking form */}
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, maxWidth: 520 }}>
        <h3>Schedule & Payment</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            placeholder="Patient name (optional)"
            value={patientName}
            onChange={e => setPatientName(e.target.value)}
          />
          <input
            placeholder="Patient email"
            value={patientEmail}
            onChange={e => setPatientEmail(e.target.value)}
          />
          <input
            type="datetime-local"
            value={appointmentDate}
            onChange={e => setAppointmentDate(e.target.value)}
          />
          <div>
            Payment:&nbsp;
            <label><input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /> Pay at center</label>
            &nbsp;&nbsp;
            <label><input type="radio" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} /> Online (coming soon)</label>
          </div>
          <button onClick={checkout} disabled={!cart.items || !cart.items.length}>Proceed & Book</button>
        </div>
      </div>
    </div>
  );
}
