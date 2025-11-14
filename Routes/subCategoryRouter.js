const express = require("express");
const subcategoryController = require("../Controllers/subCategoryController");

const router = express.Router();

router.post("/create", subcategoryController.createSubCategory);
router.get("/findAll", subcategoryController.getAllSubCategories);
router.get("/findOne/:id", subcategoryController.getSubCategoryById);
router.put("/update/:id", subcategoryController.updateSubCategory);
router.delete("/delete/:id", subcategoryController.deleteSubCategory);
router.get(
  "/subcategories-by-category/:category_id",
  subcategoryController.findSubCategorywithcategoryID
);
module.exports = router;
