const express = require("express");
const userController = require("../Controllers/userController");

const { authCheck, permissionCheck } = require("../utilities/JWTAuth");
const localUploader = require("../Middlewares/upload/localUploader");

const router = express.Router();

router.get("/all", authCheck, permissionCheck('user'), userController.getAllUsers);

router.get("/user-profile", authCheck, userController.getProfile);
router.put(
  "/user-update", authCheck,
  localUploader("Uploads/profile", "image").single("profileImage"),
  userController.updateUserProfile
);


router.get("/:user_id", authCheck,permissionCheck('user'), userController.getUserById);
router.put(
  "/update/:user_id", authCheck,
  localUploader("Uploads/profile", "image").single("profileImage"),
  userController.adminUpdateUser
);







module.exports = router;
