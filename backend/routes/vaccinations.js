const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vaccinationController');
const { actorFromHeader, allowRolesNoJWT } = require('../middleware/actor');

router.use(actorFromHeader); // populate req.user from x-user-id

// POST /api/vaccinations  (Doctor only)
router.post('/', allowRolesNoJWT('Doctor'), ctrl.createVaccination);

// Patient: my vaccination history
router.get('/mine', allowRolesNoJWT('Patient'), ctrl.listMineForPatient);

// Doctor or Hospital Manager can list
router.get('/doctor', allowRolesNoJWT('Doctor', 'HospitalManager'), ctrl.listForDoctor);

// Owner (patient) or privileged staff (enforced again in controller)
router.get('/:id', ctrl.getOne);
router.get('/:id/pdf', ctrl.downloadPdf);

// Doctor or Hospital Manager can perform actions
router.post('/:id/resend', allowRolesNoJWT('Doctor', 'HospitalManager'), ctrl.resendEmail);
router.put('/:id', allowRolesNoJWT('Doctor', 'HospitalManager'), ctrl.updateRecord);
router.delete('/:id', allowRolesNoJWT('Doctor', 'HospitalManager'), ctrl.deleteRecord);

module.exports = router;
