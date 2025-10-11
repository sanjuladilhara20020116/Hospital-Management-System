// src/utils/pdfUtils.js
// pdf eka generate wena code eka
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import medicoreLogo from "../components/medicore.png"; // C:\...\frontend\src\components\medicore.png

// Register plugin
jsPDF.API.autoTable = autoTable;

/** dd/mm/yyyy (Sri Lanka style) */
function formatDateSL(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Fit text to a maximum width by shrinking font size (never below minFontSize). */
function drawFittedText(doc, text, x, y, opts) {
  const {
    align = "left",
    maxWidth,
    startFontSize = 16,
    minFontSize = 12,
    font = ["helvetica", "bold"],
  } = opts;

  doc.setFont(...font);
  let size = startFontSize;
  doc.setFontSize(size);

  if (maxWidth && maxWidth > 0) {
    while (size > minFontSize && doc.getTextWidth(text) > maxWidth) {
      size -= 1;
      doc.setFontSize(size);
    }
  }
  doc.text(text, x, y, { align, maxWidth });
}

/**
 * Header:
 * - Blue band with margins
 * - Left: logo
 * - Title: lifted and width-constrained (dominant)
 * - Right: compact meta stack (smaller font)
 */
function drawHeaderBand(doc, appointment) {
  const pageW = doc.internal.pageSize.getWidth();

  // Layout constants
  const marginX = 14;
  const bandY = 12;
  const bandH = 46;
  const bandW = pageW - marginX * 2;

  const BLUE = [25, 118, 210]; // #1976d2
  const WHITE = [255, 255, 255];

  // 1) Blue band
  doc.setFillColor(...BLUE);
  doc.rect(marginX, bandY, bandW, bandH, "F");

  // 2) Logo (left)
  const logoSize = 30;
  const logoX = marginX + 8;
  const logoY = bandY + (bandH - logoSize) / 2;
  try {
    if (typeof medicoreLogo === "string") {
      doc.addImage(medicoreLogo, "PNG", logoX, logoY, logoSize, logoSize);
    }
  } catch {
    // If asset not inlined, skip quietly
  }

  // 3) Right info block — smaller typography so the title pops
  const infoRightX = marginX + bandW - 10;
  const lineGap = 5;          // tighter vertical rhythm
  let infoY = bandY + 25;

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);         // <<< smaller meta text

  // Use appointment date in header if available; else today's date
  const headerDate = appointment?.date ? appointment.date : formatDateSL();
  doc.text(`Date : ${headerDate}`, infoRightX, infoY, { align: "right" });
  infoY += lineGap;
  doc.text(`E-mail: medicore@gmail.com`, infoRightX, infoY, { align: "right" });
  infoY += lineGap;
  doc.text(`Contact: +94-64356865`, infoRightX, infoY, { align: "right" });
  infoY += lineGap;
  doc.text(`No : 144, Wadduwa, Panadura`, infoRightX, infoY, { align: "right" });

  // 4) Title — dominant, lifted up, width-capped to avoid the right block
  const titleX = logoX + logoSize + 12;
  const titleY = bandY + 21; // a touch higher for clear separation
  const titleRightLimit = infoRightX - 16;
  const titleMaxWidth = Math.max(50, titleRightLimit - titleX);

  doc.setTextColor(...WHITE);
  drawFittedText(doc, "Appointment Confirmation", titleX, titleY, {
    align: "left",
    maxWidth: titleMaxWidth,
    startFontSize: 24, // tries 24 then auto-shrinks if needed
    minFontSize: 16,
    font: ["helvetica", "bold"],
  });

  // Return Y position under the band
  return bandY + bandH + 16;
}

export function generateAppointmentPDF(appointment) {
  const doc = new jsPDF();

  // Header
  const startY = drawHeaderBand(doc, appointment);

  // Reference No (unchanged)
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`Reference No: ${appointment.referenceNo || ""}`, 14, startY);

  // Details table (unchanged logic)
  autoTable(doc, {
    startY: startY + 8,
    head: [["Field", "Details"]],
    body: [
      ["Doctor", appointment.doctorName || appointment.doctorId],
      ["Date", appointment.date],
      ["Time", `${appointment.startTime} - ${appointment.endTime}`],
      ["Patient Name", appointment.patientName],
      ["Phone", appointment.patientPhone],
      ["Email", appointment.patientEmail || "N/A"],
      ["NIC", appointment.patientNIC || "N/A"],
      ["Passport", appointment.patientPassport || "N/A"],
      ["Payment Method", appointment.paymentMethod],
      ["Total Paid", `Rs. ${appointment.priceLkr?.toLocaleString()}`],
      ["Reason", appointment.reason || "N/A"],
    ],
    headStyles: { fillColor: [25, 118, 210] },
    styles: { fontSize: 12, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [25, 118, 210] } },
  });

  doc.save(`Appointment_${appointment.referenceNo || "details"}.pdf`);
}
