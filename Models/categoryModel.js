const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    category_name: {
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
    category_clean_name: {
      type: String,
      required: true,
      index: true,
      unique: true
    },
    category_description: String,

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
