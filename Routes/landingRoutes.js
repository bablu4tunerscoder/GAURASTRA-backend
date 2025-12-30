const express = require("express");
const router = express.Router();

const {
  createLandingContent,
  getLandingContent,
  getLandingContentById,
  updateLandingContent,
  deleteLandingContent,
} = require("../Controllers/landingController");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");
const localUploader = require("../Middlewares/upload/localUploader");

router.post(
  "/create",
  authCheck,
  permissionCheck("landing"),
  localUploader("Uploads/landing").fields([
    { name: "image", maxCount: 5 },
  ]),
  createLandingContent
);
router.get("/all", getLandingContent);

router.get("/one/:landing_id", getLandingContentById);

router.put(
  "/update/:id",
  authCheck,
  permissionCheck("landing"),
  localUploader("Uploads/landing").fields([
    { name: "image", maxCount: 5 },
  ]),
  updateLandingContent
);

router.delete("/delete/:id",authCheck, permissionCheck('landing'), deleteLandingContent);

module.exports = router;
