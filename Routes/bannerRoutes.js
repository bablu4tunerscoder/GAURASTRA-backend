const express = require("express");
const router = express.Router();
const {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
} = require("../Controllers/bannerController");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");

const { bannerUpload } = require("../Middlewares/bannerMiddleware");

// Create
router.post("/create", authCheck, permissionCheck('product'), bannerUpload.single("banner"), createBanner);

// Get All
router.get("/all", getAllBanners);

// Update
router.put("/update/:id",authCheck, permissionCheck('product'), bannerUpload.single("banner"), updateBanner);

// Delete
router.delete("/delete/:id",authCheck, permissionCheck('product'), deleteBanner);

module.exports = router;
