

module.exports = function generateApptRef() {
  const year = new Date().getUTCFullYear();
  const rnd  = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
  return `AP-${year}-${rnd}`;
};
