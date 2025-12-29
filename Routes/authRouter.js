const express = require("express");
const authController = require("../Controllers/authController");

const localUploader = require("../Middlewares/upload/localUploader");


const router = express.Router();
//Normal SignIn and Login
router.post(
  "/register",
  localUploader("Uploads/profile", "image").single("profileImage"),
  authController.register
);

router.post("/login", authController.login);
router.post("/verify-user", authController.verifyUserEmail);
router.post("/resend-otp", authController.resendUserOTP);

// Google auth
router.post("/google-auth", authController.googleAuth);


router.post("/reset-password-request", authController.forgotPasswordRequest);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
