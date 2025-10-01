

// Pure utilities for slot math and overlap checks
function toMinutes(t) { // "18:00" -> 1080
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(min) { // 1080 -> "18:00"
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function stepSlots(ranges, stepMin) {
  // ranges: [{start:"09:00", end:"13:00"}]
  const out = [];
  for (const r of ranges) {
    let cur = toMinutes(r.start);
    const end = toMinutes(r.end);
    while (cur + stepMin <= end) {
      out.push({ startTime: toHHMM(cur), endTime: toHHMM(cur + stepMin) });
      cur += stepMin;
    }
  }
  return out;
}
module.exports = { toMinutes, toHHMM, rangesOverlap, stepSlots };
