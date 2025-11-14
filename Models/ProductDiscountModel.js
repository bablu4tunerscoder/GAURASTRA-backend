const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const discountSchema = new mongoose.Schema(
  {
    discount_id: {
      type: String,
      unique: true,
      required: true,
      default: uuidv4,
    },
    product_id: { type: String, required: true , index: true},
    discount_type: {
      type: String,
      enum: ["percentage", "flat", "bogo"], // Buy One Get One
      required: true,
    },
    value: { type: Number, required: true },
    start_date: { type: Date },
    end_date: { type: Date },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Discount = mongoose.model("Product_Discount", discountSchema);
module.exports = Discount;
