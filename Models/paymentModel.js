const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentGateway: {
      type: String,
      default: "PhonePe",
      index: true,
    },

    merchantTransactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transactionId: {
      type: String,
      index: true,
      sparse: true,
    },

    paymentMode: {
      type: String,
    },

    paymentStatus: {
      type: String,
      enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED"],
      default: "INITIATED",
      index: true,
    },

    paymentStatusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],

    failureReason: {
      type: String,
    },

    refunds: [
      {
        merchantRefundId: String,
        refundId: String,
        amount: Number,
        status: String,
        timestamp: Date,
      },
    ],

    /* 📦 Raw Gateway Data */
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },

    phonepePaymentUrl: {
      type: String,
    },

    callbacks: {
      success: String,
      failure: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
