const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const productSchema = new mongoose.Schema(
  {
    product_id: { type: String, unique: true, required: true, default: uuidv4 },
    productUniqueId: { type: String, unique: true, required: true },
    product_name: { type: String, required: true },
    description: { type: String },
    brand: { type: String },
    category_id: { type: String, required: true, index:true },
    Subcategory_id: { type: String, required: true, index:true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" , index:true},
    featuredSection: {
      type: String,
      enum: [
        "All Products",
        "New Arrivals",
        "Our Collection",
        "Limited Edition",
      ],
      default: "All Products",
    },

    // ✅ Dynamic Attributes (Size, Color, etc.)
    attributes: { type: mongoose.Schema.Types.Mixed, required: true },

    seo: {
      slug: { type: String, required: true, unique: true },
      metaTitle: { type: String },
      metaDescription: { type: String },
      keywords: [String],
      canonicalURL: { type: String },
    },
    qrCode: { type: String }, // ✅ Add this line
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
      