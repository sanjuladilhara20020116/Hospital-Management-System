// utils/VaccinationCertificatePDF.js
// Vaccination Certificate PDF Generator (pdfkit only)

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

// ===========================
// CONFIG
// ===========================
const CONFIG = {
  page: { size: "A4", margin: 40 },
  colors: {
    primary: "#2C69F0",
    primaryLight: "#4D8DF7",
    success: "#155724",
    successBg: "#d4edda",
    error: "#7f1d1d",
    errorBg: "#fde2e7",
    white: "#FFFFFF",
    gray050: "#f0f7ff",
    gray100: "#f8f9fa",
    gray150: "#f3f4f6",
    gray200: "#e9ecef",
    gray300: "#dee2e6",
    gray400: "#ced4da",
    gray500: "#6c757d",
    gray600: "#495057",
    gray800: "#212529",
    gray900: "#111111",
    border: "#e5e7eb",
    borderAccent: "#cbd5e1",
  },
  fonts: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
  },
  sizes: {
    title: 22,
    subtitle: 12,
    sectionHeader: 12,
    tableHeader: 11,
    body: 10,
  },
  spacing: {
    yHeader: 40,
    headerBlockH: 88,
    headerRadius: 16,
    yAfterHeader: 16,
    statusBadgeH: 24,
    statusGap: 34,
    sectionGap: 20,
    cardGap: 24,
    cardH: 148,
    cardRadius: 10,
    labelMinH: 14,
    lineGap: 4,
    tableHeaderH: 24,
    tableRowH: 26,
    footerH: 44,
  },
};

// ===========================
// FILE MANAGEMENT
// ===========================
class FileManager {
  constructor(baseDir = path.join(__dirname, "..", "uploads")) {
    this.baseDir = baseDir;
    this.certDir = path.join(baseDir, "certificates");
  }
  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
    if (!fs.existsSync(this.certDir)) fs.mkdirSync(this.certDir, { recursive: true });
  }
  sanitizeFileName(input, fallback = "certificate") {
    const base = (input && String(input)) || String(fallback);
    return base.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 120);
  }
  generateFilePath(certificateNumber, recordId) {
    const fileName = this.sanitizeFileName(certificateNumber || recordId) + ".pdf";
    return {
      fileName,
      relativePath: path.join("certificates", fileName),
      absolutePath: path.join(this.certDir, fileName),
    };
  }
  // Resolve logo path (several fallbacks)
  resolveLogoPath() {
    const candidates = [
      process.env.HOSPITAL_LOGO_PATH,
      path.resolve(process.cwd(), "frontend/public/medicore.png"),
      path.resolve(process.cwd(), "public/medicore.png"),
      path.join(__dirname, "..", "..", "frontend", "public", "medicore.png"),
      path.join(__dirname, "..", "public", "medicore.png"),
      path.join(this.baseDir, "logo.png"),
    ].filter(Boolean);
    for (const p of candidates) {
      try { if (fs.existsSync(p)) return p; } catch {}
    }
    return null;
  }
}

// ===========================
// FORMATTERS
// ===========================
class Formatter {
  static toDateSafe(v) {
    if (!v && v !== 0) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;

    // timestamps
    if (typeof v === "number") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof v === "string") {
      const s = v.trim();

      // YYYY-MM-DD or YYYY/MM/DD
      let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return isNaN(d.getTime()) ? null : d;
      }

      // DD-MM-YYYY or DD/MM/YYYY
      m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return isNaN(d.getTime()) ? null : d;
      }

      // Fallback to Date parse
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  static date(d, opts = {}) {
    const o = { timeZone: "Asia/Colombo", ...opts };
    const dt = d instanceof Date ? d : new Date(d);
    try { return dt.toLocaleDateString("en-LK", o); } catch { return dt.toLocaleDateString(); }
  }
  static dateTime(d) {
    const dt = d instanceof Date ? d : new Date(d);
    try { return dt.toLocaleString("en-LK", { timeZone: "Asia/Colombo" }); } catch { return dt.toLocaleString(); }
  }
  static val(v, fallback = "-") { return (v === undefined || v === null || v === "") ? fallback : String(v); }
  static fullName(fn, ln) { return `${fn || ""} ${ln || ""}`.trim() || "-"; }
}

