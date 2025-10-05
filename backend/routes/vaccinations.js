const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vaccinationController');
const { actorFromHeader, allowRolesNoJWT } = require('../middleware/actor');

router.use(actorFromHeader); // <— populate req.user from x-user-id

// POST /api/vaccinations  (Doctor)
router.post('/', allowRolesNoJWT('Doctor'), ctrl.createVaccination);

// Patient: my vaccination history
router.get('/mine', allowRolesNoJWT('Patient'), ctrl.listMineForPatient);

// Doctor list + filters
router.get('/doctor', allowRolesNoJWT('Doctor'), ctrl.listForDoctor);

// Owner (patient) or doctor
router.get('/:id', ctrl.getOne);
router.get('/:id/pdf', ctrl.downloadPdf);

// Doctor actions
router.post('/:id/resend', allowRolesNoJWT('Doctor'), ctrl.resendEmail);
router.put('/:id', allowRolesNoJWT('Doctor'), ctrl.updateRecord);
router.delete('/:id', allowRolesNoJWT('Doctor'), ctrl.deleteRecord);

module.exports = router;
