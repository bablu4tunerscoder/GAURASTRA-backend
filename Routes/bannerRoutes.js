const express = require("express");
const router = express.Router();
const {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
} = require("../Controllers/bannerController");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");


const cloudUploader = require("../Middlewares/upload/cloudUploader");

// Create
router.post("/create", authCheck, permissionCheck('product'), cloudUploader("banners/images", "image").single("banner"), createBanner);

// Get All
router.get("/all", getAllBanners);

// Update
router.put("/update/:id",authCheck, permissionCheck('product'), cloudUploader("banners/images", "image").single("banner"), updateBanner);

// Delete
router.delete("/delete/:id",authCheck, permissionCheck('product'), deleteBanner);

module.exports = router;
