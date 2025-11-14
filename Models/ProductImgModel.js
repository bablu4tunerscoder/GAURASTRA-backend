const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const productImageSchema = new mongoose.Schema(
  {
    image_id: { type: String, unique: true, required: true, default: uuidv4 },
    product_id: { type: String, required: true , index:true}, // Reference by product_id
    image_url: { type: String, required: true },
    alt_text: { type: String }, // For accessibility and SEO
    is_primary: { type: Boolean, default: false, index:true }, // Main image flag
  },
  { timestamps: true }
);

const ProductImage = mongoose.model("Product_Image", productImageSchema);
module.exports = ProductImage;
