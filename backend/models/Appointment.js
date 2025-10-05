
// models/Appointment.js
const mongoose = require('mongoose');

const YMD  = /^\d{4}-\d{2}-\d{2}$/;                  // 2025-08-23
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;          // 00:00 - 23:59
const SAFE_TEXT = /^[A-Za-z0-9\s.,()\-_/]*$/;

const appointmentSchema = new mongoose.Schema(
  {
    referenceNo: { type: String, unique: true, required: true, index: true }, // e.g., AP-2025-000123

    // Participants
    patientRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId:  { type: String, required: true }, // P2025/200/123
    doctorRef:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId:   { type: String, required: true }, // D2025/100/007
    doctorName: { type: String, required: true }, // redundant for easy access

    // Timing (UTC strings; UI can render local)
    date:      { type: String, required: true, index: true, validate: { validator: v => YMD.test(v), message: 'date must be YYYY-MM-DD' } },
    startTime: { type: String, required: true, validate: { validator: v => HHMM.test(v), message: 'startTime must be HH:mm' } },
    endTime:   { type: String, required: true, validate: { validator: v => HHMM.test(v), message: 'endTime must be HH:mm' } },

    // Status & queue
    status:   { type: String, enum: ['Booked','AwaitingPayment','Confirmed','CheckedIn','Completed','Cancelled','NoShow','Rescheduled'], default: 'Booked', index: true },
    queueNo:  { type: Number, required: true, min: 1 }, // 1..capacity

    // Optional metadata
    reason:   {
      type: String, default: '',
      set: v => String(v || '').trim(),
      validate: { validator: v => v === '' || SAFE_TEXT.test(v), message: 'reason has invalid characters' }
    },
    createdBy: { type: String, default: 'patient', enum: ['patient','doctor','admin'] },

    // Payment (optional)
    paymentMethod: { type: String, enum: ['Cash','Online'], default: 'Cash' },
    priceLkr: { type: Number, default: 0, min: 0 },
    payment: {
      provider:   { type: String, default: '' },      // 'stripe', 'payhere', etc.
      status:     { type: String, default: '' },      // 'created', 'succeeded', 'failed'
      externalId: { type: String, default: '' },
      paidAt:     { type: Date },
      cardLast4:  { type: String, default: '' }
    },

    // Redundant patient contact (snapshot at time of booking)
    patientName:  { type: String, default: '' },
    patientPhone: { type: String, default: '' },
    patientEmail: { type: String, default: '' },
    patientNIC:   { type: String, default: '' },
    patientPassport: { type: String, default: '' }
  },
  { timestamps: true }
);

// HARD anti–double-booking for this exact slot (per doctor per start)
appointmentSchema.index(
  { doctorRef: 1, date: 1, startTime: 1 },
  { unique: true, name: 'uniq_doctor_date_start' }
);

// Fast lookups
appointmentSchema.index({ patientRef: 1, date: 1 });
appointmentSchema.index({ status: 1, date: 1 });

/* ---------- Pre-validate: logical time order ---------- */
appointmentSchema.pre('validate', function (next) {
  try {
    const toMin = (t) => {
      const [h, m] = String(t).split(':').map(Number);
      return h * 60 + m;
    };
    if (HHMM.test(this.startTime) && HHMM.test(this.endTime)) {
      if (toMin(this.endTime) <= toMin(this.startTime)) {
        return next(new Error('endTime must be after startTime'));
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});

/* ---------- Helper: safe view model ---------- */
appointmentSchema.methods.toSafeJSON = function () {
  const o = this.toObject({ getters: true, virtuals: true });
  // hide internal fields if needed
  return o;
};

module.exports = mongoose.model('Appointment', appointmentSchema);
