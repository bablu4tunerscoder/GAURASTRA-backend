const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");
const { offlineAuthMiddleware } = require("../middleware/auth");

// CREATE
router.post("/create", offlineAuthMiddleware, productCtrl.createProduct);

// READ
router.get("/",offlineAuthMiddleware, productCtrl.getAllProducts);

// GET SINGLE
router.get("/:id", offlineAuthMiddleware, productCtrl.getProductByUniqId);
router.get("/:productId/variant/:variantId",offlineAuthMiddleware, productCtrl.getProductByUniqIdVariantId);

// UPDATE
router.put("/update/:id", offlineAuthMiddleware, productCtrl.updateProduct);

// DELETE
router.delete("/delete/:id",offlineAuthMiddleware , productCtrl.deleteProduct);

module.exports = router;
