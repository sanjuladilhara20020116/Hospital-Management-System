

// controllers/bookingController.js
const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const { toSlots } = require('../utils/slots');
const generateReferenceNo = require('../utils/generateReferenceNo');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { sendMail } = require('../utils/mailer');

exports.book = async (req, res) => {
  try {
    const { doctorId, patientId, date, startTime, name, phone, email, priceLkr = 2500 } = req.body;
    const plan = await DoctorAvailability.findOne({ doctorId, date });
    if (!plan) return res.status(404).json({ message: 'Doctor not available on selected date' });

    // Check slot exists inside plan
    const slot = toSlots(plan).find(s => s.start === startTime);
    if (!slot) return res.status(400).json({ message: 'Invalid time for this date' });

    // Capacity check
    const bookedCount = await Appointment.countDocuments({
      doctorId, date, status: { $in: ['Pending','AwaitingPayment','Confirmed'] }
    });
    if (bookedCount >= plan.patientLimit)
      return res.status(409).json({ message: 'Booking limit exceeded. Please select another date.' });

    const referenceNo = await generateReferenceNo();
    const appt = await Appointment.create({
      referenceNo, doctorId, patientId, date,
      startTime: slot.start, endTime: slot.end,
      queueNo: bookedCount + 1,
      status: 'AwaitingPayment',
      priceLkr,
      patientName: name, patientPhone: phone, patientEmail: email
    });
    res.status(201).json({ ok: true, appointment: appt });
  } catch (e) {
    console.error('book error', e);
    res.status(500).json({ message: 'Booking failed' });
  }
};

// Cancel -> free capacity (by changing status)
exports.cancel = async (req, res) => {
  const id = req.params.id;
  const appt = await Appointment.findById(id);
  if (!appt) return res.status(404).json({ message: 'Not found' });
  if (appt.status === 'Cancelled') return res.json({ ok: true, message: 'Already cancelled' });
  appt.status = 'Cancelled';
  await appt.save();
  res.json({ ok: true });
};

// Receipt PDF
exports.receiptPdf = async (req, res) => {
  const id = req.params.id;
  const appt = await Appointment.findById(id);
  if (!appt) return res.status(404).json({ message: 'Not found' });

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receipt_${appt.referenceNo}.pdf"`);
  doc.fontSize(18).text('Appointment Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12)
    .text(`Reference: ${appt.referenceNo}`)
    .text(`Doctor: ${appt.doctorId}`)
    .text(`Patient: ${appt.patientId}`)
    .text(`Date: ${appt.date}  Time: ${appt.startTime} - ${appt.endTime}`)
    .text(`Queue No: ${appt.queueNo}`)
    .text(`Amount: LKR ${appt.priceLkr}`)
    .text(`Status: ${appt.status}`);
  doc.end();
  doc.pipe(res);
};
