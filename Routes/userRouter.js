const express = require("express");
const userController = require("../Controllers/userController");
const upload = require("../Middlewares/uploadMiddleware");

const router = express.Router();
//Normal SignIn and Login
router.post(
  "/allRegister",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  userController.registerAll
);
router.post("/allLogins", userController.loginAll);

// Google SignIn and Login
router.post(
  "/google-signin",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  userController.googleRegister
);
router.post("/google-login", userController.googleLogin);

// Route to get all users
router.get("/users", userController.getAllUsers);

// Route to get user by ID
router.get("/users/:user_id", userController.getUserById);
router.put(
  "/update/:user_id",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  userController.updateUser
);

module.exports = router;
