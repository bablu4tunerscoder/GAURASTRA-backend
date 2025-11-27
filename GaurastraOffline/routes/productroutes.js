const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");

// CREATE
router.post("/create", productCtrl.createProduct);

// READ
router.get("/", productCtrl.getAllProducts);

// GET SINGLE
router.get("/:id", productCtrl.getProductByUniqId);
router.get("/:productId/variant/:variantId", productCtrl.getProductByUniqIdVariantId);

// UPDATE
router.put("/update/:id", productCtrl.updateProduct);

// DELETE
router.delete("/delete/:id", productCtrl.deleteProduct);

module.exports = router;
