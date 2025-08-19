const mongoose = require("mongoose");

const ValueSet = new mongoose.Schema({
  totalCholesterol: Number,
  ldl: Number,
  hdl: Number,
  triglycerides: Number,
}, { _id: false });

const DerivedSet = new mongoose.Schema({
  nonHDL: Number, // total - HDL
  vldl: Number,   // ~ TG / 5  (mg/dL) – simple estimate
}, { _id: false });

const cholesterolResultSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  reportId:  { type: mongoose.Schema.Types.ObjectId, ref: "LabReport", unique: true, sparse: true },

  // dates
  testDate:   { type: Date },   // from the report, if present
  recordedAt: { type: Date, default: Date.now }, // when we saved the snapshot

  // source/info (optional but handy for UI)
  labName:   String,
  sourceFile:String,
  reportType:{ type: String, default: "Cholesterol", index: true },

  // store BOTH original & standardized values
  unitsOriginal: { type: String, default: "mg/dL" },
  valuesOriginal: ValueSet,          // as parsed
  unitsStd: { type: String, default: "mg/dL" }, // we standardize to mg/dL
  valuesStd: ValueSet,               // converted to mg/dL
  derivedStd: DerivedSet,            // derived from standardized values
}, { timestamps: true });

cholesterolResultSchema.index({ patientId: 1, testDate: 1 });

module.exports = mongoose.models.CholesterolResult
  || mongoose.model("CholesterolResult", cholesterolResultSchema);
