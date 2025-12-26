
// mailer.js
const nodemailer = require("nodemailer");

// 1️⃣ Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",      // Gmail SMTP server
  port: 587,                   // 587 for TLS
  secure: false,               // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,  // your email
    pass: process.env.EMAIL_PASS,  // your app password
  },
});


const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Your App Name" <${process.env.EMAIL_USER}>`,
      to,        // recipient
      subject,   // subject line
      text,      // plain text
      html,      // html content
    });

    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = {sendEmail};