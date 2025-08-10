// routes/bookingRoutes.js
const express = require('express');
const nodemailer = require('nodemailer');
const Cart = require('../models/Cart');
const PackageBooking = require('../models/PackageBooking');

const router = express.Router();

function getUserId(req) {
  return req.headers['x-user-id'] || null;
}

/** Build Nodemailer transport only if SMTP is configured.
 *  Env supported:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   SMTP_SECURE (true only for port 465)
 *   SMTP_TLS_REJECT_UNAUTHORIZED (set to false for dev behind SSL interception)
 */
function buildTransport() {
  const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
    SMTP_SECURE, SMTP_TLS_REJECT_UNAUTHORIZED
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  const secure = String(SMTP_SECURE || 'false').toLowerCase() === 'true'; // true -> 465
  const rejectUnauthorized = String(SMTP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized } // DEV ONLY: set false if you see "self-signed certificate" locally
  });
}

const transport = buildTransport();

/** Helper: parse datetime-local value "YYYY-MM-DDTHH:mm" (adds :00 seconds) */
function parseAppt(input) {
  if (!input) return null;
  const val = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input) ? `${input}:00` : input;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** POST /api/bookings/checkout
 *  Body: { patientEmail, patientName?, appointmentDate, paymentMethod? }
 *  Header: x-user-id
 */
router.post('/checkout', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ message: 'Missing user id (x-user-id header)' });

    const {
      patientEmail,
      patientName = '',
      appointmentDate,
      paymentMethod = 'COD'
    } = req.body || {};

    if (!patientEmail) return res.status(400).json({ message: 'patientEmail is required' });

    const dt = parseAppt(appointmentDate);
    if (!dt) return res.status(400).json({ message: 'Invalid appointmentDate' });

    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items || !cart.items.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Create booking
    const booking = await PackageBooking.create({
      userId,
      patientEmail,
      patientName,
      items: cart.items.map(i => ({
        packageId: i.packageId,
        packageName: i.packageName,
        unitPrice: i.unitPrice,
        quantity: i.quantity
      })),
      totalAmount: cart.total,
      appointmentDate: dt,
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING',
        transactionId: undefined
      },
      status: 'CONFIRMED'
    });

    // Clear cart
    await Cart.deleteOne({ userId });

    // Optional email
    let emailSent = false;
    const skipEmail = String(process.env.SKIP_EMAIL || '').toLowerCase() === 'true';

    if (!skipEmail && transport) {
      try {
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif">
            <h2>Health Check Booking Confirmed</h2>
            <p>Hi ${patientName || 'Patient'}, your booking has been confirmed.</p>
            <h3>Schedule</h3>
            <p><strong>Date & Time:</strong> ${dt.toLocaleString()}</p>
            <h3>Packages</h3>
            <ul>${booking.items.map(i => `<li>${i.packageName} × ${i.quantity} — Rs. ${i.unitPrice.toFixed(2)}</li>`).join('')}</ul>
            <p><strong>Total:</strong> Rs. ${booking.totalAmount.toFixed(2)}</p>
            <h3>Preparation Instructions</h3>
            <ul>
              <li>Fast 10–12 hours before blood tests (water allowed).</li>
              <li>Bring prior reports and a list of medications.</li>
              <li>Avoid strenuous exercise 24 hours before.</li>
              <li>Arrive 15 minutes early.</li>
            </ul>
            <p>Booking ID: <strong>${booking._id}</strong></p>
            <p>Thank you,<br/>Hospital Diagnostics</p>
          </div>
        `;

        await transport.sendMail({
          from: process.env.FROM_EMAIL || process.env.SMTP_USER, // use your Gmail to reduce spam issues
          to: patientEmail,
          subject: 'Your Health Check Booking & Instructions',
          html
        });

        emailSent = true;
      } catch (mailErr) {
        console.error('Email send failed:', mailErr?.message || mailErr);
      }
    }

    const message = emailSent
      ? 'Booked successfully. A confirmation email has been sent.'
      : 'Booked successfully. Email could not be sent at this time.';

    return res.status(201).json({ message, booking, emailSent });
  } catch (err) {
    console.error('Checkout failed:', err);
    return res.status(500).json({ message: 'Checkout failed: ' + (err.message || 'unknown') });
  }
});

/** GET /api/bookings/mine
 *  Header: x-user-id
 *  Returns list of bookings for the current user (newest first)
 */
router.get('/mine', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ message: 'Missing user id (x-user-id header)' });

    const list = await PackageBooking.find({ userId }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (e) {
    console.error('Load my bookings failed:', e);
    return res.status(500).json({ message: 'Failed to load bookings' });
  }
});

module.exports = router;
