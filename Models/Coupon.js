const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  usageLimit: {
    type: Number,
    default: 1,
  },
  usersUsed: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
  ],
});

// ✅ Fix: check if already compiled
module.exports =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
