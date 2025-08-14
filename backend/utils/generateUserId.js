const User = require('../models/User');

async function generateUserId(role) {
  const prefixMap = {
    Patient: 'P',
    Doctor: 'D',
    Pharmacist: 'M',
    HospitalManager: 'H',
    LabAdmin: 'LA', // ✅ new
  };

  const prefix = prefixMap[role];
  if (!prefix) throw new Error('Invalid role');

  const count = await User.countDocuments({ role });

  const year = new Date().getFullYear();
  const randomNumber = Math.floor(100 + Math.random() * 900);

  return `${prefix}${year}/${randomNumber}/${count + 1}`;
}

module.exports = generateUserId;
