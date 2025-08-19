const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// optional startup verification
transporter.verify()
  .then(() => console.log('✅ SMTP ready'))
  .catch(err => console.error('❌ SMTP config error:', err.message));

async function sendMail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to, subject, html,
  });
  return info;
}

function buildCompletedEmail({ patientName, referenceNo, testType, completedAt, link }) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
    <h2>Your lab report is ready</h2>
    <p>Dear ${patientName || 'Patient'},</p>
    <p>Your <b>${testType}</b> report was completed on
    <b>${new Date(completedAt).toLocaleString()}</b>.</p>
    <p><b>Reference No:</b> ${referenceNo}</p>
    <p><a href="${link}" style="background:#1366D6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
      Open Report Download
    </a></p>
    <p style="color:#64748b;font-size:12px">If the button doesn’t work, copy this link: ${link}</p>
  </div>`;
}

module.exports = { sendMail, buildCompletedEmail };
