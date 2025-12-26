const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema(
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
      index: true
    },

    image_url: {
      type: String,
      required: true
    },

    alt_text: {
      type: String
    },

    is_primary: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product_Image", productImageSchema);
