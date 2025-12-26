const express = require("express");
const userController = require("../Controllers/userController");
const {uploader} = require("../Middlewares/uploadMiddleware");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");

const router = express.Router();
//Normal SignIn and Login
router.post(
  "/register",
  uploader.fields([{ name: "profileImage", maxCount: 1 }]),
  userController.register
);

router.post("/login", userController.login);
router.post("/verify-user", userController.verifyUserEmail);
router.post("/resend-otp", userController.resendUserOTP);

// Google auth
router.post("/google-auth", userController.googleAuth);

// Route to get all users
router.get("/users", authCheck, permissionCheck('user'), userController.getAllUsers);

// Route to get user by ID
router.get("/users/:user_id", authCheck, userController.getUserById);


router.post("/reset-password-request/", userController.forgotPasswordRequest);
router.post("/reset-password", userController.resetPassword);

router.put(
  "/update/:user_id", authCheck,
  uploader.fields([{ name: "profileImage", maxCount: 1 }]),
  userController.updateUser
);

module.exports = router;
