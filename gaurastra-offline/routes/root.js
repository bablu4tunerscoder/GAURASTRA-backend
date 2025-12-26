const express = require("express");
const router = express.Router();

const productRoutes = require("./productroutes");
const billingRoutes = require("./billingRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const downloadRoutes = require("./downloadRoutes");
const { uploadOfflineImage } = require("../controllers/imageController");
const {uploader} = require("../../Middlewares/uploadMiddleware");

router.use("/products", productRoutes);
router.use("/billing", billingRoutes);
router.use("/admin", adminRoutes);
router.use("/user", userRoutes);
router.use("/download", downloadRoutes);


router.post('/upload-image',uploader.single("image"),uploadOfflineImage)

module.exports = router;
