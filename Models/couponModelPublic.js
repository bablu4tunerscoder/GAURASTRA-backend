const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
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
      required: true,
    },

    minCartAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Expired", "Inactive"],
      default: "Active",
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null, // null = never expire
      index: true,
    },

    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },

    usageCount: {
      type: Number,
      default: 0,
    },

    perUserLimit: {
      type: Number,
      default: 1,
    },

    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          index: true
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
      },
    ],

    allowedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        index: true,
      },
    ],

    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        index: true,
      },
    ],
  },
  { timestamps: true }
);

/* ✅ Compound Indexes */
couponSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("PublicCoupon", couponSchema);
