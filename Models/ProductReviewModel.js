const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const reviewSchema = new mongoose.Schema(
  {
    review_id: { type: String, unique: true, required: true, default: uuidv4 },
    product_id: { type: String, required: true, index:true },
    user_id: { type: String, required: true }, // Reference user by ID
    rating: { type: Number, min: 1, max: 5, required: true, index:true },
    comment: { type: String },
    is_verified: { type: Boolean, default: false , index:true}, // Verified purchase flag
  },
  { timestamps: true }
);

const ProductReview = mongoose.model("Product_Review", reviewSchema);
module.exports = ProductReview;
