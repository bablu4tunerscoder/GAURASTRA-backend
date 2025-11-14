const express = require("express");
const router = express.Router();
const {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
} = require("../Controllers/bannerController");

const { bannerUpload } = require("../Middlewares/bannerMiddleware");

// Create
router.post("/create", bannerUpload.single("banner"), createBanner);

// Get All
router.get("/all", getAllBanners);

// Update
router.put("/update/:id", bannerUpload.single("banner"), updateBanner);

// Delete
router.delete("/delete/:id", deleteBanner);

module.exports = router;
