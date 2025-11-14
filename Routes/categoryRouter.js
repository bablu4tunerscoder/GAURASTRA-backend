const express = require("express");
const categoryController = require("../Controllers/categoryController");

const router = express.Router();

router.post("/create", categoryController.createCategory); // Create Category
router.get("/findAll", categoryController.getAllCategories); // Get All Categories
router.get("/findOne/:id", categoryController.getCategoryById); // Get Category by ID
router.put("/update/:id", categoryController.updateCategory); // Update Category
router.delete("/delete/:id", categoryController.deleteCategory); // Delete Category

module.exports = router;
