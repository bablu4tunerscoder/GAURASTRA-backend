const express = require("express");
const router = express.Router();

const productRoutes = require("./productroutes");
const billingRoutes = require("./billingRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");

router.use("/products", productRoutes);
router.use("/billing", billingRoutes);
router.use("/admin", adminRoutes);
router.use("/user", userRoutes);

module.exports = router;
