const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP Connection Error:", error.message);
  } else {
    console.log("✅ SMTP Server is ready to take our messages");
  }
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: `"TRINETRA System" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
