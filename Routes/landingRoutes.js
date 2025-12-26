const express = require("express");
const router = express.Router();
const { landing_image_uploader, convert_to_webp }  = require("../Middlewares/landingImageUploadMiddleware");
const {
  createLandingContent,
  getLandingContent,
  getLandingContentById,
  updateLandingContent,
  deleteLandingContent,
} = require("../Controllers/landingController");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");

router.post("/create", authCheck, permissionCheck('landing'), landing_image_uploader.array("images", 5), convert_to_webp,createLandingContent);
router.get("/", getLandingContent);
router.get("/:id", getLandingContentById);
router.put("/update/:id",authCheck, permissionCheck('landing'), landing_image_uploader.array("images", 5), updateLandingContent);
router.delete("/delete/:id",authCheck, permissionCheck('landing'), deleteLandingContent);

module.exports = router;
