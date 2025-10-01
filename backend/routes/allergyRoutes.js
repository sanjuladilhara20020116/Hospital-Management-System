const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/allergyController');

// Public GET (read-only)
router.get('/patients/:patientUserId/allergies', ctrl.listByPatient);

// Doctor actions (UI enforces role; add auth later if you like)
router.post('/patients/:patientUserId/allergies', ctrl.create);
router.put('/allergies/:id', ctrl.update);
router.delete('/allergies/:id', ctrl.remove);

module.exports = router;
