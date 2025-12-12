const express = require("express");
const router = express.Router();
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");


const {
 
  suggestCoupons,
  applyCoupon,
} = require("../Controllers/couponControllerMain");



router.post("/suggest",authCheck, suggestCoupons);
router.post("/apply",authCheck, applyCoupon);

module.exports = router;
