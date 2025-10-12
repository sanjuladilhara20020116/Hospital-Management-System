// backend/controllers/emailController.js
const nodemailer = require('nodemailer');

exports.sendConfirmationEmail = async (req, res) => {
  const { to, appointment } = req.body;
  if (!to || !appointment) return res.status(400).json({ message: 'Missing email or appointment data' });

  // Configure your SMTP transporter (use environment variables in production)
  const transporter = nodemailer.createTransport({
    service: 'gmail',// tells Nodemailer to use Gmail’s 
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',//name of the sending maill
      pass: process.env.EMAIL_PASS || 'vyzl smsi ybtr vuqn',//a Gmail App Password (not your login password)
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
    to,
    subject: 'Appointment Confirmation',
    html: `<h2>Appointment Confirmed</h2>
      <p>Dear ${appointment.patientName || 'Patient'},</p>
      <p>Your appointment with Dr. ${appointment.doctorName || appointment.doctorId} is confirmed for <b>${appointment.date}</b> at <b>${appointment.startTime}</b>.</p>
      <p>Reference No: <b>${appointment.referenceNo}</b></p>
      <p>Thank you for choosing our hospital.</p>
      <hr />
      <small>This is an automated message. Please do not reply.</small>`
  };
  
//transmits the message.
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Confirmation email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
};

// New: Send booking cancellation email
exports.sendCancellationEmail = async (req, res) => {
  const { to, appointment } = req.body;
  if (!to || !appointment) return res.status(400).json({ message: 'Missing email or appointment data' });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'vyzl smsi ybtr vuqn',
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
    to,
    subject: 'Booking Cancellation',
    html: `<h2>Booking Cancelled</h2>
      <p>Dear ${appointment.patientName || 'Patient'},</p>
      <p>We regret to inform you that your appointment with Dr. ${appointment.doctorName || appointment.doctorId} on <b>${appointment.date}</b> at <b>${appointment.startTime}</b> has been cancelled by the doctor.</p>
      <p>Reference No: <b>${appointment.referenceNo}</b></p>
      <p>If you would like to reschedule, please visit our booking portal or contact the clinic.</p>
      <hr />
      <small>This is an automated message. Please do not reply.</small>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Cancellation email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send cancellation email', error: err.message });
  }
};
