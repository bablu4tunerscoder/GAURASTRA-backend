const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    products: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        sku: {
          type: String, // optional
          default: null
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

wishlistSchema.index(
  { user_id: 1, "products.product_id": 1 },
  { unique: true }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);

