const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/User');
const genRef = require('../utils/generateApptRef');
const { stepSlots, toMinutes, rangesOverlap } = require('../utils/slotUtils');
const emailController = require('./emailController');

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

// PATCH: Edit appointment (reschedule time only)
exports.editAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime } = req.body;
    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    // Only allow changing startTime (and recalculate endTime)
    if (!startTime) return res.status(400).json({ message: 'Missing startTime' });
    appointment.startTime = startTime;
    // Recalculate endTime based on durationMinutes
    const avail = await DoctorAvailability.findOne({ doctorRef: appointment.doctorRef });
    if (!avail) return res.status(409).json({ message: 'Doctor availability not configured' });
    const endTimeMin = toMinutes(startTime) + avail.durationMinutes;
    appointment.endTime = `${String(Math.floor(endTimeMin/60)).padStart(2,'0')}:${String(endTimeMin%60).padStart(2,'0')}`;
    await appointment.save();
    res.json({ message: 'Appointment updated', appointment });
  } catch (e) {
    console.error('editAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET: Slot duration for a doctor on a given date (doctorId as query param to support slashes)
exports.getSlotDuration = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId) return res.status(400).json({ message: 'Missing doctorId' });
    const { doctor, avail } = await getDoctorAndAvailability(doctorId);
    res.json({ durationMinutes: avail.durationMinutes, date, doctorId: doctor.userId });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get slot duration' });
  }
};

// DELETE: Delete a specific appointment by id (Patient)
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    // Optionally, check if the actorPatient owns this appointment
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    // If you want to restrict to only the patient who owns the appointment:
    if (req.actorPatient && String(appt.patientId) !== String(req.actorPatient.userId)) {
      return res.status(403).json({ message: 'Forbidden: Not your appointment' });
    }
    await Appointment.findByIdAndDelete(id);
    res.json({ message: 'Appointment deleted' });
  } catch (e) {
    console.error('deleteAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};


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

    const { patientId, doctorId, date, startTime, name, phone, nic, passport, email, reason, paymentMethod, priceLkr } = req.body;
    // Resolve patient + doctor
  const patient = await User.findOne({ userId: patientId, role: 'Patient' }).select('_id userId');
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  // Fetch doctor with name fields
  const doctor  = await User.findOne({ userId: doctorId, role: 'Doctor' }).select('_id userId firstName lastName');
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
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        date,
        startTime,
        endTime,
        status: 'Booked',
        paymentMethod: paymentMethod || '',
        priceLkr: priceLkr || 0,
        queueNo: sessionAppts.length + 1,
        reason: reason || '',
        patientName: name || '',
        patientPhone: phone || '',
        patientEmail: email || '',
        patientNIC: nic || '',
        patientPassport: passport || ''
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
    const { patientId, status, from, to, doctorId } = req.query;
    if (!patientId) return res.status(400).json({ message: 'Missing patientId' });
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

// GET: Doctor's current appointments for a specific date and time range
exports.getDoctorAppointments = async (req, res) => {
  console.log('🚀 getDoctorAppointments function called!');
  try {
    const { doctorId, date, startTime, endTime } = req.query;

    // Add detailed logging for debugging
    console.log('=== getDoctorAppointments Debug ===');
    console.log('Full req.query:', req.query);
    console.log('Extracted doctorId:', doctorId);
    console.log('Extracted date:', date);
    console.log('Type of doctorId:', typeof doctorId);
    console.log('doctorId length:', doctorId ? doctorId.length : 'undefined');

    // Validate required parameters
    if (!doctorId) {
      console.log('ERROR: Doctor ID is missing from request');
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.log('ERROR: Invalid date format');
      return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) is required' });
    }

    console.log('About to search for doctor with userId:', doctorId);

    // Get doctor and validate
    const doctor = await User.findOne({ userId: doctorId, role: 'Doctor' })
      .select('_id userId firstName lastName specialty');
    
    console.log('Doctor query result:', doctor);

    if (!doctor) {
      console.log('ERROR: No doctor found with userId:', doctorId);
      // Let's also search without role filter to see if doctor exists with different role
      const anyUser = await User.findOne({ userId: doctorId });
      console.log('User with any role:', anyUser);
      return res.status(404).json({ message: 'Doctor not found' });
    }

    console.log('Found doctor:', {
      id: doctor._id,
      userId: doctor.userId,
      name: `${doctor.firstName} ${doctor.lastName}`
    });

    // Build query for appointments
    let appointmentQuery = {
      doctorRef: doctor._id,
      date: date,
      status: { $ne: 'Cancelled' } // Exclude cancelled appointments
    };

    // Add time range filter if provided
    if (startTime && endTime) {
      // Validate time format
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return res.status(400).json({ message: 'Valid time format (HH:mm) is required' });
      }
      
      appointmentQuery.startTime = { $gte: startTime };
      appointmentQuery.endTime = { $lte: endTime };
    } else if (startTime) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
        return res.status(400).json({ message: 'Valid start time format (HH:mm) is required' });
      }
      appointmentQuery.startTime = { $gte: startTime };
    } else if (endTime) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(endTime)) {
        return res.status(400).json({ message: 'Valid end time format (HH:mm) is required' });
      }
      appointmentQuery.endTime = { $lte: endTime };
    }

    // Fetch appointments
    const appointments = await Appointment.find(appointmentQuery)
      .populate('patientRef', 'userId firstName lastName contactNumber email')
      .sort({ startTime: 1, queueNo: 1 })
      .select('referenceNo patientId patientName patientPhone startTime endTime status queueNo reason createdAt');

    // Get doctor's availability for the date to provide context
    const availability = await DoctorAvailability.findOne({ doctorRef: doctor._id });
    let availableSlots = [];
    if (availability) {
      availableSlots = availability.slotsForDate(date);
    }

    // Count appointments by status
    const statusCounts = {
      total: appointments.length,
      booked: appointments.filter(a => a.status === 'Booked').length,
      confirmed: appointments.filter(a => a.status === 'Confirmed').length,
      checkedIn: appointments.filter(a => a.status === 'CheckedIn').length,
      completed: appointments.filter(a => a.status === 'Completed').length,
      noShow: appointments.filter(a => a.status === 'NoShow').length,
      rescheduled: appointments.filter(a => a.status === 'Rescheduled').length
    };

    // Format response
    const response = {
      doctor: {
        id: doctor.userId,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialty: doctor.specialty || 'Not specified'
      },
      date: date,
      timeRange: {
        startTime: startTime || 'All day',
        endTime: endTime || 'All day'
      },
      availability: {
        totalSlots: availableSlots.length,
        durationMinutes: availability?.durationMinutes || 15,
        sessionCapacity: availability?.sessionCapacity || 30
      },
      appointments: appointments.map(apt => ({
        id: apt._id,
        referenceNo: apt.referenceNo,
        patient: {
          id: apt.patientId,
          name: apt.patientName || (apt.patientRef ? `${apt.patientRef.firstName} ${apt.patientRef.lastName}` : 'Unknown'),
          phone: apt.patientPhone || apt.patientRef?.contactNumber || '',
          email: apt.patientRef?.email || ''
        },
        time: {
          start: apt.startTime,
          end: apt.endTime
        },
        status: apt.status,
        queueNo: apt.queueNo,
        reason: apt.reason || '',
        bookedAt: apt.createdAt
      })),
      summary: statusCounts
    };

    res.json(response);

  } catch (error) {
    console.error('getDoctorAppointments error:', error);
    res.status(500).json({ message: 'Server error while fetching appointments' });
  }
};

