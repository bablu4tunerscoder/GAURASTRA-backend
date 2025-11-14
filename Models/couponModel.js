const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const couponSchema = new mongoose.Schema(
  {
    coupon_id: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4, // unique ID like product_id
    },

    code: {
      type: String,
      required: true,
      unique: true, // NAME100 for frontend; uniqueness enforced in DB
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
    },

    applicableProducts: [
      {
        type: String, // product_id (String only, no ref)
        index: true,
      },
    ],

    minCartAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },

    expiresAt: {
      type: Date,
    },

    usageLimit: {
      type: Number,
    },

    usedCount: {
      type: Number,
      default: 0,
    },

    usedBy: [
      {
        user_id: {
          type: String, // user_id as plain string
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // --- Backend-only timestamp for internal tracking ---
    backendCreatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // createdAt & updatedAt for admin and API use
);

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
