// models/DoctorAvailability.js
const mongoose = require('mongoose');
const dayjs = require('dayjs');

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;          // 00:00 - 23:59
const YMD  = /^\d{4}-\d{2}-\d{2}$/;                  // 2025-08-23
const SAFE_TEXT = /^[A-Za-z0-9\s.,()\-_/]*$/;        // disallow weird specials like ##, $, <, >
//validate start and end 
const timeRangeSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, validate: { validator: v => HHMM.test(v), message: 'start must be HH:mm' } },
    end:   { type: String, required: true, validate: { validator: v => HHMM.test(v), message: 'end must be HH:mm' } },
  },
  { _id: false }
);

const dateRangeSchema = new mongoose.Schema(
  {
    start:  { type: Date, required: true },
    end:    { type: Date, required: true },
    reason: {
      type: String,
      default: '',
      set: v => String(v || '').trim(),
      validate: { validator: v => v === '' || SAFE_TEXT.test(v), message: 'reason has invalid characters' }
    }
  },
  { _id: false }
);

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // per-slot duration and per-day capacity
    durationMinutes: { type: Number, required: true, enum: [10, 15, 20, 30] },
    sessionCapacity: { type: Number, required: true, min: 1, max: 200, default: 30 },

    timezone: { type: String, default: 'Asia/Colombo' },

    // Working hours per weekday (can add multiple ranges/day)
    weeklyHours: {
      mon: { type: [timeRangeSchema], default: [] },
      tue: { type: [timeRangeSchema], default: [] },
      wed: { type: [timeRangeSchema], default: [] },
      thu: { type: [timeRangeSchema], default: [] },
      fri: { type: [timeRangeSchema], default: [] },
      sat: { type: [timeRangeSchema], default: [] },
      sun: { type: [timeRangeSchema], default: [] },
    },

    // Date-specific exceptions
    breaks: { type: [dateRangeSchema], default: [] }, // e.g., 10:30-11:00 on a date
    blocks: { type: [dateRangeSchema], default: [] }, // full day leave/meetings
  },
  { timestamps: true }
);

/* ---------- Validators & helpers ---------- */

// Ensure time ranges are logically ordered (start < end)
function checkRanges(ranges) {
  return ranges.every(r => {
    const s = dayjs(`2000-01-01T${r.start}:00`);
    const e = dayjs(`2000-01-01T${r.end}:00`);
    return s.isBefore(e);
  });
}

// Ensure no overlap within same day's weekly ranges (lightweight O(n^2))
function noOverlap(ranges) {
  const toMin = t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const sorted = [...ranges].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (toMin(sorted[i - 1].end) > toMin(sorted[i].start)) return false;
  }
  return true;
}

// ✅ Replace path('weeklyHours').validate(...) with a pre-validate hook
doctorAvailabilitySchema.pre('validate', function(next) {
  try {
    const wh = this.weeklyHours || {};
    const days = ['mon','tue','wed','thu','fri','sat','sun'];
    for (const d of days) {
      const ranges = Array.isArray(wh[d]) ? wh[d] : [];
      if (!checkRanges(ranges)) {
        return next(new Error('weeklyHours contain invalid ranges (start must be before end)'));
      }
      if (!noOverlap(ranges)) {
        return next(new Error('weeklyHours contain overlapping ranges'));
      }
    }
    return next();
  } catch (e) {
    return next(e);
  }
});

doctorAvailabilitySchema.path('breaks').validate(function (arr) {
  return arr.every(b => b.start < b.end);
}, 'breaks must have start < end');

doctorAvailabilitySchema.path('blocks').validate(function (arr) {
  return arr.every(b => b.start < b.end);
}, 'blocks must have start < end');

/* ---------- Instance method: generate slots for a given date ---------- */
/**
 * Generate slots for a specific local date (YYYY-MM-DD) using weeklyHours
 * and applying durationMinutes. Blocks make the day unavailable if the date
 * falls within any block range.
 */
doctorAvailabilitySchema.methods.slotsForDate = function (ymd) {
  if (!YMD.test(ymd)) return [];
  const dt = dayjs(ymd);

  // If a block covers this day, return empty
  const inBlock = (this.blocks || []).some(b => {
    const start = dayjs(b.start).startOf('day');
    const end   = dayjs(b.end).endOf('day');
    return (dt.isAfter(start) || dt.isSame(start, 'day')) &&
           (dt.isBefore(end)  || dt.isSame(end, 'day'));
  });
  if (inBlock) return [];

  const weekday = ['sun','mon','tue','wed','thu','fri','sat'][dt.day()];
  const ranges = (this.weeklyHours?.[weekday] || []);
  const slots = [];
  const step = this.durationMinutes;

  ranges.forEach(r => {
    let t = dayjs(`${ymd}T${r.start}:00`);
    const end = dayjs(`${ymd}T${r.end}:00`);
    while (t.valueOf() < end.valueOf()) {
      const start = t.format('HH:mm');
      const next = t.add(step, 'minute');
      // Only add slot if next is not after end
      if (next.valueOf() <= end.valueOf()) {
        slots.push({ start, end: next.format('HH:mm') });
      }
      t = next;
    }
  });

  return slots;
};

module.exports =
  mongoose.models.DoctorAvailability ||
  mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
