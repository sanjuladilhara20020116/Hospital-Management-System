// Format: LB-YYYY-MM-###### (zero-padded counter)
const Counter = require('../models/SeqCounter'); // simple counter model below

async function generateReferenceNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  // get next sequence per month
  const doc = await Counter.findOneAndUpdate(
    { key: `LB-${y}-${m}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const num = String(doc.seq).padStart(6, '0');
  return `LB-${y}-${m}-${num}`;
}

module.exports = generateReferenceNo;
