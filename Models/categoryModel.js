const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const categorySchema = new mongoose.Schema(
  {
    category_id: {
      type: String,
      unique: true,
      required: true,
      default: uuidv4,
    },
    category_name: {
      type: String,
      index: true,
      required: true,
    },
    category_description: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);



module.exports = mongoose.model("Product_Category", categorySchema);
