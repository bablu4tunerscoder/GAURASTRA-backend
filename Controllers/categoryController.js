const Category = require("../Models/categoryModel");
const {cleanString} = require('../Utils/helpers');
const { pagination_ } = require("../Utils/pagination_");

// ✅ Create Category
const createCategory = async (req, res) => {
  try {
    let { category_name, banner_url, category_description, image_url, status } = req.body;

    // 🔹 Validation
    if (!category_name) {
      return res.status(400).json({
        status: "0",
        message: "Category name is required",
      });
    }

    if (!image_url) {
      return res.status(400).json({
        status: "0",
        message: "Category image_url is required",
      });
    }

    // 🔹 Clean & normalize name
    const category_clean_name = cleanString(category_name);

    // 🔹 Duplicate check (unique: category_name + clean_name)
    const existingCategory = await Category.findOne({
      $or: [
        { category_name },
        { category_clean_name },
      ],
    });

    if (existingCategory) {
      return res.status(400).json({
        status: "0",
        message: "Category already exists",
      });
    }

    // 🔹 Create category
    const newCategory = await Category.create({
      category_name,
      category_clean_name,
      image_url,
      banner_url,
      category_description,
      status, // default "Active" if not passed
    });

    return res.status(201).json({
      status: "1",
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    console.error("Create Category Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};




// ✅ Get All Categories
const getAllCategories = async (req, res) => {
  try {
    // 🔹 Pagination extract
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // 🔹 Filter (default: only Active)
    const filter = req.query.status
      ? { status: req.query.status }
      : { status: "Active" };

    // 🔹 Parallel execution
    const [categories, totalRecords] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Category.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
      status: "1",
      message: "Categories fetched successfully",

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: categories, // empty array is OK
    });
  } catch (error) {
    console.error("Get Categories Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


// ✅ Get Category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "Category ID is required",
      });
    }

    const category = await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        status: "0",
        message: "Category not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    console.error("Get Category By ID Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


const getCategoryByName = async (req, res) => {
  try {
    const { name } = req.params;


    let  category_ = cleanString(name);

    const category = await Category.findOne({
      category_clean_name: category_,
      status: "Active",
    }).lean();

    if (!category) {
      return res.status(404).json({
        status: "0",
        message: "Category not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


// ✅ Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let { category_name, banner_url, category_description, status, image_url } = req.body;

    // 🔹 Find category
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        status: "0",
        message: "Category not found",
      });
    }

    // 🔹 Update name + clean name (with duplicate check)
    if (category_name) {
      const category_clean_name = cleanString(category_name);

      const existingCategory = await Category.findOne({
        $or: [
          { category_name },
          { category_clean_name },
        ],
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(400).json({
          status: "0",
          message: "Category name already exists",
        });
      }

      category.category_name = category_name;
      category.category_clean_name = category_clean_name;
    }

    // 🔹 Optional fields
    if (category_description !== undefined) {
      category.category_description = category_description;
    }

    if (image_url) {
      category.image_url = image_url;
    }
    if (banner_url) {
      category.banner_url = banner_url;
    }

    if (status && ["Active", "Inactive"].includes(status)) {
      category.status = status;
    }

    await category.save();

    return res.status(200).json({
      status: "1",
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update Category Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

// ✅ Delete Category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "Category ID is required",
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        status: "0",
        message: "Category not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};


module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryByName,
  updateCategory,
  deleteCategory,
};