// ===========================
// DRAW HELPERS
// ===========================
class Draw {
  constructor(doc) { this.d = doc; }
  hLine(x1, x2, y, color = CONFIG.colors.border, w = 1) {
    this.d.save().lineWidth(w).strokeColor(color).moveTo(x1, y).lineTo(x2, y).stroke().restore();
  }
  pill(x, y, w, h, fill, opacity = 1) {
    this.d.save().opacity(opacity).fillColor(fill).roundedRect(x, y, w, h, Math.min(h / 2, 12)).fill().restore();
  }
  logo(x, y, size, logoPath) {
    // white round base
    this.d.save().circle(x + size / 2, y + size / 2, size / 2).fill(CONFIG.colors.white).restore();
    if (logoPath) {
      try {
        this.d.image(logoPath, x + size * 0.2, y + size * 0.2, { width: size * 0.6, height: size * 0.6 });
        return;
      } catch {}
    }
    // fallback glyph
    this.d.save().fillColor(CONFIG.colors.primary)
      .roundedRect(x + size * 0.3, y + size * 0.25, size * 0.4, size * 0.5, 6).fill().restore();
  }
  watermarkVoid(isVoided) {
    if (!isVoided) return;
    this.d.save()
      .font(CONFIG.fonts.bold).fontSize(120).fillColor(CONFIG.colors.error)
      .opacity(0.10).rotate(-18, { origin: [300, 420] })
      .text("VOIDED", 100, 330, { width: 400, align: "center" })
      .restore();
  }
}

// ===========================
// SECTIONS
// ===========================
class Sections {
  constructor(doc, draw) {
    this.d = doc;
    this.draw = draw;
    this.margin = CONFIG.page.margin;
    this.innerW = doc.page.width - this.margin * 2;
  }

  header(record, hospitalName, logoPath) {
    const yTop = CONFIG.spacing.yHeader;

    // gradient block
    const g = this.d.linearGradient(this.margin, yTop, this.margin + this.innerW, yTop);
    g.stop(0, CONFIG.colors.primary).stop(1, CONFIG.colors.primaryLight);
    this.d.save().roundedRect(this.margin, yTop, this.innerW, CONFIG.spacing.headerBlockH, CONFIG.spacing.headerRadius).fill(g).restore();

    // ---- FIX 1: center logo vertically inside the blue header
    const logoSize = 70;
    const logoX = this.margin + 18;
    const logoY = yTop + Math.round((CONFIG.spacing.headerBlockH - logoSize) / 2);
    this.draw.logo(logoX, logoY, logoSize, logoPath);

    // cert pill (measure first)
    const certText = record.certificateNumber ? `Cert ID: ${record.certificateNumber}` : "Cert ID: —";
    this.d.font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.body);
    const certW = Math.max(160, this.d.widthOfString(certText) + 26);
    const pillX = this.margin + this.innerW - certW - 16;
    const pillY = yTop + 16;
    this.draw.pill(pillX, pillY, certW, 28, CONFIG.colors.white, 0.22);
    this.d.fillColor(CONFIG.colors.white).text(certText, pillX, pillY + 7, { width: certW, align: "center" });

    // ---- FIX 2: prevent subtitle overlapping title by measuring title height
    const textX = this.margin + 110;
    const textW = pillX - textX - 16;
    const title = "Vaccination Certificate";
    this.d.save().fillColor(CONFIG.colors.white);

