// src/pages/DoctorVaccinatePage.js
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Vaccination } from "../vaccinationApi";
import "./DoctorVaccinatePage.css";

// --- Safe patterns (warning-free) ---
const patientIdPattern = /^[A-Za-z0-9/-]+$/;
const vaccineNamePattern = /^[-A-Za-z0-9 &.,()/]+$/;
// allow letters/numbers with - _ / . , & ( ) and spaces
const safeText = /^[-A-Za-z0-9 _/.,&()]+$/;

// --- Helper: local datetime string for <input type="datetime-local"> ---
function localDateTimeValue(date = new Date()) {
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

// --- Categorized vaccine list ---
const vaccineCategories = {
  children: [
    "BCG (Tuberculosis)",
    "Hepatitis B",
    "Polio (IPV/OPV)",
    "DTaP / DTP (Diphtheria, Tetanus, Pertussis)",
    "Hib (Haemophilus influenzae type b)",
    "PCV (Pneumococcal conjugate)",
    "Rotavirus",
    "MMR (Measles, Mumps, Rubella)",
    "Varicella (Chickenpox)",
    "Hepatitis A",
  ],
  teens: [
    "HPV (Human Papillomavirus)",
    "Meningococcal ACWY",
    "Tdap (Tetanus, Diphtheria, Pertussis booster)",
    "Influenza (Flu shot)",
    "MMR",
    "Varicella",
    "HepA",
    "HepB",
  ],
  adults: [
    "Td/Tdap booster",
    "Influenza (Flu shot)",
    "MMR",
    "Varicella (if never had chickenpox/vaccine)",
    "Hepatitis B",
    "COVID-19",
  ],
  pregnant: ["Tdap (27-36 weeks)", "Influenza (Flu shot)", "COVID-19 vaccine"],
  seniors: [
    "Shingles (Shingrix)",
    "Herpes Zoster",
    "Pneumococcal vaccines (PCV15/PCV20,PPSV23)",
    "Influenza",
    "Td/Tdap booster",
  ],
  travel: [
    "Yellow fever",
    "Typhoid",
    "Japanese Encephalitis (JE)",
    "Rabies",
    "Cholera",
    "Hepatitis A",
    "Hepatitis B",
    "Meningococcal",
  ],
};

// --- Manufacturer map (filtered by vaccine) ---
const manufacturersByVaccine = {
  // Children / Core
  "BCG (Tuberculosis)": ["Serum Institute of India", "AJ Vaccines"],
  "Hepatitis B": ["GSK (Engerix-B)", "Merck (Recombivax HB)", "Serum Institute of India"],
  HepB: ["GSK (Engerix-B)", "Merck (Recombivax HB)", "Serum Institute of India"], // synonym
  "Polio (IPV/OPV)": ["Sanofi Pasteur", "Bharat Biotech"],
  "DTaP / DTP (Diphtheria, Tetanus, Pertussis)": ["Sanofi Pasteur", "GSK", "Serum Institute of India"],
  "Hib (Haemophilus influenzae type b)": ["Sanofi Pasteur (ActHIB)", "GSK (Hiberix)"],
  "PCV (Pneumococcal conjugate)": ["Pfizer (Prevnar)", "GSK (Synflorix)"],
  Rotavirus: ["Merck (RotaTeq)", "GSK (Rotarix)", "Bharat Biotech (Rotavac)"],
  "MMR (Measles, Mumps, Rubella)": ["Merck (MMR II)", "GSK (Priorix)"],
  MMR: ["Merck (MMR II)", "GSK (Priorix)"], // synonym
  "Varicella (Chickenpox)": ["Merck (Varivax)", "GSK (Varilrix)"],
  Varicella: ["Merck (Varivax)", "GSK (Varilrix)"], // synonym
  "Hepatitis A": ["GSK (Havrix)", "Merck (Vaqta)"],
  HepA: ["GSK (Havrix)", "Merck (Vaqta)"], // synonym

  // Teens / Adults
  "HPV (Human Papillomavirus)": ["Merck (Gardasil 9)", "GSK (Cervarix)"],
  "Meningococcal ACWY": ["Sanofi Pasteur (Menactra)", "GSK (Menveo)"],
  Meningococcal: ["Sanofi Pasteur (Menactra)", "GSK (Menveo)"], // travel synonym
  "Tdap (Tetanus, Diphtheria, Pertussis booster)": ["Sanofi Pasteur (Adacel)", "GSK (Boostrix)"],
  "Td/Tdap booster": ["Sanofi Pasteur (Adacel/TD)", "GSK (Boostrix/Td)"],
  "Influenza (Flu shot)": ["Sanofi Pasteur", "CSL Seqirus", "GSK"],

  // COVID
  "COVID-19": ["Pfizer-BioNTech", "Moderna", "Johnson & Johnson (Janssen)", "AstraZeneca", "Novavax", "Sinopharm", "Sinovac"],
  "COVID-19 vaccine": ["Pfizer-BioNTech", "Moderna", "Johnson & Johnson (Janssen)", "AstraZeneca", "Novavax", "Sinopharm", "Sinovac"],

  // Pregnancy
  "Tdap (27–36 weeks)": ["Sanofi Pasteur (Adacel)", "GSK (Boostrix)"], // en-dash version
  "Tdap (27-36 weeks)": ["Sanofi Pasteur (Adacel)", "GSK (Boostrix)"], // hyphen version

  // Seniors
  "Shingles (Shingrix)": ["GSK (Shingrix)"],
  "Herpes Zoster": ["GSK (Shingrix)"], // synonym
  "Pneumococcal vaccines (PCV15/PCV20,PPSV23)": ["Pfizer (Prevnar 20/13)", "Merck (Pneumovax 23)"],

  // Travel
  "Yellow fever": ["Sanofi Pasteur (Stamaril)", "Bio-Manguinhos"],
  Typhoid: ["Sanofi Pasteur (Typhim Vi)", "Bharat Biotech (Typbar TCV)"],
  "Japanese Encephalitis (JE)": ["Valneva (Ixiaro)", "Bharat Biotech (JENVAC)"],
  Rabies: ["Sanofi Pasteur (Imovax Rabies)", "Bharat Biotech (Rabivax-S)", "GSK"],
  Cholera: ["Valneva (Dukoral)", "Shantha Biotech (Shanchol)"],
};

// Fallback list if no exact mapping found:
const defaultManufacturers = [
  "Pfizer",
  "Moderna",
  "Johnson & Johnson",
  "GlaxoSmithKline (GSK)",
  "Merck",
  "Sanofi Pasteur",
  "AstraZeneca",
  "Novavax",
  "Sinovac",
  "Sinopharm",
];

// NOTE: include "N/A" so the Site dropdown has a valid value when route is Oral/Nasal
const sites = [
  "Left Deltoid",
  "Right Deltoid",
  "Left Thigh",
  "Right Thigh",
  "Left Gluteus",
  "Right Gluteus",
  "Oral",
  "Nasal",
  "N/A",
];

// ✅ Smart defaults (don’t force, just guide)
const adminHints = {
  MMR: { route: "SC" },
  "MMR (Measles, Mumps, Rubella)": { route: "SC" },
  Varicella: { route: "SC" },
  "Varicella (Chickenpox)": { route: "SC" },
  Rotavirus: { route: "Oral", site: "N/A" },
  "Influenza (Flu shot)": { route: "IM" },
  "Polio (IPV/OPV)": { route: "IM" },
  "DTaP / DTP (Diphtheria, Tetanus, Pertussis)": { route: "IM" },
  "Hepatitis A": { route: "IM" },
  "Hepatitis B": { route: "IM" },
  "PCV (Pneumococcal conjugate)": { route: "IM" },
  "Hib (Haemophilus influenzae type b)": { route: "IM" },
  "Japanese Encephalitis (JE)": { route: "IM" },
  Typhoid: { route: "IM" },
  Cholera: { route: "Oral", site: "N/A" },
  "Meningococcal ACWY": { route: "IM" },
  Rabies: { route: "IM" },
};

/**
 * --- Standard Batch Lots by (vaccine, manufacturer) ---
 * One canonical lot per pair. Doctor can override; a soft note appears if it differs.
 * Keys must exactly match manufacturersByVaccine values (including synonyms).
 */
const standardBatchLots = {
  // Core
  "BCG (Tuberculosis)|Serum Institute of India": "SII-BCG-25A01",
  "BCG (Tuberculosis)|AJ Vaccines": "AJV-BCG-25B02",

  "Hepatitis B|GSK (Engerix-B)": "GSK-HEPB-25E01",
  "Hepatitis B|Merck (Recombivax HB)": "MRK-HEPB-25R03",
  "Hepatitis B|Serum Institute of India": "SII-HEPB-25S07",
  "HepB|GSK (Engerix-B)": "GSK-HEPB-25E01",
  "HepB|Merck (Recombivax HB)": "MRK-HEPB-25R03",
  "HepB|Serum Institute of India": "SII-HEPB-25S07",

  "Polio (IPV/OPV)|Sanofi Pasteur": "SAN-IPV-25P20",
  "Polio (IPV/OPV)|Bharat Biotech": "BB-IPV-25B11",

  "DTaP / DTP (Diphtheria, Tetanus, Pertussis)|Sanofi Pasteur": "SAN-DTP-25D19",
  "DTaP / DTP (Diphtheria, Tetanus, Pertussis)|GSK": "GSK-DTP-25G13",
  "DTaP / DTP (Diphtheria, Tetanus, Pertussis)|Serum Institute of India": "SII-DTP-25S05",

  "Hib (Haemophilus influenzae type b)|Sanofi Pasteur (ActHIB)": "SAN-HIB-25A04",
  "Hib (Haemophilus influenzae type b)|GSK (Hiberix)": "GSK-HIB-25H08",

  "PCV (Pneumococcal conjugate)|Pfizer (Prevnar)": "PFZ-PCV-25P13",
  "PCV (Pneumococcal conjugate)|GSK (Synflorix)": "GSK-PCV-25S14",

  "Rotavirus|Merck (RotaTeq)": "MRK-ROTA-25T02",
  "Rotavirus|GSK (Rotarix)": "GSK-ROTA-25X01",
  "Rotavirus|Bharat Biotech (Rotavac)": "BB-ROTA-25V06",

  "MMR (Measles, Mumps, Rubella)|Merck (MMR II)": "MRK-MMR-25M02",
  "MMR (Measles, Mumps, Rubella)|GSK (Priorix)": "GSK-MMR-25P07",
  "MMR|Merck (MMR II)": "MRK-MMR-25M02",
  "MMR|GSK (Priorix)": "GSK-MMR-25P07",

  "Varicella (Chickenpox)|Merck (Varivax)": "MRK-VARI-25V01",
  "Varicella (Chickenpox)|GSK (Varilrix)": "GSK-VARI-25L03",
  "Varicella|Merck (Varivax)": "MRK-VARI-25V01",
  "Varicella|GSK (Varilrix)": "GSK-VARI-25L03",

  "Hepatitis A|GSK (Havrix)": "GSK-HEPA-25H05",
  "Hepatitis A|Merck (Vaqta)": "MRK-HEPA-25V09",
  "HepA|GSK (Havrix)": "GSK-HEPA-25H05",
  "HepA|Merck (Vaqta)": "MRK-HEPA-25V09",

  // Teens / Adults
  "HPV (Human Papillomavirus)|Merck (Gardasil 9)": "MRK-HPV9-25G09",
  "HPV (Human Papillomavirus)|GSK (Cervarix)": "GSK-HPV-25C02",

  "Meningococcal ACWY|Sanofi Pasteur (Menactra)": "SAN-MEN-25A12",
  "Meningococcal ACWY|GSK (Menveo)": "GSK-MEN-25V04",
  "Meningococcal|Sanofi Pasteur (Menactra)": "SAN-MEN-25A12",
  "Meningococcal|GSK (Menveo)": "GSK-MEN-25V04",

  "Tdap (Tetanus, Diphtheria, Pertussis booster)|Sanofi Pasteur (Adacel)": "SAN-TDAP-25A03",
  "Tdap (Tetanus, Diphtheria, Pertussis booster)|GSK (Boostrix)": "GSK-TDAP-25B06",

  "Td/Tdap booster|Sanofi Pasteur (Adacel/TD)": "SAN-TD-25A01",
  "Td/Tdap booster|GSK (Boostrix/Td)": "GSK-TD-25B02",

  "Influenza (Flu shot)|Sanofi Pasteur": "SAN-FLU-25S10",
  "Influenza (Flu shot)|CSL Seqirus": "CSL-FLU-25Q08",
  "Influenza (Flu shot)|GSK": "GSK-FLU-25G07",

  // COVID
  "COVID-19|Pfizer-BioNTech": "PFZ-COV-25B01",
  "COVID-19|Moderna": "MOD-COV-25M02",
  "COVID-19|Johnson & Johnson (Janssen)": "JAN-COV-25J03",
  "COVID-19|AstraZeneca": "AZ-COV-25A04",
  "COVID-19|Novavax": "NVX-COV-25N05",
  "COVID-19|Sinopharm": "SNP-COV-25S06",
  "COVID-19|Sinovac": "SNV-COV-25S07",

  "COVID-19 vaccine|Pfizer-BioNTech": "PFZ-COV-25B01",
  "COVID-19 vaccine|Moderna": "MOD-COV-25M02",
  "COVID-19 vaccine|Johnson & Johnson (Janssen)": "JAN-COV-25J03",
  "COVID-19 vaccine|AstraZeneca": "AZ-COV-25A04",
  "COVID-19 vaccine|Novavax": "NVX-COV-25N05",
  "COVID-19 vaccine|Sinopharm": "SNP-COV-25S06",
  "COVID-19 vaccine|Sinovac": "SNV-COV-25S07",

  // Pregnancy (both spellings)
  "Tdap (27–36 weeks)|Sanofi Pasteur (Adacel)": "SAN-TDAP-25A21",
  "Tdap (27–36 weeks)|GSK (Boostrix)": "GSK-TDAP-25B21",
  "Tdap (27-36 weeks)|Sanofi Pasteur (Adacel)": "SAN-TDAP-25A21",
  "Tdap (27-36 weeks)|GSK (Boostrix)": "GSK-TDAP-25B21",

  // Seniors
  "Shingles (Shingrix)|GSK (Shingrix)": "GSK-SHX-25S01",
  "Herpes Zoster|GSK (Shingrix)": "GSK-SHX-25S01",
  "Pneumococcal vaccines (PCV15/PCV20,PPSV23)|Pfizer (Prevnar 20/13)": "PFZ-PNV-25P20",
  "Pneumococcal vaccines (PCV15/PCV20,PPSV23)|Merck (Pneumovax 23)": "MRK-PNV-25M23",

  // Travel
  "Yellow fever|Sanofi Pasteur (Stamaril)": "SAN-YF-25S01",
  "Yellow fever|Bio-Manguinhos": "BIO-YF-25B02",

  "Typhoid|Sanofi Pasteur (Typhim Vi)": "SAN-TYP-25T03",
  "Typhoid|Bharat Biotech (Typbar TCV)": "BB-TYP-25B04",

  "Japanese Encephalitis (JE)|Valneva (Ixiaro)": "VAL-JE-25I05",
  "Japanese Encephalitis (JE)|Bharat Biotech (JENVAC)": "BB-JE-25J06",

  "Rabies|Sanofi Pasteur (Imovax Rabies)": "SAN-RAB-25I07",
  "Rabies|Bharat Biotech (Rabivax-S)": "BB-RAB-25R08",
  "Rabies|GSK": "GSK-RAB-25G09",

  "Cholera|Valneva (Dukoral)": "VAL-CHOL-25D10",
  "Cholera|Shantha Biotech (Shanchol)": "SHN-CHOL-25S11",
};

// Helper to get the standard with exact key
const getStandardBatch = (vaccine, manufacturer) => {
  if (!vaccine || !manufacturer) return undefined;
  const key = `${vaccine}|${manufacturer}`;
  return standardBatchLots[key];
};

export default function DoctorVaccinatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillId = searchParams.get("patientUserId") || "";

  const [form, setForm] = useState({
    patientUserId: prefillId,
    vaccineName: "",
    manufacturer: "",
    batchLotNo: "",
    expiryDate: "",
    doseNumber: 1,
    route: "IM",
    site: "Left Deltoid",
    dateAdministered: localDateTimeValue(),
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  // Derived: filtered manufacturer list for the selected vaccine
  const manufacturerOptions = useMemo(() => {
    const v = form.vaccineName?.trim();
    return (v && manufacturersByVaccine[v]) || defaultManufacturers;
  }, [form.vaccineName]);

  // Clear manufacturer if it doesn't match the filtered list after vaccine change
  useEffect(() => {
    if (!form.manufacturer) return;
    const list = manufacturerOptions.map((m) => m.toLowerCase());
    if (!list.includes(form.manufacturer.toLowerCase())) {
      setForm((prev) => ({ ...prev, manufacturer: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vaccineName]);

  // ✅ Apply smart defaults when vaccine changes (route/site suggestions)
  useEffect(() => {
    const hint = adminHints[form.vaccineName];
    if (!hint) return;

    setForm((prev) => {
      const nextRoute = hint.route || prev.route || "IM";
      const siteShouldBeNA = nextRoute === "Oral" || nextRoute === "Nasal";
      const nextSite =
        siteShouldBeNA ? "N/A" : (prev.site && prev.site !== "N/A" ? prev.site : "Left Deltoid");

      return { ...prev, route: nextRoute, site: nextSite };
    });
  }, [form.vaccineName]);

  // Keep Site sensible if the user manually changes Route
  useEffect(() => {
    if (form.route === "Oral" || form.route === "Nasal") {
      if (form.site !== "N/A") setForm((prev) => ({ ...prev, site: "N/A" }));
    } else {
      if (form.site === "N/A") setForm((prev) => ({ ...prev, site: "Left Deltoid" }));
    }
  }, [form.route, form.site]);

  // --- NEW: Clear batch/lot whenever vaccine OR manufacturer changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, batchLotNo: "" }));           // empty it
    setTouched((prev) => ({ ...prev, batchLotNo: false }));      // avoid instant error highlight
  }, [form.vaccineName, form.manufacturer]);

  // --- Auto-fill batch lot when both vaccine & manufacturer selected
  useEffect(() => {
    const std = getStandardBatch(form.vaccineName, form.manufacturer);
    if (!std) return;
    setForm((prev) => {
      if (!prev.batchLotNo?.trim()) return { ...prev, batchLotNo: std }; // only if empty
      return prev;
    });
  }, [form.vaccineName, form.manufacturer]);

  // --- compute standard & mismatch flag for UI/validation
  const standardBatch = useMemo(
    () => getStandardBatch(form.vaccineName, form.manufacturer),
    [form.vaccineName, form.manufacturer]
  );
  const batchDiffersFromStandard = useMemo(() => {
    if (!standardBatch || !form.batchLotNo?.trim()) return false;
    return standardBatch !== form.batchLotNo.trim();
  }, [standardBatch, form.batchLotNo]);

  // Validation
  useEffect(() => {
    const newErrors = {};

    if (touched.patientUserId) {
      if (!form.patientUserId.trim()) {
        newErrors.patientUserId = "Patient ID is required";
      } else if (!patientIdPattern.test(form.patientUserId)) {
        newErrors.patientUserId =
          "Patient ID can only contain letters, numbers, hyphens, and slashes";
      }
    }

    if (touched.vaccineName) {
      if (!form.vaccineName.trim()) {
        newErrors.vaccineName = "Vaccine name is required";
      } else if (!vaccineNamePattern.test(form.vaccineName)) {
        newErrors.vaccineName = "Vaccine name contains invalid characters";
      }
    }

    if (touched.manufacturer && form.manufacturer && !vaccineNamePattern.test(form.manufacturer)) {
      newErrors.manufacturer = "Manufacturer contains invalid characters";
    }

    // --- Batch/Lot validations
    if (touched.batchLotNo) {
      if (!form.batchLotNo.trim()) {
        newErrors.batchLotNo = "Batch/Lot number is required";
      } else if (!safeText.test(form.batchLotNo)) {
        newErrors.batchLotNo = "Batch/Lot number contains invalid characters";
      }
      if (!newErrors.batchLotNo && standardBatch && form.batchLotNo.trim() !== standardBatch) {
        newErrors.batchLotNoSoft = `Note: standard lot for this selection is “${standardBatch}”.`;
      }
    }

    if (touched.expiryDate && form.expiryDate) {
      const expiryDate = new Date(form.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) newErrors.expiryDate = "Expiry date must be in the future";
    }

    if (touched.doseNumber) {
      const doseNum = Number(form.doseNumber);
      if (isNaN(doseNum) || doseNum < 1 || doseNum > 10) {
        newErrors.doseNumber = "Dose number must be between 1 and 10";
      }
    }

    if (touched.dateAdministered && form.dateAdministered) {
      const adminDate = new Date(form.dateAdministered);
      const now = new Date();
      if (adminDate > now) newErrors.dateAdministered = "Administration date cannot be in the future";
    }

    if (touched.notes && form.notes && !safeText.test(form.notes)) {
      newErrors.notes = "Notes contain invalid characters";
    }

    setErrors(newErrors);
  }, [form, touched, standardBatch]);

  function setVal(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function validate() {
    setTouched({
      patientUserId: true,
      vaccineName: true,
      manufacturer: true,
      batchLotNo: true,
      expiryDate: true,
      doseNumber: true,
      dateAdministered: true,
      notes: true,
    });

    const newErrors = {};

    if (!form.patientUserId.trim()) {
      newErrors.patientUserId = "Patient ID is required";
    } else if (!patientIdPattern.test(form.patientUserId)) {
      newErrors.patientUserId =
        "Patient ID can only contain letters, numbers, hyphens, and slashes";
    }

    if (!form.vaccineName.trim()) {
      newErrors.vaccineName = "Vaccine name is required";
    } else if (!vaccineNamePattern.test(form.vaccineName)) {
      newErrors.vaccineName = "Vaccine name contains invalid characters";
    }

    if (form.manufacturer && !vaccineNamePattern.test(form.manufacturer)) {
      newErrors.manufacturer = "Manufacturer contains invalid characters";
    }

    if (!form.batchLotNo.trim()) {
      newErrors.batchLotNo = "Batch/Lot number is required";
    } else if (!safeText.test(form.batchLotNo)) {
      newErrors.batchLotNo = "Batch/Lot number contains invalid characters";
    } else if (standardBatch && form.batchLotNo.trim() !== standardBatch) {
      newErrors.batchLotNoSoft = `Note: standard lot for this selection is “${standardBatch}”.`;
    }

    if (form.expiryDate) {
      const expiryDate = new Date(form.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) newErrors.expiryDate = "Expiry date must be in the future";
    }

    const doseNum = Number(form.doseNumber);
    if (isNaN(doseNum) || doseNum < 1 || doseNum > 10) {
      newErrors.doseNumber = "Dose number must be between 1 and 10";
    }

    if (form.dateAdministered) {
      const adminDate = new Date(form.dateAdministered);
      const now = new Date();
      if (adminDate > now) newErrors.dateAdministered = "Administration date cannot be in the future";
    }

    if (form.notes && !safeText.test(form.notes)) {
      newErrors.notes = "Notes contain invalid characters";
    }

    setErrors(newErrors);
    // Soft note doesn't block submit
    return Object.keys(newErrors).filter((k) => k !== "batchLotNoSoft").length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("");

    if (!validate()) {
      setStatus("Please correct the errors in the form");
      return;
    }

    setLoading(true);
    try {
      const isoDate = form.dateAdministered
        ? new Date(form.dateAdministered).toISOString()
        : undefined;

      const res = await Vaccination.create({
        patientUserId: form.patientUserId.trim(),
        vaccineName: form.vaccineName.trim(),
        manufacturer: form.manufacturer.trim() || undefined,
        batchLotNo: form.batchLotNo.trim(),
        expiryDate: form.expiryDate || undefined,
        doseNumber: Number(form.doseNumber) || 1,
        route: form.route || "IM",
        site: form.site || "Left Deltoid",
        dateAdministered: isoDate,
        notes: form.notes || undefined,
      });

      setStatus("Vaccination record created successfully");
      setTimeout(() => {
        if (res?._id) navigate(`/vaccinations/${res._id}`);
      }, 1200);
    } catch (e) {
      setStatus(e?.response?.data?.message || "Failed to create vaccination record");
    } finally {
      setLoading(false);
    }
  }

  const isError = status && !status.includes("successfully");

  return (
    <div className="vaccinate-page">
      <div className="page-header">
        <div className="title-wrap">
          <h1>Create Vaccination Record</h1>
          <span className="subtitle">Doctor Panel</span>
        </div>
      </div>

      {status && (
        <div className={`alert ${isError ? "error" : "success"}`} role="status">
          {status}
        </div>
      )}

      <div className="card">
        <form onSubmit={onSubmit} className="form-grid" noValidate>
          {/* Patient Information */}
          <div className="section">
            <div className="section-title">Patient Information</div>
            <div className="two-col">
              <div className="form-control">
                <label htmlFor="patientUserId">
                  Patient ID <span className="req">*</span>
                </label>
                <input
                  id="patientUserId"
                  value={form.patientUserId}
                  onChange={(e) => setVal("patientUserId", e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, patientUserId: true }))}
                  required
                  disabled={loading}
                  placeholder="e.g., P2025/898/16"
                  className={errors.patientUserId ? "error" : ""}
                />
                {errors.patientUserId && <span className="field-error">{errors.patientUserId}</span>}
              </div>

              <div className="form-control">
                <label htmlFor="dateAdministered">
                  Date/Time Administered <span className="req">*</span>
                </label>
                <input
                  id="dateAdministered"
                  type="datetime-local"
                  value={form.dateAdministered}
                  onChange={(e) => setVal("dateAdministered", e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, dateAdministered: true }))}
                  required
                  disabled={loading}
                  className={errors.dateAdministered ? "error" : ""}
                  max={localDateTimeValue()}
                />
                {errors.dateAdministered && (
                  <span className="field-error">{errors.dateAdministered}</span>
                )}
              </div>
            </div>
          </div>

          {/* Vaccine Details */}
          <div className="section">
            <div className="section-title">Vaccine Details</div>

            <div className="two-col">
              <div className="form-control">
                <label htmlFor="vaccineName">
                  Vaccine Name <span className="req">*</span>
                </label>

                {/* Categorized select with optgroups */}
                <select
                  id="vaccineName"
                  value={form.vaccineName}
                  onChange={(e) => setVal("vaccineName", e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, vaccineName: true }))}
                  disabled={loading}
                  required
                  className={errors.vaccineName ? "error" : ""}
                >
                  <option value="">-- Select Vaccine --</option>
                  <optgroup label="🧒 Children (0–12)">
                    {vaccineCategories.children.map((v, i) => (
                      <option key={`c-${i}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="👦 Teens (13–18)">
                    {vaccineCategories.teens.map((v, i) => (
                      <option key={`t-${i}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🧑 Adults">
                    {vaccineCategories.adults.map((v, i) => (
                      <option key={`a-${i}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🤰 Pregnant Women">
                    {vaccineCategories.pregnant.map((v, i) => (
                      <option key={`p-${i}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="👴 Seniors (50+ / 65+)">
                    {vaccineCategories.seniors.map((v, i) => (
                      <option key={`s-${i}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="✈️ Travel Vaccines">
                    {vaccineCategories.travel.map((v, i) => (
                      <option key={`tr-${i}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {errors.vaccineName && (
                  <span className="field-error">{errors.vaccineName}</span>
                )}
              </div>

              {/* Manufacturer with filtered datalist */}
              <div className="form-control">
                <label htmlFor="manufacturer">Manufacturer (filtered)</label>
                <input
                  id="manufacturer"
                  list="manufacturerOptions"
                  value={form.manufacturer}
                  onChange={(e) => setVal("manufacturer", e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, manufacturer: true }))}
                  disabled={loading}
                  placeholder={
                    form.vaccineName ? "Choose from list or type" : "Select a vaccine first"
                  }
                  className={errors.manufacturer ? "error" : ""}
                />
                <datalist id="manufacturerOptions">
                  {manufacturerOptions.map((m, i) => (
                    <option key={i} value={m} />
                  ))}
                </datalist>
                {errors.manufacturer && (
                  <span className="field-error">{errors.manufacturer}</span>
                )}
              </div>
            </div>

            <div className="two-col">
              <div className="form-control">
                <label htmlFor="batchLotNo">
                  Batch/Lot No <span className="req">*</span>
                </label>
                <input
                  id="batchLotNo"
                  value={form.batchLotNo}
                  onChange={(e) => setVal("batchLotNo", e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, batchLotNo: true }))}
                  required
                  disabled={loading}
                  placeholder="e.g., PFZ-COV-25B01"
                  className={errors.batchLotNo ? "error" : ""}
                />
                {/* soft note if different from standard */}
                {!errors.batchLotNo && errors.batchLotNoSoft && (
                  <span className="field-error">{errors.batchLotNoSoft}</span>
                )}
                {/* quick reset helper */}
                {standardBatch && batchDiffersFromStandard && !errors.batchLotNo && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ alignSelf: "flex-start", marginTop: "6px", padding: "6px 10px" }}
                    onClick={() => setVal("batchLotNo", standardBatch)}
                    disabled={loading}
                  >
                    Use standard: {standardBatch}
                  </button>
                )}
                {errors.batchLotNo && (
                  <span className="field-error">{errors.batchLotNo}</span>
                )}
              </div>

              <div className="form-control">
                <label htmlFor="expiryDate">Expiry Date</label>
                <input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setVal("expiryDate", e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, expiryDate: true }))}
                  disabled={loading}
                  className={errors.expiryDate ? "error" : ""}
                />
                {errors.expiryDate && (
                  <span className="field-error">{errors.expiryDate}</span>
                )}
              </div>
            </div>
          </div>

          {/* Administration Details */}
          <div className="section">
            <div className="section-title">Administration Details</div>
            <div className="two-col">
              <div className="form-control">
                <label htmlFor="doseNumber">Dose Number</label>
                <input
                  id="doseNumber"
                  type="number"
                  min="1"
                  max="10"
                  value={form.doseNumber}
                  onChange={(e) => setVal("doseNumber", e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, doseNumber: true }))}
                  disabled={loading}
                  className={errors.doseNumber ? "error" : ""}
                />
                {errors.doseNumber && (
                  <span className="field-error">{errors.doseNumber}</span>
                )}
              </div>

              <div className="form-control">
                <label htmlFor="route">Route</label>
                <select
                  id="route"
                  value={form.route}
                  onChange={(e) => setVal("route", e.target.value)}
                  disabled={loading}
                >
                  <option value="IM">Intramuscular (IM)</option>
                  <option value="SC">Subcutaneous (SC)</option>
                  <option value="ID">Intradermal (ID)</option>
                  <option value="Oral">Oral</option>
                  <option value="Nasal">Nasal</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label htmlFor="site">Site</label>
              <select
                id="site"
                value={form.site}
                onChange={(e) => setVal("site", e.target.value)}
                disabled={loading || form.route === "Oral" || form.route === "Nasal"}
              >
                {sites.map((site, i) => (
                  <option key={i} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Information */}
          <div className="section">
            <div className="section-title">Additional Information</div>
            <div className="form-control">
              <label htmlFor="notes">Clinical Notes</label>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setVal("notes", e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, notes: true }))}
                disabled={loading}
                placeholder="Optional clinical notes, observations, or adverse reactions"
                className={errors.notes ? "error" : ""}
              />
              {errors.notes && <span className="field-error">{errors.notes}</span>}
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={loading}
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button disabled={loading} type="submit" className="btn-primary">
              {loading ? "Saving..." : "Create Vaccination Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
