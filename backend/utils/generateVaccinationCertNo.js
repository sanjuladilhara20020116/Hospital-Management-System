// backend/utils/generateVaccinationCertNo.js
function pad(n) { return n.toString().padStart(2, '0'); }

function randomBlock(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = function generateVaccinationCertNo(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `VAC-${yyyy}${mm}${dd}-${randomBlock(4)}`;
};
