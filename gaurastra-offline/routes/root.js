const express = require("express");
const router = express.Router();

const productRoutes = require("./productroutes");
const billingRoutes = require("./billingRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const { uploadOfflineImage } = require("../controllers/imageController");
const {upload} = require("../../Middlewares/uploadMiddleware");

router.use("/products", productRoutes);
router.use("/billing", billingRoutes);
router.use("/admin", adminRoutes);
router.use("/user", userRoutes);


router.post('/upload-image',upload.single("image"),uploadOfflineImage)

module.exports = router;
