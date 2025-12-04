const express = require("express");
const router = express.Router();
const { upload, convertToWebp }  = require("../Middlewares/landingMiddleware");
const {
  createLandingContent,
  getLandingContent,
  getLandingContentById,
  updateLandingContent,
  deleteLandingContent,
} = require("../Controllers/landingController");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");

router.post("/create", authCheck, permissionCheck('landing'), upload.array("images", 5), convertToWebp,createLandingContent);
router.get("/", getLandingContent);
router.get("/:id", getLandingContentById);
router.put("/update/:id",authCheck, permissionCheck('landing'), upload.array("images", 5), updateLandingContent);
router.delete("/delete/:id",authCheck, permissionCheck('landing'), deleteLandingContent);

module.exports = router;
