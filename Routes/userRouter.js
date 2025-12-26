const express = require("express");
const userController = require("../Controllers/userController");
const {uploader} = require("../Middlewares/uploadMiddleware");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");

const router = express.Router();
//Normal SignIn and Login
router.post(
  "/allRegister",
  uploader.fields([{ name: "profileImage", maxCount: 1 }]),
  userController.register
);

router.post("/allLogins", userController.login);

// Google auth
router.post("/google-login", userController.googleAuth);

// Route to get all users
router.get("/users", authCheck, permissionCheck('user'), userController.getAllUsers);

// Route to get user by ID
router.get("/users/:user_id", authCheck, userController.getUserById);
router.put(
  "/update/:user_id", authCheck,
  uploader.fields([{ name: "profileImage", maxCount: 1 }]),
  userController.updateUser
);

module.exports = router;
