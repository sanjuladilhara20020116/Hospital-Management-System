
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/User');
const genRef = require('../utils/generateApptRef');
const { stepSlots, toMinutes, rangesOverlap } = require('../utils/slotUtils');

const CUT_OFF_MIN = 15; // stop booking within 15 min of session start

function dayKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  return ['sun','mon','tue','wed','thu','fri','sat'][d.getUTCDay()];
}

function withinRanges(hhmm, ranges) {
  const m = toMinutes(hhmm);
  for (const r of ranges) {
    const s = toMinutes(r.start);
    const e = toMinutes(r.end);
    if (s <= m && m < e) return true;
  }
  return false;
}

async function getDoctorAndAvailability(doctorId) {
  const doctor = await User.findOne({ userId: doctorId, role: 'Doctor' }).select('_id userId firstName lastName');
  if (!doctor) throw new Error('Doctor not found');
  let avail = await DoctorAvailability.findOne({ doctorRef: doctor._id });
  if (!avail) {
    avail = await DoctorAvailability.create({
      doctorRef: doctor._id,
      durationMinutes: 15,
      sessionCapacity: 30,
      weeklyHours: { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] }
    });
  }
  return { doctor, avail };
}

// Build "sessions" for a day from availability ranges
async function computeSessions(doctorRef, dateStr, avail) {
  const key = dayKey(dateStr);
  const ranges = avail.weeklyHours[key] || [];
  if (!ranges.length) return [];

  // fetch existing appts on that date for counts
  const sameDay = await Appointment.find({ doctorRef, date: dateStr, status: { $ne: 'Cancelled' } })
    .select('startTime');

  const taken = new Set(sameDay.map(a => a.startTime));
  const nowUtc = new Date();

  return ranges.map(r => {
    const slots = stepSlots([r], avail.durationMinutes);
    const active = slots.filter(s => taken.has(s.startTime)).length;
    const remaining = Math.max(0, avail.sessionCapacity - active);
    const sessionStartMin = toMinutes(r.start);

    // booking cut-off
    let bookable = true;
    const sessionStartUtc = new Date(`${dateStr}T${r.start}:00.000Z`);
    if ((sessionStartUtc - nowUtc) / 60000 < CUT_OFF_MIN) bookable = false;

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

// PUBLIC: Sessions summary for a doctor&date (capacity & active counts)
exports.getSessions = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const { doctor, avail } = await getDoctorAndAvailability(doctorId);
    const sessions = await computeSessions(doctor._id, date, avail);
    res.json({ doctor: { id: doctor.userId, name: `${doctor.firstName} ${doctor.lastName}` }, date, sessions });
  } catch (e) {
    console.error('getSessions error:', e);
    res.status(500).json({ message: e.message || 'Failed to load sessions' });
  }
};

// PUBLIC: Free slots for a doctor&date (respect capacity & taken)
exports.getSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const { doctor, avail } = await getDoctorAndAvailability(doctorId);
    const key = dayKey(date);
    const ranges = avail.weeklyHours[key] || [];
    const slots = stepSlots(ranges, avail.durationMinutes);

    // remove past/cut-off slots
    const nowUtc = new Date();
    const filteredByTime = slots.filter(s => {
      const slotStart = new Date(`${date}T${s.startTime}:00.000Z`);
      return (slotStart - nowUtc) / 60000 >= CUT_OFF_MIN;
    });

    // remove breaks/blocks (date-specific)
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

    // take out already booked slots
    const taken = new Set(
      (await Appointment.find({ doctorRef: doctor._id, date, status: { $ne: 'Cancelled' } }).select('startTime'))
        .map(a => a.startTime)
    );

    const free = freeTimeSlots.filter(s => !taken.has(s.startTime));

    res.json({
      date,
      durationMinutes: avail.durationMinutes,
      capacityPerSession: avail.sessionCapacity,
      slots: free // [{startTime, endTime}]
    });
  } catch (e) {
    console.error('getSlots error:', e);
    res.status(500).json({ message: e.message || 'Failed to load slots' });
  }
};

