// models/subCategoryModel.js

const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const SubcategorySchema = new mongoose.Schema(
  {
    Subcategory_id: {
      type: String,
      unique: true,
      required: true,
      default: uuidv4,
    },
    Subcategory_name: {
      type: String,
      required: true,
      index:true
    },
    Subcategory_description: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index:true },
    category_id: { type: String, required: true, index:true },

    // ✅ Add gender field for Ethnic Wear subcategories only
    gender: {
      type: String,
      enum: ["Mens", "Womens", "Kids"],
      required: false,
      index:true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product_SubCategory", SubcategorySchema);
