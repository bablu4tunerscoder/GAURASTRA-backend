const express = require("express");
const router = express.Router();

const {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  suggestCoupons,
  removeUserFromCoupon,
} = require("../Controllers/couponController");

// Routes
router.post("/create-coupon", createCoupon); // Create coupon
router.get("/allCoupons", getAllCoupons); // Get all coupons
router.get("/oneCoupon/:id", getCouponById); // Get one coupon by coupon_id
router.put("/updateCoupon/:id", updateCoupon); // Update coupon
router.delete("/deleteCoupons/:id", deleteCoupon); // Delete coupon
router.post("/apply", applyCoupon);
router.post("/suggest", suggestCoupons);
router.post("/remove-user-from-coupon", removeUserFromCoupon); // 👈 Add this route

module.exports = router;
