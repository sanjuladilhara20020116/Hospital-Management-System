// controllers/appointmentController.js
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/User');
const genRef = require('../utils/generateApptRef');
const { stepSlots, toMinutes, rangesOverlap } = require('../utils/slotUtils');

const CUT_OFF_MIN = 15; // minutes

function dayKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  return ['sun','mon','tue','wed','thu','fri','sat'][d.getUTCDay()];
}

/* ------------------------------------------------------------------ */
/* Helpers used by sessions/slots so we consistently EXCLUDE intents  */
/* ------------------------------------------------------------------ */

async function computeSessions(doctorRef, dateStr, avail) {
  const key = dayKey(dateStr);
  const ranges = avail.weeklyHours[key] || [];
  if (!ranges.length) return [];

  // Count only paid/real bookings (NOT 'AwaitingPayment')
  const sameDay = await Appointment.find({
    doctorRef, date: dateStr, status: { $in: ['Booked', 'Confirmed'] }
  }).select('startTime');

  const taken = new Set(sameDay.map(a => a.startTime));
  const nowUtc = new Date();

  return ranges.map(r => {
    const slots = stepSlots([r], avail.durationMinutes);
    const active = slots.filter(s => taken.has(s.startTime)).length;
    const remaining = Math.max(0, avail.sessionCapacity - active);

    // cut-off label
    const sessionStartUtc = new Date(`${dateStr}T${r.start}:00.000Z`);
    const bookable = ((sessionStartUtc - nowUtc) / 60000) >= CUT_OFF_MIN;

    const label = !bookable ? 'CLOSED' : (remaining > 0 ? 'AVAILABLE' : 'FULL');

    return {
      range: r,
      activeAppointments: active,
      capacity: avail.sessionCapacity,
      remaining,
      statusLabel: label
    };
  });
}

/* ---------------------- Public discovery endpoints ---------------------- */

exports.getSessions = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const doctor = await User.findOne({ userId: doctorId, role: 'Doctor' })
      .select('_id userId firstName lastName');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    let avail = await DoctorAvailability.findOne({ doctorRef: doctor._id });
    if (!avail) {
      avail = await DoctorAvailability.create({
        doctorRef: doctor._id,
        durationMinutes: 15,
        sessionCapacity: 30,
        weeklyHours: { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] }
      });
    }

    const sessions = await computeSessions(doctor._id, date, avail);
    res.json({
      doctor: { id: doctor.userId, name: `${doctor.firstName} ${doctor.lastName}` },
      date,
      sessions
    });
  } catch (e) {
    console.error('getSessions error:', e);
    res.status(500).json({ message: e.message || 'Failed to load sessions' });
  }
};

exports.getSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const doctor = await User.findOne({ userId: doctorId, role: 'Doctor' })
      .select('_id userId');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const avail = await DoctorAvailability.findOne({ doctorRef: doctor._id });
    if (!avail) return res.json({ date, durationMinutes: 15, capacityPerSession: 0, slots: [] });

    const key = dayKey(date);
    const ranges = avail.weeklyHours[key] || [];
    const slots = stepSlots(ranges, avail.durationMinutes);

    // cut-off
    const nowUtc = new Date();
    const filteredByTime = slots.filter(s => {
      const slotStart = new Date(`${date}T${s.startTime}:00.000Z`);
      return (slotStart - nowUtc) / 60000 >= CUT_OFF_MIN;
    });

    // remove date-specific blocks/breaks
    const dateStart = new Date(`${date}T00:00:00.000Z`);
    const dateEnd   = new Date(`${date}T23:59:59.999Z`);
    const blocked = [...(avail.breaks||[]), ...(avail.blocks||[])]
      .filter(b => !(b.end < dateStart || b.start > dateEnd))
      .map(b => ({ start: b.start, end: b.end }));

    const freeTimeSlots = filteredByTime.filter(s => {
      const sUtc = new Date(`${date}T${s.startTime}:00.000Z`);
      const eUtc = new Date(`${date}T${s.endTime}:00.000Z`);
      return !blocked.some(b => rangesOverlap(sUtc.getTime(), eUtc.getTime(), b.start.getTime(), b.end.getTime()));
    });

    // take out already booked (exclude intents)
    const taken = new Set(
      (await Appointment.find({
        doctorRef: doctor._id, date,
        status: { $in: ['Booked', 'Confirmed'] }
      }).select('startTime')).map(a => a.startTime)
    );

    const free = freeTimeSlots.filter(s => !taken.has(s.startTime));
    res.json({
      date,
      durationMinutes: avail.durationMinutes,
      capacityPerSession: avail.sessionCapacity,
      slots: free
    });
  } catch (e) {
    console.error('getSlots error:', e);
    res.status(500).json({ message: e.message || 'Failed to load slots' });
  }
};

