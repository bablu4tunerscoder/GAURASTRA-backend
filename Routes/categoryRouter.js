const express = require("express");
const categoryController = require("../Controllers/categoryController");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");


const router = express.Router();

router.post("/create", authCheck, permissionCheck('category'), categoryController.createCategory); // Create Category
router.get("/findAll", categoryController.getAllCategories); // Get All Categories
router.get("/findOne/:id", categoryController.getCategoryById); // Get Category by ID
router.put("/update/:id", authCheck, permissionCheck('category'), categoryController.updateCategory); // Update Category
router.delete("/delete/:id", authCheck, permissionCheck('category'), categoryController.deleteCategory); // Delete Category

module.exports = router;
