const express = require("express");
const router = express.Router();
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");


const {
  getAllUserCoupons,
  getUserCouponById,
  updateUserCoupon,
  deleteUserCoupon,
  removeUserFromCoupon,
} = require("../Controllers/couponControllerUser");


// Routes
router.get("/allCoupons", authCheck, permissionCheck('coupon'), getAllUserCoupons); // Get all coupons
router.get("/oneCoupon/:id", getUserCouponById); // Get one coupon by coupon_id
router.put("/updateCoupon/:id",authCheck, permissionCheck('coupon'), updateUserCoupon); // Update coupon
router.delete("/deleteCoupons/:id",authCheck, permissionCheck('coupon'), deleteUserCoupon); // Delete coupon
router.post("/remove-user-from-coupon", removeUserFromCoupon); // 👈 Add this route





module.exports = router;
