const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
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

    attributes: {
      color: String,
      size: String
    },

    stock_quantity: {
      type: Number,
      required: true
    },

    is_available: {
      type: Boolean,
      default: true,
      index: true
    },

    last_updated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductStock", stockSchema);
