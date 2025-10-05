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
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',//a Gmail App Password (not your login password)
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