    this.d.font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.title);
    const titleH = this.d.heightOfString(title, { width: textW });
    this.d.text(title, textX, yTop + 18, { width: textW });

    this.d.font(CONFIG.fonts.regular).fontSize(CONFIG.sizes.subtitle).opacity(0.9)
      .text("Official Immunization Record", textX, yTop + 18 + titleH + 2, { width: textW });

    this.d.restore();

    return yTop + CONFIG.spacing.headerBlockH + CONFIG.spacing.yAfterHeader;
  }

  statusBadge(y, isVoided) {
    const status = isVoided ? "VOIDED" : "VALID CERTIFICATE";
    this.d.font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.body);
    const w = Math.max(160, this.d.widthOfString(status) + 26);
    const fill = isVoided ? CONFIG.colors.errorBg : CONFIG.colors.successBg;
    const ink = isVoided ? CONFIG.colors.error : CONFIG.colors.success;
    this.draw.pill(this.margin, y, w, CONFIG.spacing.statusBadgeH, fill, 1);
    this.d.fillColor(ink).text(status, this.margin, y + 6, { width: w, align: "center" });
    return y + CONFIG.spacing.statusGap;
  }

  sectionTitle(label, y) {
    this.d.font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.sectionHeader).fillColor(CONFIG.colors.gray900).text(label, this.margin, y);
    const h = this.d.heightOfString(label, { width: this.innerW });
    const yy = y + h + 6;
    this.d.save().strokeColor(CONFIG.colors.borderAccent).lineWidth(2).moveTo(this.margin, yy).lineTo(this.margin + this.innerW, yy).stroke().restore();
    return yy + 10;
  }

  card(x, y, w, h, title, rows) {
    // bg + left accent
    this.d.save().roundedRect(x, y, w, h, CONFIG.spacing.cardRadius).fill(CONFIG.colors.gray100).restore();
    this.d.save().fillColor(CONFIG.colors.primaryLight).roundedRect(x, y, 6, h, CONFIG.spacing.cardRadius).fill().restore();
    // title
    this.d.font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.subtitle).fillColor(CONFIG.colors.primary).text(title, x + 16, y + 12);
    // rows
    let yy = y + 36;
    const labelW = 120;
    const valueW = w - 32 - labelW;
    rows.forEach(([label, value]) => {
      this.d.font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.body).fillColor(CONFIG.colors.gray600).text(label, x + 16, yy, { width: labelW });
      this.d.font(CONFIG.fonts.regular).fontSize(CONFIG.sizes.body).fillColor(CONFIG.colors.gray800).text(Formatter.val(value), x + 16 + labelW + 8, yy, { width: valueW });
      const lh = Math.max(
        this.d.heightOfString(label, { width: labelW }),
        this.d.heightOfString(Formatter.val(value), { width: valueW }),
        CONFIG.spacing.labelMinH
      );
      yy += lh + CONFIG.spacing.lineGap;
    });
    return y + h;
  }

  summaryCards(y, patientInfo, vaccInfo) {
    const gap = CONFIG.spacing.cardGap;
    const w = (this.innerW - gap) / 2;
    const h = CONFIG.spacing.cardH;
    const left = this.card(this.margin, y, w, h, "Patient Information", patientInfo);
    const right = this.card(this.margin + w + gap, y, w, h, "Vaccination Details", vaccInfo);
    // ---- FIX 4: add a touch more space under the cards
    return Math.max(left, right) + CONFIG.spacing.sectionGap + 8;
  }

  tableHeader(cols, x, y, widths, h = CONFIG.spacing.tableHeaderH) {
    const tot = widths.reduce((a, b) => a + b, 0);
    this.d.save().roundedRect(x, y, tot, h, 6).fill(CONFIG.colors.primary).restore();
    this.d.save().fillColor(CONFIG.colors.white).font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.tableHeader);
    let cx = x;
    cols.forEach((c, i) => { this.d.text(c, cx + 10, y + 6, { width: widths[i] - 20 }); cx += widths[i]; });
    this.d.restore();
    return y + h;
  }

  tableRow(values, x, y, widths, h = CONFIG.spacing.tableRowH) {
    this.d.save().font(CONFIG.fonts.regular).fontSize(CONFIG.sizes.body).fillColor(CONFIG.colors.gray900);
    let cx = x;
    values.forEach((v, i) => {
      const align = i === 2 ? "center" : "left"; // center Dose
      this.d.text(Formatter.val(v), cx + 10, y + 7, { width: widths[i] - 20, align });
      cx += widths[i];
    });
    this.d.restore();
    this.draw.hLine(x, x + widths.reduce((a, b) => a + b, 0), y + h, CONFIG.colors.gray200);
    return y + h + 2;
  }

  widthsFromPerc(percs) {
    const w = percs.map((p, i) => (i < percs.length - 1 ? Math.round(this.innerW * p) : 0));
    const used = w.slice(0, -1).reduce((s, n) => s + n, 0);
    w[w.length - 1] = this.innerW - used; // last col absorbs rounding
    return w;
  }

  footer(hospitalName) {
    const y = this.d.page.height - this.margin - CONFIG.spacing.footerH;
    this.d.save().roundedRect(this.margin, y, this.innerW, CONFIG.spacing.footerH, 10).fill(CONFIG.colors.gray100).restore();
    this.d.font(CONFIG.fonts.regular).fontSize(CONFIG.sizes.body).fillColor(CONFIG.colors.gray500)
      .text(`Generated on ${Formatter.dateTime(new Date())}`, this.margin + 16, y + 12, { width: this.innerW / 2 - 16 });
    this.d.font(CONFIG.fonts.bold).fontSize(CONFIG.sizes.body).fillColor(CONFIG.colors.gray500)
      .text(hospitalName, this.margin + this.innerW / 2, y + 12, { width: this.innerW / 2 - 16, align: "right" });
  }
}

