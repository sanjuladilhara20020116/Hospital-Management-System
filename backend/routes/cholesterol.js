const router = require("express").Router();
const CholesterolResult = require("../models/CholesterolResult");

// GET /api/patients/:patientId/cholesterol?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50
router.get("/patients/:patientId/cholesterol", async (req, res) => {
  try {
    const { patientId } = req.params;
    const { from, to, limit = 50 } = req.query;

    const q = { patientId, reportType: "Cholesterol" };
    if (from || to) {
      q.testDate = {};
      if (from) q.testDate.$gte = new Date(from);
      if (to)   q.testDate.$lte = new Date(to);
    }

    const items = await CholesterolResult
      .find(q)
      .sort({ testDate: 1, _id: 1 }) // ascending for charts
      .limit(Number(limit));

    res.json({
      ok: true,
      series: items.map(x => ({
        date: x.testDate,
        total: x.valuesStd?.totalCholesterol ?? null,
        ldl: x.valuesStd?.ldl ?? null,
        hdl: x.valuesStd?.hdl ?? null,
        tg:  x.valuesStd?.triglycerides ?? null,
        nonHDL: x.derivedStd?.nonHDL ?? null,
        vldl:   x.derivedStd?.vldl ?? null,
        // extras for table:
        units: x.unitsStd || "mg/dL",
        reportId: x.reportId,
        lab: x.labName || ""
      }))
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
