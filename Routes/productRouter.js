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
const cloudUploader = require("../Middlewares/upload/cloudUploader");


// product crud routes
router.post("/addBulk-products", authCheck, permissionCheck('product'), ProductController.bulkUploadProducts);
router.get("/ProductDetail",  ProductController.getAllProductsWithDetails);
router.get("/product/:product_id", ProductController.getOneProductWithDetails);
router.put("/update-products/:product_id", authCheck, permissionCheck('product'), ProductController.updateSingleProduct);
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
  "/by-slug/:slug",
  ProductController.getOneProductWithDetailsBySlug
);

router.get(
  "/suggestions/:canonicalURL",
  ProductController.getProductSuggestions
);

router.get(
  "/by-unique/:productSkuCode",
  ProductController.getDataWithSkuCode
);

// product filter routes
router.post("/product-page-filter", ProductController.filterProductDetails);
router.get("/product-page-sidebar", ProductController.productPageSideBars);



// Discount Crud oprations routes
router.post("/create-discount", DiscountController.createDiscount);
router.get(
  "/getDiscount-ProductId/:product_id",
  DiscountController.findAllWithProductId
);
router.get("/getAllDiscounts",  DiscountController.findAllWithDiscounts);




router.post("/Productmedia", router.post(
  "/Productmedia",
  authCheck,
  cloudUploader("products/media").fields([
    { name: "media", maxCount: 20 },
  ]),
  uploadProductMedia
));

router.get("/getAllImagesIDS/:product_id", productIdByImages);
router.delete("/delete-image/:image_id",authCheck, imagesDelete);

module.exports = router;
