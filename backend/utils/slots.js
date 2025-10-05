// utils/slots.js
const dayjs = require('dayjs');

function toSlots({ startTime, endTime, slotMinutes }) {
  const slots = [];
  let t = dayjs(`2000-01-01T${startTime}:00`);
  const end = dayjs(`2000-01-01T${endTime}:00`);
  while (t.add(slotMinutes, 'minute').isSameOrBefore(end)) {
    const start = t.format('HH:mm');
    const next  = t.add(slotMinutes, 'minute');
    slots.push({ start, end: next.format('HH:mm') });
    t = next;
  }
  return slots;
}
module.exports = { toSlots };

