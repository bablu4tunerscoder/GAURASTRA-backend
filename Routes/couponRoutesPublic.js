const express = require("express");
const router = express.Router();
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");


const {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  removeUserFromCoupon,
} = require("../Controllers/couponControllerPublic");


// Routes
router.post("/create-coupon", authCheck, permissionCheck('coupon'),  createCoupon); // Create coupon
router.get("/allCoupons", authCheck, permissionCheck('coupon'), getAllCoupons); // Get all coupons
router.get("/oneCoupon/:id", getCouponById); // Get one coupon by coupon_id
router.put("/updateCoupon/:id",authCheck, permissionCheck('coupon'), updateCoupon); // Update coupon
router.delete("/deleteCoupons/:id",authCheck, permissionCheck('coupon'), deleteCoupon); // Delete coupon

router.post("/remove-user-from-coupon", removeUserFromCoupon); // 👈 Add this route


module.exports = router;
