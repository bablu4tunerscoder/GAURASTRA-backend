const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        
        sku: {
          type: String,
          required: true,
        },

        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },

        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

cartSchema.index(
  { user_id: 1, "items.product_id": 1, "items.sku": 1 },
  { unique: true }
);

module.exports = mongoose.model("Cart", cartSchema);
