
// src/utils/validators.js
export const rx = {
  nameLive: /^[A-Za-z ]*$/,                // typing mask
  nameSubmit: /^[A-Za-z ]{2,50}$/,         // final submit
  phone: /^[0-9]{9,12}$/,                  // after country code
  sriNicNew: /^[0-9]{12}$/,
  sriNicOld: /^[0-9]{9}[VvXx]$/,
  passport: /^[A-Za-z0-9]{6,12}$/,
  reason: /^[A-Za-z0-9 ,.]{0,200}$/,
  doctorQuery: /^[A-Za-z ]{0,20}$/,
  ymd: /^\d{4}-\d{2}-\d{2}$/,
  hhmm: /^([01]\d|2[0-3]):([0-5]\d)$/,
};

export function nicOrPassportValid(nic, passport) {
  if (!nic && !passport) return false;
  if (nic && !(rx.sriNicNew.test(nic) || rx.sriNicOld.test(nic))) return false;
  if (passport && !rx.passport.test(passport)) return false;
  return true;
}

