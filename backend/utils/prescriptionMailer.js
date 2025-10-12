// utils/prescriptionMailer.js
const nodemailer = require("nodemailer");

const SKIP =
  String(process.env.SKIP_EMAIL || "false").toLowerCase() === "true";

let transporter;
function getTransporter() {
  if (transporter) return transporter;

  const rejectUnauthorized =
    String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "false").toLowerCase() ===
    "true";

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized },
  });

  return transporter;
}

/** Safe wrapper; honors SKIP_EMAIL and won’t throw out of your route. */
async function sendMail(options) {
  if (SKIP) return { skipped: true };
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const tx = getTransporter();
  return tx.sendMail({ from, ...options });
}

module.exports = { sendMail, SKIP };
