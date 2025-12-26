const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  
  product_name: { type: String, required: true },

  canonicalURL:{
    type: String,
    required: true,
    unique: true,
    index: true
  },

  slug: { type: String, required: true, unique: true },

  product_sku_code:{
    type: String,
    required: true,
    unique: true,
    index: true
  },

  description: String,
  brand: String,

  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
    index: true
  },

  subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCategory",
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active",
    index: true
  },

  featuredSections: [{
    type: String,
    enum: [
      "All Products",
      "New Arrivals",
      "Our Collection",
      "Limited Edition",
    ],
    index: true
  }],

  attributes: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },

  qrCode: String,
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
