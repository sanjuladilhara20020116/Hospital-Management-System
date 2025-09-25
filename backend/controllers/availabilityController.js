
// controllers/availabilityController.js
const dayjs = require('dayjs');
const mongoose = require('mongoose');
const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/User'); // <-- add

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

// helper: resolve doctor ref from either ObjectId or public userId (e.g. D2025/…)
async function resolveDoctorRef(idLike) {
  if (!idLike) return null;
  if (mongoose.Types.ObjectId.isValid(idLike)) return idLike;
  const u = await User.findOne({ userId: idLike }).select('_id');
  return u ? u._id : null;
}

// POST /api/availability/doctor/day
exports.upsertDay = async (req, res) => {
  try {
    const {
      doctorId,                 // can be ObjectId OR public userId
      date,
      startTime,
      endTime,
      slotMinutes,
      patientLimit,
      hospital,                 // optional (ignored by this schema)
    } = req.body || {};

    const doctorRef = await resolveDoctorRef(doctorId || req.headers['x-user-id']);
    if (!doctorRef) return res.status(400).json({ message: 'Invalid doctorId' });

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    if (!HHMM.test(startTime) || !HHMM.test(endTime))
      return res.status(400).json({ message: 'startTime/endTime must be HH:mm' });

    const dur = Number(slotMinutes);
    const cap = Number(patientLimit);
    if (!Number.isFinite(dur) || dur <= 0)
      return res.status(400).json({ message: 'slotMinutes must be a positive number' });
    if (!Number.isFinite(cap) || cap <= 0)
      return res.status(400).json({ message: 'patientLimit must be a positive number' });

    const s = dayjs(`${date}T${startTime}:00`);
    const e = dayjs(`${date}T${endTime}:00`);
    if (!s.isBefore(e))
      return res.status(400).json({ message: 'startTime must be before endTime' });

    // find or create record
    let doc = await DoctorAvailability.findOne({ doctorRef });
    if (!doc) {
      doc = new DoctorAvailability({
        doctorRef,
        durationMinutes: dur,
        sessionCapacity: cap,
        timezone: 'Asia/Colombo',
        weeklyHours: {},
        breaks: [],
        blocks: [],
      });
    }

    // keep latest duration/capacity
    doc.durationMinutes = dur;
    doc.sessionCapacity = cap;

    const weekday = ['sun','mon','tue','wed','thu','fri','sat'][dayjs(date).day()];
    if (!doc.weeklyHours) doc.weeklyHours = {};
    if (!Array.isArray(doc.weeklyHours[weekday])) doc.weeklyHours[weekday] = [];

    // add non-duplicate time range
    const exists = doc.weeklyHours[weekday].some(r => r.start === startTime && r.end === endTime);
    if (!exists) doc.weeklyHours[weekday].push({ start: startTime, end: endTime });

    await doc.save();

    res.json({
      ok: true,
      message: 'Availability saved',
      data: {
        id: doc._id,
        weekday,
        range: { start: startTime, end: endTime },
        durationMinutes: doc.durationMinutes,
        sessionCapacity: doc.sessionCapacity,
      },
    });
  } catch (err) {
    console.error('upsertDay error:', err);
    res.status(500).json({ message: 'Unexpected server error' });
  }
};

// GET /api/availability/doctor/days
exports.listMine = async (req, res) => {
  try {
    const doctorRef = await resolveDoctorRef(req.headers['x-user-id']);
    if (!doctorRef) return res.status(400).json({ message: 'Invalid doctorId' });

    const doc = await DoctorAvailability.findOne({ doctorRef });
    res.json(doc || null);
  } catch (err) {
    console.error('listMine error:', err);
    res.status(500).json({ message: 'Unexpected server error' });
  }
};

// GET /api/availability/patient/:doctorId/week?date=YYYY-MM-DD
exports.weekView = async (req, res) => {
  try {
    const doctorRef = await resolveDoctorRef(req.params.doctorId);
    if (!doctorRef) return res.status(400).json({ message: 'Invalid doctorId' });

    const date = req.query.date || dayjs().format('YYYY-MM-DD');
    const doc = await DoctorAvailability.findOne({ doctorRef });
    if (!doc) return res.json({ durationMinutes: null, sessionCapacity: null, week: [] });

    const start = dayjs(date);
    const days = [...Array(7)].map((_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
    const week = days.map(d => ({ date: d, slots: doc.slotsForDate(d) }));

    res.json({
      durationMinutes: doc.durationMinutes,
      sessionCapacity: doc.sessionCapacity,
      week,
    });
  } catch (err) {
    console.error('weekView error:', err);
    res.status(500).json({ message: 'Unexpected server error' });
  }
};
