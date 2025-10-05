// src/utils/pdfUtils.js
//pdf eka generate wena code eka
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Register the plugin with jsPDF
jsPDF.API.autoTable = autoTable;

export function generateAppointmentPDF(appointment) {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor("#1976d2");
  doc.text("Appointment Confirmation", 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Reference No: ${appointment.referenceNo || ''}`, 14, 28);

  autoTable(doc, {
    startY: 36,
    head: [["Field", "Details"]],
    body: [
      ["Doctor", appointment.doctorName || appointment.doctorId],
      ["Date", appointment.date],
      ["Time", `${appointment.startTime} - ${appointment.endTime}`],
      ["Patient Name", appointment.patientName],
      ["Phone", appointment.patientPhone],
      ["Email", appointment.patientEmail || 'N/A'],
      ["NIC", appointment.patientNIC || 'N/A'],
      ["Passport", appointment.patientPassport || 'N/A'],
      ["Payment Method", appointment.paymentMethod],
      ["Total Paid", `Rs. ${appointment.priceLkr?.toLocaleString()}`],
      ["Reason", appointment.reason || 'N/A']
    ],
    headStyles: { fillColor: [25, 118, 210] },
    styles: { fontSize: 12, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [25, 118, 210] } }
  });

  doc.save(`Appointment_${appointment.referenceNo || 'details'}.pdf`);
}