// ===========================
// DATA
// ===========================
class DataProcessor {
  static extractDOB(patient, record) {
    const p = patient || record?.patient || {};
    const candidates = [
      p.dob, p.dateOfBirth, p.birthDate,
      record?.patientDob, record?.dob, record?.dateOfBirth,
    ];
    for (const c of candidates) {
      const d = Formatter.toDateSafe(c);
      if (d) return Formatter.date(d);
    }
    return "-";
  }

  static patient(patient, record) {
    const p = patient || record?.patient || {};
    return {
      name: Formatter.fullName(p.firstName, p.lastName),
      id: Formatter.val(p.userId || p._id),
      dob: DataProcessor.extractDOB(patient, record), // ---- FIX 3: better DOB
      contact: Formatter.val(p.email),
    };
  }
  static vacc(record, doctor, hospitalName) {
    const u = doctor || record?.doctor || {};
    return {
      date: record.dateAdministered ? Formatter.dateTime(record.dateAdministered) : "-",
      provider: Formatter.fullName(u.firstName, u.lastName),
      facility: Formatter.val(hospitalName || process.env.HOSPITAL_NAME || "Hospital"),
      status: record.voided ? "Voided" : "Valid",
    };
  }
  static validate({ record }) {
    const errs = [];
    if (!record) errs.push("Record data is required");
    return { ok: errs.length === 0, errs };
  }
}

// ===========================
// WRITER
// ===========================
class PDFWriter {
  static write(doc, filePath) {
    return new Promise((resolve, reject) => {
      try {
        const stream = fs.createWriteStream(filePath);
        stream.on("error", (e) => reject(new Error(`Failed to write PDF: ${e.message}`)));
        stream.on("finish", resolve);
        doc.pipe(stream);
        doc.end();
      } catch (e) { reject(new Error(`PDF writing error: ${e.message}`)); }
    });
  }
}

// ===========================
// MAIN GENERATOR
// ===========================
class VaccinationCertificateGenerator {
  constructor() { this.fm = new FileManager(); }

