const express = require("express");
const subcategoryController = require("../Controllers/subCategoryController");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");

const router = express.Router();

router.post("/create", authCheck, permissionCheck('category'), subcategoryController.createSubCategory);
router.get("/findAll", subcategoryController.getAllSubCategories);
router.get("/findOne/:id", subcategoryController.getSubCategoryById);
router.put("/update/:id", authCheck, permissionCheck('category'), subcategoryController.updateSubCategory);
router.delete("/delete/:id", authCheck, permissionCheck('category'), subcategoryController.deleteSubCategory);
router.get(
  "/subcategories-by-category/:category_id",
  subcategoryController.findSubCategoryByCategoryId
);
module.exports = router;
