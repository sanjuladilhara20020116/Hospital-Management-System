// src/pages/appointments/PaymentSuccess.jsx
import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../../api';

export default function PaymentSuccess() {
  const [sp] = useSearchParams();
  const id = sp.get('appointment');

  useEffect(() => {
    if (id) API.post('/api/appointments/pay/confirm', { appointmentId: id });
  }, [id]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Payment Successful</h2>
      <p>Your appointment has been confirmed.</p>
      {id && <a href={`http://localhost:5000/api/appointments/${id}/receipt.pdf`} target="_blank" rel="noreferrer">Download Receipt (PDF)</a>}
      <div><Link to="/dashboard">Go to My Appointments</Link></div>
    </div>
  );
}

