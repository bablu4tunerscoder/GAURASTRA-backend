const SubCategory = require("../Models/subCategoryModel");
const Category = require("../Models/categoryModel");
const { v4: uuidv4 } = require("uuid");
const {cleanString} = require('../Utils/helpers');
const { pagination_ } = require("../Utils/pagination_");

// ✅ Create SubCategory
// ✅ Create SubCategory with conditional gender for Ethnic Wear
const createSubCategory = async (req, res) => {
  try {
    let {
      category_id,
      Subcategory_name,
      Subcategory_description,
      gender,
    } = req.body;

    // Convert subcategory name to lowercase
    if (Subcategory_name) {
      let cleanSubCate = cleanString(Subcategory_name);
      
      Subcategory_name = cleanSubCate
    }

    // Check if category exists
    const categoryExists = await Category.findOne({ category_id });
    if (!categoryExists) {
      return res
        .status(400)
        .json({ status: "0", message: "Category not found" });
    }

    // Gender required if category is Ethnic Wear
    if (
      categoryExists.category_name.toLowerCase() === "ethnic wear" &&
      !gender
    ) {
      return res.status(400).json({
        status: "0",
        message: "Gender is required for Ethnic Wear subcategories",
      });
    }

    // Check if subcategory already exists
    const existingSubCategory = await SubCategory.findOne({
      Subcategory_name,
      category_id,
      ...(gender && { gender }),
    });

    if (existingSubCategory) {
      return res.status(400).json({
        status: "0",
        message: "SubCategory already exists in this category",
      });
    }

    const newSubCategoryId = uuidv4();
    const newSubCategory = new SubCategory({
      Subcategory_id: newSubCategoryId,
      category_id,
      Subcategory_name,
      Subcategory_description,
      ...(gender && { gender }),
    });

    await newSubCategory.save();

    res.status(201).json({
      status: "1",
      message: "SubCategory created successfully",
      data: newSubCategory,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};


// ✅ Get All SubCategories with Category Data
const getAllSubCategories = async (req, res) => {
  try {
    // Extract pagination
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Fetch paginated subcategories + total count
    const [subcategories, totalRecords] = await Promise.all([
      SubCategory.find()
        .sort({ Subcategory_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      SubCategory.countDocuments(),
    ]);

    // Fetch category details for each subcategory
    const subcategoriesWithCategoryData = await Promise.all(
      subcategories.map(async (subcat) => {
        const category = await Category.findOne({
          category_id: subcat.category_id,
        }).lean();

        return {
          ...subcat,
          category_details: category || null,
        };
      })
    );

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      status: "1",
      message: "SubCategories fetched successfully",

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: subcategoriesWithCategoryData,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};


// ✅ Get SubCategory by ID with Category Data
const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const subcategory = await SubCategory.findOne({
      Subcategory_id: id,
    }).lean();

    if (!subcategory) {
      return res
        .status(404)
        .json({ status: "0", message: "SubCategory not found" });
    }

    // Fetch category data
    const category = await Category.findOne({
      category_id: subcategory.category_id,
    }).lean();
    subcategory.category_details = category || null;

    res.status(200).json({
      status: "1",
      message: "SubCategory fetched successfully",
      data: subcategory,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};

// ✅ Update SubCategory
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      category_id,
      Subcategory_name,
      Subcategory_description,
      status,
      gender, // optional
    } = req.body;

    // Convert Subcategory_name to lowercase if provided
    if (Subcategory_name) {
       let cleanSubCate = cleanString(Subcategory_name);
      Subcategory_name = cleanSubCate
    }

    // Fetch category data
    const category = await Category.findOne({ category_id }).lean();
    if (!category) {
      return res
        .status(400)
        .json({ status: "0", message: "Category not found" });
    }

    // Prepare update object
    const updateFields = {
      category_id,
      Subcategory_name,
      Subcategory_description,
      status,
    };

    // Add gender only if category is 'Ethnic Wear'
    if (category.category_name.toLowerCase() === "ethnic wear") {
      updateFields.gender = gender || "";
    }

    const subcategory = await SubCategory.findOneAndUpdate(
      { Subcategory_id: id },
      updateFields,
      { new: true }
    ).lean();

    if (!subcategory) {
      return res
        .status(404)
        .json({ status: "0", message: "SubCategory not found" });
    }

    subcategory.category_details = category;

    res.status(200).json({
      status: "1",
      message: "SubCategory updated successfully",
      data: subcategory,
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};


// ✅ Delete SubCategory
const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subcategory = await SubCategory.findOneAndDelete({
      Subcategory_id: id,
    });

    console.log('subcategory',subcategory)


    if (!subcategory) {
      return res
        .status(404)
        .json({ status: "0", message: "SubCategory not found" });
    }

    res.status(200).json({
      status: "1",
      message: "SubCategory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ status: "0", message: error.message });
  }
};

// subcategory find by category id
const findSubCategorywithcategoryID = async (req, res) => {
  try {
    const { category_id } = req.params;

    if (!category_id) {
      return res.status(400).json({
        status: "0",
        success: false,
        message: "Category ID is required",
      });
    }

    // Pagination extract
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Fetch subcategories + total count in parallel
    const [subcategories, totalRecords] = await Promise.all([
      SubCategory.find({ category_id })
        .sort({ Subcategory_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      SubCategory.countDocuments({ category_id }),
    ]);

    if (!subcategories.length) {
      return res.status(404).json({
        status: "0",
        success: false,
        message: "No subcategories found for this category ID",
      });
    }

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      status: "1",
      success: true,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: subcategories,
    });
  } catch (error) {
    res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


module.exports = {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  findSubCategorywithcategoryID,
};
