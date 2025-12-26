const SubCategory = require("../Models/subCategoryModel");
const Category = require("../Models/categoryModel");
const {cleanString} = require('../Utils/helpers');
const { pagination_ } = require("../Utils/pagination_");

const createSubCategory = async (req, res) => {
  try {
    let {
      category_id,
      subcategory_name,
      subcategory_description,
      image_url,
      banner_url,
      targetAudience,
      status,
    } = req.body;

    /* ---------------- VALIDATION ---------------- */
    if (!category_id || !subcategory_name || !image_url) {
      return res.status(400).json({
        status: "0",
        message: "category_id, subcategory_name and image_url are required",
      });
    }

    /* ---------------- CLEAN NAME ---------------- */
    const subcategory_clean_name = cleanString(subcategory_name);

    /* ---------------- CHECK CATEGORY ---------------- */
    const categoryExists = await Category.findById(category_id).lean();
    if (!categoryExists) {
      return res.status(404).json({
        status: "0",
        message: "Category not found",
      });
    }

    /* ---------------- DUPLICATE CHECK ---------------- */
    const existingSubCategory = await SubCategory.findOne({
      $or: [
        { subcategory_clean_name },                 // global unique
        { subcategory_name, category_id },          // compound unique
      ],
    }).lean();

    if (existingSubCategory) {
      return res.status(409).json({
        status: "0",
        message: "SubCategory already exists",
      });
    }

    /* ---------------- ENUM VALIDATION ---------------- */
    if (
      targetAudience &&
      !["Mens", "Womens", "Kids"].includes(targetAudience)
    ) {
      return res.status(400).json({
        status: "0",
        message: "Invalid targetAudience value",
      });
    }

    /* ---------------- CREATE SUBCATEGORY ---------------- */
    const newSubCategory = await SubCategory.create({
      category_id,
      subcategory_name,
      subcategory_clean_name,
      image_url,
     banner_url,
      subcategory_description,
      targetAudience,
      status, // default "Active" if not passed
    });

    return res.status(201).json({
      status: "1",
      success: true,
      message: "SubCategory created successfully",
      data: newSubCategory,
    });

  } catch (error) {
    console.error("Create SubCategory Error:", error);

    // 🔹 Handle unique index error
    if (error.code === 11000) {
      return res.status(409).json({
        status: "0",
        message: "Duplicate SubCategory detected",
      });
    }

    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


// ✅ Get All SubCategories with Category Data
const getAllSubCategories = async (req, res) => {
  try {
    // 🔹 Pagination
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // 🔹 Filters
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    else filter.status = "Active";

    if (req.query.category_id) filter.category_id = req.query.category_id;
    if (req.query.targetAudience) filter.targetAudience = req.query.targetAudience;

    // 🔹 Fetch subcategories with category populated
    const [subcategories, totalRecords] = await Promise.all([
      SubCategory.find(filter)
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .populate("category_id", "category_name category_clean_name") 
        .lean(),

      SubCategory.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
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

      data: subcategories,
    });
  } catch (error) {
    console.error("Get SubCategories Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

// ✅ Get SubCategory by ID with Category Data
const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "SubCategory ID is required",
      });
    }

    // 🔹 Fetch subcategory and populate category details
    const subcategory = await SubCategory.findById(id)
      .populate("category_id", "category_name image_url category_clean_name")
      .lean();

    if (!subcategory) {
      return res.status(404).json({
        status: "0",
        message: "SubCategory not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "SubCategory fetched successfully",
      data: subcategory,
    });
  } catch (error) {
    console.error("Get SubCategory By ID Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

// ✅ Update SubCategory
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      category_id,
      subcategory_name,
      subcategory_description,
      status,
      banner_url,
      targetAudience,
      image_url,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "SubCategory ID is required",
      });
    }

    /* ---------------- CHECK EXISTING SUBCATEGORY ---------------- */
    const existingSubCategory = await SubCategory.findById(id).lean();
    if (!existingSubCategory) {
      return res.status(404).json({
        status: "0",
        message: "SubCategory not found",
      });
    }

    /* ---------------- CHECK CATEGORY (IF UPDATED) ---------------- */
    if (category_id) {
      const categoryExists = await Category.findById(category_id).lean();
      if (!categoryExists) {
        return res.status(404).json({
          status: "0",
          message: "Category not found",
        });
      }
    }

    /* ---------------- ENUM VALIDATION ---------------- */
    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        status: "0",
        message: "Invalid status value",
      });
    }

    if (targetAudience && !["Mens", "Womens", "Kids"].includes(targetAudience)) {
      return res.status(400).json({
        status: "0",
        message: "Invalid targetAudience value",
      });
    }

    /* ---------------- PREPARE UPDATE ---------------- */
    const updateFields = {};
    if (subcategory_name) {
      updateFields.subcategory_name = subcategory_name;
      updateFields.subcategory_clean_name = cleanString(subcategory_name);
    }
    if (subcategory_description !== undefined) updateFields.subcategory_description = subcategory_description;
    if (status) updateFields.status = status;
    if (category_id) updateFields.category_id = category_id;
    if (targetAudience) updateFields.targetAudience = targetAudience;
    if (image_url) updateFields.image_url = image_url;
    if (banner_url) updateFields.banner_url = banner_url;

    /* ---------------- DUPLICATE CHECK ---------------- */
    if (updateFields.subcategory_name || updateFields.category_id || updateFields.subcategory_clean_name) {
      const duplicate = await SubCategory.findOne({
        _id: { $ne: id },
        $or: [
          { subcategory_clean_name: updateFields.subcategory_clean_name || existingSubCategory.subcategory_clean_name },
          { subcategory_name: updateFields.subcategory_name || existingSubCategory.subcategory_name, category_id: updateFields.category_id || existingSubCategory.category_id },
        ],
      }).lean();

      if (duplicate) {
        return res.status(409).json({
          status: "0",
          message: "Duplicate SubCategory detected",
        });
      }
    }

    /* ---------------- UPDATE ---------------- */
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    )
      .populate("category_id", "category_name category_clean_name")
      .lean();

    return res.status(200).json({
      status: "1",
      success: true,
      message: "SubCategory updated successfully",
      data: updatedSubCategory,
    });

  } catch (error) {
    console.error("Update SubCategory Error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        status: "0",
        message: "Duplicate SubCategory detected",
      });
    }
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Delete SubCategory
const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "SubCategory ID is required",
      });
    }

    const subcategory = await SubCategory.findByIdAndDelete(id);

    if (!subcategory) {
      return res.status(404).json({
        status: "0",
        message: "SubCategory not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "SubCategory deleted successfully",
      data: subcategory,
    });
  } catch (error) {
    console.error("Delete SubCategory Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


// subcategory find by category id
const findSubCategoryByCategoryId = async (req, res) => {
  try {
    const { category_id } = req.params;

    if (!category_id) {
      return res.status(400).json({
        status: "0",
        message: "Category ID is required",
      });
    }

    // 🔹 Pagination
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // 🔹 Filters
    const filter = { category_id };

    // Optional: only active subcategories
    if (req.query.status) filter.status = req.query.status;
    else filter.status = "Active";

    // 🔹 Fetch subcategories + total count in parallel
    const [subcategories, totalRecords] = await Promise.all([
      SubCategory.find(filter)
        .sort({ createdAt: -1 }) // latest first
        .skip(skip)
        .limit(limit)
        .lean(),
      SubCategory.countDocuments(filter),
    ]);

    if (!subcategories.length) {
      return res.status(404).json({
        status: "0",
        message: "No subcategories found for this category",
      });
    }

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
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
      data: subcategories,
    });
  } catch (error) {
    console.error("Find SubCategories by Category Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
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
  findSubCategoryByCategoryId,
};
