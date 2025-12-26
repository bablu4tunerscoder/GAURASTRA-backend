const { sendEmail } = require("../Config/mailer");


const userVerifyEmail = async ( email, name, otp ) => {
  try {
       const message = `
      <p>Hello ${name},</p>
      <p>Your verification OTP is: <b>${otp}</b></p>
      <p>It will expire in 10 minutes.</p>
    `;

    await sendEmail({
      to: email,
      subject: "User Verification OTP",
      text: message,
      html: '',
    });
  } catch (error) {
    console.error("Error sending email:", error);
    
  }
};

module.exports = {userVerifyEmail};