const express = require("express");
const categoryController = require("../Controllers/categoryController");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");
const cloudUploader = require("../Middlewares/upload/cloudUploader");


const router = express.Router();


router.post(
  "/create",
  authCheck,
  permissionCheck("category"),
  cloudUploader("category", "image").fields([
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  categoryController.createCategory
);

router.put(
  "/update/:id",
  authCheck,
  permissionCheck("category"),
  cloudUploader("category", "image").fields([
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  categoryController.updateCategory
);

router.get("/findAll", categoryController.getAllCategories); // Get All Categories
router.get("/findOne/:id", categoryController.getCategoryById); // Get Category by ID
router.get("/findbyname/:name", categoryController.getCategoryByName); // Get Category by ID

router.delete("/delete/:id", authCheck, permissionCheck('category'), categoryController.deleteCategory); // Delete Category

module.exports = router;
