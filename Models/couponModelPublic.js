const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const couponSchema = new mongoose.Schema(
  {
    coupon_id: {
      type: String,
      unique: true,
      default: uuidv4,
    },

    code: {
      type: String,
      required: true,
      unique: true, 
      uppercase: true,
      trim: true,
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
      default: null, // ✅ null = never expire
      index: true,
    },

    /* ---------------- Usage Control ---------------- */
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
      default: 1, // ✅ each user max 1 time
    },

    /* ---------------- Tracking ---------------- */
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
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

    /* ---------------- Product Restriction ---------------- */
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
      },
    ],

    backendCreatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* ✅ Indexes */
couponSchema.index({ code: 1 });
couponSchema.index({ status: 1, expiresAt: 1 });

module.exports =
  mongoose.models.AdminCoupon ||
  mongoose.model("PublicCoupon", couponSchema);
