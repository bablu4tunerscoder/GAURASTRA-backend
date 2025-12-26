const mongoose = require("mongoose");

const shareCodeSchema = new mongoose.Schema(
  {
    shareCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      default: "flat",
    },

    discountValue: {
      type: Number,
      default: 50,
    },

    minCartAmount: {
      type: Number,
      default: 400,
    },

    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    rewardAmount: {
      type: Number,
      default: 50,
    },

    rewardGiven: {
      type: Boolean,
      default: false,
    },

    rewardGivenAt: {
      type: Date,
      default: null,
    },

    isSelfUsed: {
      type: Boolean,
      default: false,
    },

    usedCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Expired"],
      default: "Active",
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShareCode", shareCodeSchema);
