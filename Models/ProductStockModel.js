const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const stockSchema = new mongoose.Schema(
  {
    stock_id: { type: String, unique: true, required: true, default: uuidv4 },
    product_id: { type: String, required: true, index:true },
    size: { type: String, required: true }, // ✅ Size ko alag store karenge
    stock_quantity: { type: Number, required: true }, // ✅ Har size ka stock
    is_available: { type: Boolean, default: true, index:true},
    last_updated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ProductStock = mongoose.model("Product_Stock", stockSchema);
module.exports = ProductStock;
