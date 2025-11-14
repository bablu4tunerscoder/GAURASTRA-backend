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

router.post("/create", upload.array("images", 5), convertToWebp,createLandingContent);
router.get("/", getLandingContent);
router.get("/:id", getLandingContentById);
router.put("/update/:id", upload.array("images", 5), updateLandingContent);
router.delete("/delete/:id", deleteLandingContent);

module.exports = router;
