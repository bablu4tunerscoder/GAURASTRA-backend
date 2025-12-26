const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    variant_attributes: {
      color: String,
      size: String
    },

    currency: { type: String, default: "INR" },

    original_price: { type: Number, required: true },
    discounted_price: { type: Number },
    discount_percent: { type: Number },
    

    is_active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product_Pricing", pricingSchema);
