const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");
const { offlineAuthMiddleware } = require("../middleware/auth");

// workers
router.post("/w/create", offlineAuthMiddleware, productCtrl.createProduct);

router.get("/w",offlineAuthMiddleware, productCtrl.getAllProducts);
router.get("/w/p/:id", offlineAuthMiddleware, productCtrl.getProductByUniqId);
router.get("/w/:productId/variant/:variantId",offlineAuthMiddleware, productCtrl.getProductByUniqIdVariantId);
router.put("/w/update/:id", offlineAuthMiddleware, productCtrl.updateProduct);
router.delete("/w/delete/:id",offlineAuthMiddleware , productCtrl.deleteProduct);
router.put("/update-variant/w/p/:productId/v/:variantId",offlineAuthMiddleware , productCtrl.updateSingleVariant);


//admin
router.post("/create" , productCtrl.createProduct);

router.get("/", productCtrl.getAllProducts);
router.get("/:id", productCtrl.getProductByUniqId);
router.get("/:productId/variant/:variantId", productCtrl.getProductByUniqIdVariantId);
router.put("/update/:id", productCtrl.updateProduct);
router.delete("/delete/:id" , productCtrl.deleteProduct);
router.put("/update-variant/p/:productId/v/:variantId", productCtrl.updateSingleVariant);



module.exports = router;
