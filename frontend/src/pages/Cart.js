// src/pages/Cart.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1'; // keep consistent with other pages

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

  // Card fields (client-side only)
  const [cardBrand, setCardBrand] = useState('VISA'); // VISA, MASTERCARD, AMEX
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState(''); // MM/YY
  const [cardCvv, setCardCvv] = useState('');

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

  // --- Card helpers (client-side validation) ---
  const onlyDigits = (s) => (s || '').replace(/\D/g, '');
  const luhn = (num) => {
    const s = onlyDigits(num);
    let sum = 0, alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let n = parseInt(s[i], 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return s.length >= 12 && (sum % 10 === 0);
  };
  const parseExp = (mmYY) => {
    const m = (mmYY || '').trim();
    const m2 = m.includes('/') ? m : (m.length === 4 ? `${m.slice(0,2)}/${m.slice(2)}` : m);
    const match = /^(\d{2})\/(\d{2})$/.test(m2) ? m2.match(/^(\d{2})\/(\d{2})$/) : null;
    if (!match) return null;
    const mm = parseInt(match[1], 10), yy = parseInt(`20${match[2]}`, 10);
    if (mm < 1 || mm > 12) return null;
    const expDate = new Date(yy, mm, 0, 23, 59, 59);
    const now = new Date();
    if (expDate < now) return null;
    return { expMonth: mm, expYear: yy };
  };
  const cvvLenByBrand = (brand) => (brand === 'AMEX' ? 4 : 3);

  const validateCard = () => {
    if (!cardName.trim()) { alert('Card holder name is required'); return false; }
    if (!luhn(cardNumber)) { alert('Invalid card number'); return false; }
    const exp = parseExp(cardExp);
    if (!exp) { alert('Invalid expiry (use MM/YY)'); return false; }
    if (!/^\d+$/.test(cardCvv) || cardCvv.length !== cvvLenByBrand(cardBrand)) {
      alert(`Invalid CVV (must be ${cvvLenByBrand(cardBrand)} digits)`); return false;
    }
    return true;
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

    // If online, validate card on the client and only send safe fields
    let cardPayload = undefined;
    if (paymentMethod === 'ONLINE') {
      if (!validateCard()) return;
      const exp = parseExp(cardExp);
      cardPayload = {
        brand: cardBrand,
        holder: cardName.trim(),
        last4: onlyDigits(cardNumber).slice(-4),
        expMonth: exp.expMonth,
        expYear: exp.expYear
      };
      // DO NOT send number or CVV to our server in this demo
    }

    setStatus('Booking...');
    const res = await fetch(`${API_BASE}/api/bookings/checkout`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ patientEmail, patientName, appointmentDate, paymentMethod, card: cardPayload })
    });
    let data;
    try { data = await res.json(); } catch { data = { message: await res.text() }; }

    if (res.ok) {
      setStatus(data.message || 'Booked!');
      setCart({ items: [], total: 0 });
      window.dispatchEvent(new Event('cart:updated'));
      // reset form
      setPatientEmail(''); setPatientName(''); setAppointmentDate(''); setPaymentMethod('COD');
      setCardBrand('VISA'); setCardName(''); setCardNumber(''); setCardExp(''); setCardCvv('');
    } else {
      setStatus('');
      alert(data.message || 'Booking failed');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Cart</h2>

      <div style={{ margin: '8px 0 16px' }}>
        <button onClick={() => navigate('/my-bookings')}>View My Health Packages</button>
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

          {/* Payment choice */}
          <div>
            Payment:&nbsp;
            <label><input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /> Pay at center</label>
            &nbsp;&nbsp;
            <label><input type="radio" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} /> Online (card)</label>
          </div>

          {/* Card fields when online */}
          {paymentMethod === 'ONLINE' && (
            <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 12, display: 'grid', gap: 8 }}>
              <div>
                <label><strong>Card type</strong>&nbsp;</label>
                <select value={cardBrand} onChange={e => setCardBrand(e.target.value)}>
                  <option value="VISA">Visa</option>
                  <option value="MASTERCARD">Mastercard</option>
                  <option value="AMEX">American Express</option>
                </select>
              </div>
              <input
                placeholder="Name on card"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
              />
              <input
                placeholder="Card number"
                inputMode="numeric"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value.replace(/[^\d ]+/g, ''))}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="MM/YY"
                  value={cardExp}
                  onChange={e => setCardExp(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))}
                  style={{ flex: 1 }}
                />
                <input
                  placeholder={cardBrand === 'AMEX' ? 'CVV (4)' : 'CVV (3)'}
                  inputMode="numeric"
                  value={cardCvv}
                  onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, cvvLenByBrand(cardBrand)))}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#777' }}>
                We do not store your full card number or CVV.
              </div>
            </div>
          )}

          <button onClick={checkout} disabled={!cart.items || !cart.items.length}>Proceed & Book</button>
        </div>
      </div>
    </div>
  );
}
