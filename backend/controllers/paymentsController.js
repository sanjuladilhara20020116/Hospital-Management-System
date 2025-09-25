

// controllers/paymentsController.js
const Stripe = require('stripe');
const Appointment = require('../models/Appointment');
const { sendMail } = require('../utils/mailer');

const stripe = process.env.STRIPE_SECRET ? new Stripe(process.env.STRIPE_SECRET) : null;

// Create checkout and tie to appointment
exports.createCheckout = async (req, res) => {
  if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });
  const { appointmentId, successUrl, cancelUrl } = req.body;
  const appt = await Appointment.findById(appointmentId);
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: appt.patientEmail || undefined,
    line_items: [{ price_data: {
      currency: 'lkr',
      product_data: { name: `Doctor Appointment ${appt.date} ${appt.startTime}` },
      unit_amount: appt.priceLkr * 100
    }, quantity: 1 }],
    success_url: `${successUrl}?appointment=${appt._id}`,
    cancel_url: `${cancelUrl}?appointment=${appt._id}`,
    metadata: { appointmentId: String(appt._id) },
  });

  appt.payment = { provider: 'stripe', status: 'created', externalId: session.id };
  await appt.save();

  res.json({ url: session.url });
};

// After success (client redirect), confirm + email
exports.markPaid = async (req, res) => {
  const { appointmentId } = req.body;
  const appt = await Appointment.findById(appointmentId);
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  appt.status = 'Confirmed';
  appt.payment = { ...(appt.payment||{}), status: 'succeeded', paidAt: new Date() };
  await appt.save();

  // Email the patient (uses your existing mailer)
  if (appt.patientEmail) {
    const html = `
      <h3>Appointment Confirmed</h3>
      <p>Ref: <b>${appt.referenceNo}</b></p>
      <p>Date/Time: ${appt.date} ${appt.startTime}</p>
      <p>Queue No: <b>${appt.queueNo}</b></p>
      <p>Amount: LKR ${appt.priceLkr}</p>
    `;
    await sendMail({ to: appt.patientEmail, subject: `Appointment ${appt.referenceNo} Confirmed`, html });
  }
  res.json({ ok: true, appointment: appt });
};