/* --------------------- Reserve → Pay → Confirm flow --------------------- */

// 1) Create booking INTENT (AwaitingPayment) — DOES NOT affect counts
exports.createIntent = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { patientId, doctorId, date, startTime, reason = '' } = req.body;

    const patient = await User.findOne({ userId: patientId, role: 'Patient' }).select('_id userId');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const doctor  = await User.findOne({ userId: doctorId, role: 'Doctor' }).select('_id userId firstName lastName');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const avail = await DoctorAvailability.findOne({ doctorRef: doctor._id });
    if (!avail) return res.status(409).json({ message: 'Doctor availability not configured' });

    const key = dayKey(date);
    const ranges = (avail.weeklyHours[key] || []);
    const inWorking = ranges.some(r => startTime >= r.start && startTime < r.end);
    if (!inWorking) return res.status(400).json({ message: 'Selected time is outside doctor working hours' });

    // cut-off
    const now = new Date();
    const slotStartUtc = new Date(`${date}T${startTime}:00.000Z`);
    if ((slotStartUtc - now) / 60000 < CUT_OFF_MIN) {
      return res.status(400).json({ message: 'Booking closed for this time' });
    }

    // capacity check using ONLY paid bookings
    const range = ranges.find(r => startTime >= r.start && startTime < r.end);
    const paidAppts = await Appointment.find({
      doctorRef: doctor._id, date,
      startTime: { $gte: range.start, $lt: range.end },
      status: { $in: ['Booked','Confirmed'] }
    }).select('_id');

    if (paidAppts.length >= avail.sessionCapacity) {
      return res.status(409).json({ message: 'Session is full' });
    }

    const endTimeMin = toMinutes(startTime) + avail.durationMinutes;
    const endTime = `${String(Math.floor(endTimeMin/60)).padStart(2,'0')}:${String(endTimeMin%60).padStart(2,'0')}`;
    const referenceNo = genRef();

    let doc;
    await session.withTransaction(async () => {
      const created = await Appointment.create([{
        referenceNo,
        patientRef: patient._id,
        patientId: patient.userId,
        doctorRef: doctor._id,
        doctorId: doctor.userId,
        date,
        startTime,
        endTime,
        status: 'AwaitingPayment',   // key
        queueNo: 0,                  // assigned on payment success
        reason
      }], { session });
      doc = created[0];
    });

    res.status(201).json({
      message: 'Intent created',
      appointment: {
        _id: doc._id,
        referenceNo: doc.referenceNo,
        doctor: { id: doctor.userId, name: `${doctor.firstName} ${doctor.lastName}` },
        date, startTime, endTime
      }
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Slot already reserved. Please pick another.' });
    }
    console.error('createIntent error:', e);
    res.status(500).json({ message: 'Server error creating intent' });
  } finally {
    session.endSession();
  }
};

// 2) Confirm payment — assign queue and mark Confirmed
exports.pay = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const { nameOnCard, cardNumber, exp, cvc } = req.body;

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.status !== 'AwaitingPayment') {
      return res.status(409).json({ message: `Cannot pay for status ${appt.status}` });
    }

    // MOCK payment validation
    const ok = String(cardNumber || '').trim().length >= 12;
    if (!ok) {
      appt.status = 'Cancelled';
      await appt.save();
      return res.status(402).json({ message: 'Payment failed' });
    }

    const avail = await DoctorAvailability.findOne({ doctorRef: appt.doctorRef });
    const key = dayKey(appt.date);
    const range = (avail.weeklyHours[key] || [])
      .find(r => appt.startTime >= r.start && appt.startTime < r.end);

    const paidAppts = await Appointment.find({
      doctorRef: appt.doctorRef,
      date: appt.date,
      startTime: { $gte: range.start, $lt: range.end },
      status: { $in: ['Booked','Confirmed'] }
    }).select('_id').sort({ startTime: 1 });

    await session.withTransaction(async () => {
      appt.status = 'Confirmed';
      appt.queueNo = paidAppts.length + 1;
      appt.payment = {
        provider: 'mock',
        status: 'succeeded',
        externalId: `MOCK-${appt.referenceNo}`,
        paidAt: new Date(),
        cardLast4: String(cardNumber).slice(-4)
      };
      await appt.save({ session });
    });

    res.json({ message: 'Payment success', appointment: appt });
  } catch (e) {
    console.error('pay error:', e);
    res.status(500).json({ message: 'Server error confirming payment' });
  } finally {
    session.endSession();
  }
};

