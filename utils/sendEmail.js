
const nodemailer = require("nodemailer");

// =====================================
// EMAIL TRANSPORTER
// =====================================

// Configure Gmail SMTP connection
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// =====================================
// SEND EMAIL FUNCTION
// =====================================

const sendEmail = async (to, subject, html) => {

  // Send email using Gmail
  const info = await transporter.sendMail({
    from: `"EventSphere Management" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });

  return info;
};


// Export email function
module.exports = sendEmail;