// BOOK (Patient)
exports.create = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const actor = req.actorPatient; // from actorPatient middleware
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });

    const { patientId, doctorId, date, startTime, name, phone, nic, passport, email, reason = '' } = req.body;
    // Resolve patient + doctor
    const patient = await User.findOne({ userId: patientId, role: 'Patient' }).select('_id userId');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const doctor  = await User.findOne({ userId: doctorId, role: 'Doctor' }).select('_id userId');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Load availability
    const avail = await DoctorAvailability.findOne({ doctorRef: doctor._id });
    if (!avail) return res.status(409).json({ message: 'Doctor availability not configured' });

    // Validate slot belongs to working ranges
    const key = dayKey(date);
    const ranges = (avail.weeklyHours[key] || []);
    const inWorking = ranges.some(r => startTime >= r.start && startTime < r.end);
    if (!inWorking) return res.status(400).json({ message: 'Selected time is outside doctor working hours' });

    // Cut-off guard
    const now = new Date();
    const slotStartUtc = new Date(`${date}T${startTime}:00.000Z`);
    if ((slotStartUtc - now) / 60000 < 15) return res.status(400).json({ message: 'Booking closed for this time' });

    const endTimeMin = toMinutes(startTime) + avail.durationMinutes;
    const endTime = `${String(Math.floor(endTimeMin/60)).padStart(2,'0')}:${String(endTimeMin%60).padStart(2,'0')}`;

    // Count active in the session window to compute queue (based on that range)
    const range = ranges.find(r => startTime >= r.start && startTime < r.end);
    const sessionAppts = await Appointment.find({
      doctorRef: doctor._id, date,
      startTime: { $gte: range.start, $lt: range.end },
      status: { $ne: 'Cancelled' }
    }).select('_id startTime').sort({ startTime: 1 });

    if (sessionAppts.length >= avail.sessionCapacity) {
      return res.status(409).json({ message: 'Session is full' });
    }

    // TRANSACTION: insert with unique (doctorRef,date,startTime)
    await session.withTransaction(async () => {
      const referenceNo = genRef();

      const appt = await Appointment.create([{
        referenceNo,
        patientRef: patient._id,
        patientId: patient.userId,
        doctorRef: doctor._id,
        doctorId: doctor.userId,
        date,
        startTime,
        endTime,
        status: 'Booked',
        queueNo: sessionAppts.length + 1,
        reason: reason || ''
      }], { session });

      res.status(201).json({ message: 'Appointment booked', appointment: appt[0] });
    });

  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Slot already taken. Please pick another.' });
    }
    console.error('create appointment error:', e);
    res.status(500).json({ message: 'Server error creating appointment' });
  } finally {
    session.endSession();
  }
};

// LIST for Patient
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

// LIST for Doctor
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

// STATUS change (Doctor)
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    const allowed = new Set(['Booked','CheckedIn','Completed','Cancelled','NoShow']);
    if (!allowed.has(status)) return res.status(400).json({ message: 'Invalid status' });

    // Simple state rules
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

// RESCHEDULE (Patient or Doctor)
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
    if ((slotStartUtc - now) / 60000 < 15) return res.status(400).json({ message: 'Booking closed for this time' });

    const endTimeMin = toMinutes(startTime) + avail.durationMinutes;
    const endTime = `${String(Math.floor(endTimeMin/60)).padStart(2,'0')}:${String(endTimeMin%60).padStart(2,'0')}`;

    const range = ranges.find(r => startTime >= r.start && startTime < r.end);
    const sessionAppts = await Appointment.find({
      doctorRef: appt.doctorRef, date,
      startTime: { $gte: range.start, $lt: range.end },
      status: { $ne: 'Cancelled' }
    }).select('_id startTime').sort({ startTime: 1 });

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

// Doctor Availability CRUD (basic: get/set)
exports.getAvailability = async (req, res) => {
  try {
    const actor = req.actorDoctor;
    const doc = await DoctorAvailability.findOne({ doctorRef: actor._id });
    res.json(doc || {});
  } catch (e) {
    res.status(500).json({ message: 'Failed to load availability' });
  }
};

exports.setAvailability = async (req, res) => {
  try {
    const actor = req.actorDoctor;
    const { durationMinutes, sessionCapacity, weeklyHours, breaks, blocks, timezone } = req.body;
    const up = await DoctorAvailability.findOneAndUpdate(
      { doctorRef: actor._id },
      { $set: { durationMinutes, sessionCapacity, weeklyHours, breaks, blocks, timezone } },
      { new: true, upsert: true }
    );
    res.json({ message: 'Availability saved', availability: up });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save availability' });
  }
};
