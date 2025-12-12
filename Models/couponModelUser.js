const mongoose = require("mongoose");
 const { v4: uuidv4 } = require("uuid");

const couponSchema = new mongoose.Schema(
  {
    coupon_id: {
      type: String,
      unique: true,
      default: uuidv4,
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true, 
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, 
    },

    name: String,

    code: {
      type: String,
      required: true,
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
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    usedAt: {
      type: Date,
      default: null,
    },

    backendCreatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);


const Coupon = mongoose.model("UserCoupon", couponSchema); module.exports = Coupon;