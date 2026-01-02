const express = require("express");
const router = express.Router();

const productRoutes = require("./productroutes");
const billingRoutes = require("./billingRoutes");
const returnRoutes = require("./returnRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const downloadRoutes = require("./downloadRoutes");
const { uploadOfflineImage } = require("../controllers/imageController");
const cloudUploader = require("../../Middlewares/upload/cloudUploader");

router.use("/products", productRoutes);
router.use("/billing", billingRoutes);
router.use("/return", returnRoutes);
router.use("/admin", adminRoutes);
router.use("/user", userRoutes);
router.use("/download", downloadRoutes);


router.post('/upload-image',cloudUploader("offline/images", "image").single("image"),uploadOfflineImage)

module.exports = router;
