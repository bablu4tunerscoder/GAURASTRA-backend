const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    /* 🔗 Order Reference */
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },

    /* 💰 Amount Info */
    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "INR"
    },

    /* 💳 Gateway Info */
    paymentGateway: {
      type: String,
      default: "PhonePe",
      index: true
    },

    merchantTransactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    gatewayTransactionId: {
      type: String,
      index: true
    },

    paymentMode: {
      type: String
    },

    paymentStatus: {
      type: String,
      enum: ["Initiated", "Pending", "Success", "Failed"],
      default: "Initiated",
      index: true
    },

    failureReason: {
      type: String
    },
    refunds:[{
      merchantRefundId: String,
      refundId: String,
      amount: Number,
      status: String,
      timestamp: Date
    }],

    /* 📦 Raw Gateway Data */
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },

    phonepePaymentUrl: {
      type: String
    },

    callbacks: {
      success: String,
      failure: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
