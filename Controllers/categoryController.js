const Category = require("../Models/categoryModel");
const { v4: uuidv4 } = require("uuid");

// ✅ Create Category
const createCategory = async (req, res) => {
  try {
    const { category_name, category_description } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ category_name });
    if (existingCategory) {
      return res
        .status(400)
        .json({ status: "0", message: "Category already exists" });
    }

    const newCategoryId = uuidv4();
    const newCategory = new Category({
      category_id: newCategoryId,
      category_name,
      category_description,
    });

    await newCategory.save();

    res.status(201).json({
      status: "1",
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};

// ✅ Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({
      status: "1",
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};

// ✅ Get Category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findOne({ category_id: id }).lean();

    if (!category) {
      return res
        .status(404)
        .json({ status: "0", message: "Category not found" });
    }

    res.status(200).json({
      status: "1",
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};

// ✅ Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, category_description, status } = req.body;
    const category = await Category.findOneAndUpdate(
      { category_id: id },
      { category_name, category_description, status },
      { new: true }
    );

    if (!category) {
      return res
        .status(404)
        .json({ status: "0", message: "Category not found" });
    }

    res.status(200).json({
      status: "1",
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};

// ✅ Delete Category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findOneAndDelete({ category_id: id });

    if (!category) {
      return res
        .status(404)
        .json({ status: "0", message: "Category not found" });
    }

    res.status(200).json({
      status: "1",
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
