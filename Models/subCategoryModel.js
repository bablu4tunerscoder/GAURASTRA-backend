const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    subcategory_name: {
      type: String,
      required: true,
      index: true
    },
    subcategory_clean_name: {
      type: String,
      required: true,
      index: true,
      unique: true
    },
    image_url: {
      type: String,
      required: true
    },
    banner_url: String,
    subcategory_description: String,

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },

    targetAudience: {
      type: String,
      enum: ["Mens", "Womens", "Kids"],
      index: true
    }
  },
  { timestamps: true }
);

subCategorySchema.index(
  { subcategory_name: 1, category_id: 1 },
  { unique: true }
);

module.exports = mongoose.model("SubCategory", subCategorySchema);
