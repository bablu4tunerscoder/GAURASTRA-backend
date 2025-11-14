const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const pricingSchema = new mongoose.Schema(
  {
    price_id: { type: String, unique: true, required: true, default: uuidv4 },
    product_id: { type: String, required: true , index:true},
    currency: { type: String, default: "INR" },
    sku: { type: String, required: true, unique: true }, // Unique Stock Unit Identifier

    price_detail: [
      {
        original_price: { type: Number, required: true },
        discounted_price: { type: Number },
        discount_percent: { type: Number, default: 0 }, // e.g., 10% off
        is_active: { type: Boolean, default: true,index:true }, // Active price flag
        variant: { type: String }, // Variant (e.g., "Red, XL")
        created_at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Pricing = mongoose.model("Product_Pricing", pricingSchema);
module.exports = Pricing;