  async generateCertificate({ record, patient, doctor, hospitalName }) {
    const v = DataProcessor.validate({ record });
    if (!v.ok) return { success: false, error: `Validation failed: ${v.errs.join(", ")}`, ok: false };

    this.fm.ensureDirectories();
    const paths = this.fm.generateFilePath(record.certificateNumber, record._id);

    const pData = DataProcessor.patient(patient, record);
    const vData = DataProcessor.vacc(record, doctor, hospitalName);
    const hospital = vData.facility;
    const logoPath = this.fm.resolveLogoPath();

    const doc = new PDFDocument({ size: CONFIG.page.size, margin: CONFIG.page.margin });
    const draw = new Draw(doc);
    const sec = new Sections(doc, draw);

    // Build content
    let y = sec.header(record, hospital, logoPath);
    y = sec.statusBadge(y, !!record.voided);

    y = sec.sectionTitle("Summary", y);

    const leftRows = [
      ["Name:", pData.name],
      ["Patient ID:", pData.id],
      ["Date of Birth:", pData.dob],
      ["Contact:", pData.contact],
    ];

    const rightRows = [
      ["Date Administered:", vData.date],
      ["Healthcare Provider:", vData.provider],
      ["Facility:", vData.facility],
      ["Certificate Status:", vData.status],
    ];

    y = sec.summaryCards(y, leftRows, rightRows);

    // Vaccination Information
    y = sec.sectionTitle("Vaccination Information", y);
    const perc = [0.30, 0.22, 0.12, 0.18, 0.18];
    const w = sec.widthsFromPerc(perc);
    let ty = sec.tableHeader(["Vaccine", "Manufacturer", "Dose", "Batch No.", "Route/Site"], CONFIG.page.margin, y, w);
    const routeSite = [record.route || "-", record.site || ""].filter(Boolean).join(" / ");
    ty = sec.tableRow(
      [Formatter.val(record.vaccineName), Formatter.val(record.manufacturer), `Dose ${record.doseNumber || 1}`, Formatter.val(record.batchLotNo), routeSite],
      CONFIG.page.margin, ty + 2, w, CONFIG.spacing.tableRowH
    );
    y = ty + 18;

    // Additional Information
    y = sec.sectionTitle("Additional Information", y);
    const addPerc = [0.18, 0.20, 0.20, 0.24, 0.18];
    const aw = sec.widthsFromPerc(addPerc);
    let ay = sec.tableHeader(["Expiry Date", "Next Dose Due", "Lot Number", "Administrator", "Signature"], CONFIG.page.margin, y, aw);
    ay = sec.tableRow(
      [record.expiryDate ? Formatter.date(record.expiryDate) : "-", "-", Formatter.val(record.batchLotNo), vData.provider, "—"],
      CONFIG.page.margin, ay + 2, aw, CONFIG.spacing.tableRowH
    );

    // Footer + watermark
    sec.footer(hospital);
    draw.watermarkVoid(!!record.voided);

    await PDFWriter.write(doc, paths.absolutePath);

    return {
      success: true,
      data: {
        fileName: paths.fileName,
        relativePath: paths.relativePath,
        absolutePath: paths.absolutePath,
        certificateNumber: record.certificateNumber,
        patientName: pData.name,
        isVoided: !!record.voided,
      },
      ok: true,
      fileName: paths.fileName,
      relativePath: paths.relativePath,
      absolutePath: paths.absolutePath,
    };
  }
}

// ===========================
// EXPORTS
// ===========================
async function buildVaccinationCertificatePDF(opts) {
  const g = new VaccinationCertificateGenerator();
  return g.generateCertificate(opts);
}
const generateVaccinationCertificate = buildVaccinationCertificatePDF;

module.exports = {
  buildVaccinationCertificatePDF,
  generateVaccinationCertificate,
  VaccinationCertificateGenerator,
  CONFIG,
  Formatter,
  FileManager,
  DataProcessor,
};
