const express = require("express");
const router = express.Router();
const {
  uploadProductMedia,
  productIdByImages,
  imagesDelete,
} = require("../Controllers/productImgUploadController");
const DiscountController = require("../Controllers/productDiscountController");
const ProductController = require("../Controllers/productController");

const { authCheck, permissionCheck } = require("../Utils/JWTAuth");


// product crud routes
router.post("/addBulk-products", authCheck, permissionCheck('product'), ProductController.bulkUploadProducts);
router.get("/ProductDetail",  ProductController.getAllProductsWithDetails);
router.get("/product/:product_id", ProductController.getOneProductWithDetails);
router.put("/update-products/:product_id", authCheck, permissionCheck('product'), ProductController.updateProducts);
router.delete(
  "/delete-products/:product_id", authCheck, permissionCheck('product'),
  ProductController.deleteProductsByID
);

router.put(
  "/update-canonical/:product_id",
  authCheck, permissionCheck('product'),
  ProductController.updateCanonicalURL
);

router.get(
  "/by-canonical/:canonicalURL",
  ProductController.getDataWithCanonicalurls
);

router.get(
  "/suggestions/:canonicalURL",
  ProductController.getProductSuggestions
);

router.get(
  "/by-unique/:productUniqueId",
  ProductController.getDataWithUniqueId
);

// product filter routes
router.post("/filter-Products", ProductController.filterProductDetails);
router.get("/product-sidebar", ProductController.sideBarsProduct);

// Discount Crud oprations routes
router.post("/create-discount", DiscountController.createDiscount);
router.get(
  "/getDiscount-ProductId/:product_id",
  DiscountController.findAllWithProductId
);
router.get("/getAllDiscounts",  DiscountController.findAllWithDiscounts);

// images modules routes
const { upload } = require("../Middlewares/productuploadMiddleware");
router.post("/Productmedia", upload.array("media", 20),authCheck, uploadProductMedia);
router.get("/getAllImagesIDS/:product_id", productIdByImages);
router.delete("/delete-image/:image_id",authCheck, imagesDelete);

module.exports = router;
