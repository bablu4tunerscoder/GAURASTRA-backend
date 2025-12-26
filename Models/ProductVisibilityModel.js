const mongoose = require("mongoose");

const visibilitySchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true
  },

  is_visible: { type: Boolean, default: true, index: true },

  schedule: {
    start_time: Date,
    end_time: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("ProductVisibility", visibilitySchema);