// DELETE: Delete all appointments for a doctor on a given date (Doctor)
exports.deleteAppointmentsByDate = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Missing date' });

    // find doctor
    const doctor = await User.findOne({ userId: doctorId, role: 'Doctor' }).select('_id userId');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // ensure the requester is the same doctor (if actorDoctor middleware is used)
    if (req.actorDoctor && String(req.actorDoctor._id) !== String(doctor._id)) {
      return res.status(403).json({ message: 'Forbidden: cannot delete other doctor appointments' });
    }

    // fetch appointments to notify
    const appts = await Appointment.find({ doctorRef: doctor._id, date });

    // send cancellation emails in parallel (best-effort)
    const sendPromises = appts.map(async (a) => {
      try {
        // build minimal appointment payload
        const apptPayload = {
          referenceNo: a.referenceNo,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          doctorName: a.doctorName || doctor.userId,
          patientName: a.patientName || ''
        };
        // if patient email available, attempt to send
        const to = a.patientEmail || '';
        if (to) {
          // call emailController.sendCancellationEmail by simulating req/res is brittle; instead create a lightweight transporter here
          // We'll reuse the same transporter settings as emailController for consistency
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
              pass: process.env.EMAIL_PASS || 'vyzl smsi ybtr vuqn',
            },
          });
          const mailOptions = {
            from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
            to,
            subject: 'Booking Cancellation',
            html: `<h2>Booking Cancelled</h2>
              <p>Dear ${apptPayload.patientName || 'Patient'},</p>
              <p>We regret to inform you that your appointment with Dr. ${apptPayload.doctorName} on <b>${apptPayload.date}</b> at <b>${apptPayload.startTime}</b> has been cancelled by the doctor.</p>
              <p>Reference No: <b>${apptPayload.referenceNo}</b></p>
              <p>If you would like to reschedule, please visit our booking portal or contact the clinic.</p>
              <hr />
              <small>This is an automated message. Please do not reply.</small>`
          };
          await transporter.sendMail(mailOptions);
        }
      } catch (err) {
        console.error('Failed to send cancellation email for appointment', a._id, err?.message || err);
        // continue
      }
    });

    await Promise.allSettled(sendPromises);

    const result = await Appointment.deleteMany({ doctorRef: doctor._id, date });
    res.json({ message: `${result.deletedCount} appointment(s) deleted` });
  } catch (e) {
    console.error('deleteAppointmentsByDate error:', e);
    res.status(500).json({ message: 'Server error deleting appointments' });
  }
};
