const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "REVIEW_APPROVED",
        "REVIEW_REJECTED",

        "ORDER_PLACED",
        "ORDER_CONFIRMED",
        "ORDER_PACKED",
        "ORDER_SHIPPED",
        "ORDER_OUT_FOR_DELIVERY",
        "ORDER_DELIVERED",
        "ORDER_CANCELLED",
        "ORDER_RETURN_REQUESTED",
        "ORDER_RETURN_APPROVED",
        "ORDER_RETURN_REJECTED",
        "ORDER_REFUNDED",

        "PAYMENT_SUCCESS",
        "PAYMENT_FAILED",
        "REFUND_INITIATED",
        "REFUND_SUCCESS",

        "PRICE_DROP",
        "PRICE_INCREASE",
        "BACK_IN_STOCK",
        "OUT_OF_STOCK",
        "LOW_STOCK",

        "COUPON_ASSIGNED",
        "COUPON_EXPIRING",
        "OFFER_LIVE",
        "OFFER_EXPIRED",

        "ACCOUNT_CREATED",
        "PROFILE_UPDATED",
        "PASSWORD_CHANGED",

        "ANNOUNCEMENT",
        "SYSTEM_ALERT",
        "GENERAL",
      ],
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    image: { type: String, default: null },

    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ user_id: 1, type: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
