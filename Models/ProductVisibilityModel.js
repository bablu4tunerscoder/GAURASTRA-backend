const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const visibilitySchema = new mongoose.Schema(
  {
    visibility_id: {
      type: String,
      unique: true,
      required: true,
      default: uuidv4,
    },
    product_id: { type: String, required: true, index:true },
    is_visible: { type: Boolean, default: true, index:true },
    schedule: {
      start_time: { type: Date },
      end_time: { type: Date },
    },
  },
  { timestamps: true }
);

const ProductVisibility = mongoose.model(
  "Product_Visibility",
  visibilitySchema
);
module.exports = ProductVisibility;
