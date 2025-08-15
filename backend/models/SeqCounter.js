const mongoose = require('mongoose');
const seqCounterSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  seq: { type: Number, default: 0 }
});
module.exports = mongoose.model('SeqCounter', seqCounterSchema);
