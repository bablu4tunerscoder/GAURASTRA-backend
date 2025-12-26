const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true
    },

    sku: {
      type: String,
      index: true
    },

    discount_type: {
      type: String,
      enum: ["percentage", "flat", "bogo"],
      required: true
    },

    value: Number,

    bogo: {
      buy: Number,
      get: Number
    },

    start_date: Date,
    end_date: Date,

    is_active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductDiscount", discountSchema);
