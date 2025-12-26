const mongoose = require("mongoose");


const userCouponSchema  = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      unique: true, 
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, 
      index: true
    },

    name: String,

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      default: "flat",
    },

    discountValue: {
      type: Number,
      default: 100,
    },

    minCartAmount: {
      type: Number,
      default: 400,
    },

    status: {
      type: String,
      enum: ["Active", "Used", "Expired", "Inactive"],
      default: "Active",
      index: true
    },

    expiresAt: {
     type: Date,
      default: null,
      index: true
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userCouponSchema.index(
  { mobileNumber: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "Active" } }
);

userCouponSchema.index({ code: 1, status: 1 });

module.exports = mongoose.model("UserCoupon", userCouponSchema);