const express = require("express");
const router = express.Router();

const productRoutes = require("./productroutes");
const billingRoutes = require("./billingRoutes");
const adminRoutes = require("./adminRoutes");

router.use("/products", productRoutes);
router.use("/billing", billingRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