/* ----------------------------- Lists & ops ------------------------------ */

exports.listForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, from, to, doctorId } = req.query;
    const p = await User.findOne({ userId: patientId, role: 'Patient' }).select('_id');
    if (!p) return res.status(404).json({ message: 'Patient not found' });

    const filter = { patientRef: p._id };
    if (status) filter.status = status;
    if (doctorId) filter.doctorId = doctorId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }

    const items = await Appointment.find(filter).sort({ date: 1, startTime: 1 });
    res.json({ items });
  } catch (e) {
    console.error('listForPatient error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listForDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, from, to, patientId } = req.query;
    const d = await User.findOne({ userId: doctorId, role: 'Doctor' }).select('_id');
    if (!d) return res.status(404).json({ message: 'Doctor not found' });

    const filter = { doctorRef: d._id };
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }

    const items = await Appointment.find(filter).sort({ date: 1, startTime: 1 });
    res.json({ items });
  } catch (e) {
    console.error('listForDoctor error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const allowed = new Set(['Booked','CheckedIn','Completed','Cancelled','NoShow','Confirmed']);
    if (!allowed.has(status)) return res.status(400).json({ message: 'Invalid status' });

    if (appt.status === 'Completed') return res.status(409).json({ message: 'Already completed' });
    if (appt.status === 'Cancelled') return res.status(409).json({ message: 'Already cancelled' });

    appt.status = status;
    await appt.save();
    res.json({ message: 'Status updated', appointment: appt });
  } catch (e) {
    console.error('changeStatus error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reschedule = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const { date, startTime } = req.body;

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const avail = await DoctorAvailability.findOne({ doctorRef: appt.doctorRef });
    if (!avail) return res.status(409).json({ message: 'Doctor availability not configured' });

    const key = dayKey(date);
    const ranges = (avail.weeklyHours[key] || []);
    const inWorking = ranges.some(r => startTime >= r.start && startTime < r.end);
    if (!inWorking) return res.status(400).json({ message: 'Selected time is outside doctor working hours' });

    const now = new Date();
    const slotStartUtc = new Date(`${date}T${startTime}:00.000Z`);
    if ((slotStartUtc - now) / 60000 < CUT_OFF_MIN) return res.status(400).json({ message: 'Booking closed for this time' });

    const endTimeMin = toMinutes(startTime) + avail.durationMinutes;
    const endTime = `${String(Math.floor(endTimeMin/60)).padStart(2,'0')}:${String(endTimeMin%60).padStart(2,'0')}`;

    const range = ranges.find(r => startTime >= r.start && startTime < r.end);
    const sessionAppts = await Appointment.find({
      doctorRef: appt.doctorRef, date,
      startTime: { $gte: range.start, $lt: range.end },
      status: { $in: ['Booked','Confirmed'] }
    }).select('_id').sort({ startTime: 1 });

    if (sessionAppts.length >= avail.sessionCapacity) {
      return res.status(409).json({ message: 'Session is full' });
    }

    await session.withTransaction(async () => {
      appt.date = date;
      appt.startTime = startTime;
      appt.endTime = endTime;
      appt.status = 'Booked';
      appt.queueNo = sessionAppts.length + 1;
      await appt.save({ session });
      res.json({ message: 'Rescheduled', appointment: appt });
    });

  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Slot already taken. Please pick another.' });
    }
    console.error('reschedule error:', e);
    res.status(500).json({ message: 'Server error' });
  } finally {
    session.endSession();
  }
};

/* ----------------------- Doctor availability (me) ----------------------- */

exports.getAvailability = async (req, res) => {
  try {
    const actor = req.actorDoctor || {}; // if you have middleware
    const docRef = actor._id || req.query.doctorRef;
    const doc = await DoctorAvailability.findOne({ doctorRef: docRef });
    res.json(doc || {});
  } catch (e) {
    res.status(500).json({ message: 'Failed to load availability' });
  }
};

exports.setAvailability = async (req, res) => {
  try {
    const actor = req.actorDoctor || {};
    const docRef = actor._id || req.body.doctorRef;
    const { durationMinutes, sessionCapacity, weeklyHours, breaks, blocks, timezone } = req.body;
    const up = await DoctorAvailability.findOneAndUpdate(
      { doctorRef: docRef },
      { $set: { durationMinutes, sessionCapacity, weeklyHours, breaks, blocks, timezone } },
      { new: true, upsert: true }
    );
    res.json({ message: 'Availability saved', availability: up });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save availability' });
  }
};
